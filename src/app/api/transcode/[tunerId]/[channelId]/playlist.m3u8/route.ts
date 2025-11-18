/**
 * HLS Playlist endpoint - serves the m3u8 playlist for a transcoded channel
 */

import type { NextRequest } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/lib/database/db';
import { channels } from '@/lib/database/schema';
import { verifyStreamToken } from '@/lib/stream-token';
import { getTranscodingSettings } from '@/lib/settings';
import { getSessionManager } from '@/lib/transcoding/session-manager';
import { servePlaylist } from '@/lib/transcoding/hls-server';
import Logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ tunerId: string; channelId: string }> }
) {
    try {
        const { tunerId, channelId } = await context.params;
        const token = req.nextUrl.searchParams.get('token');

        if (!token) {
            Logger.warn({ tunerId, channelId }, 'Playlist request missing token');
            return new Response('Missing token', { status: 401 });
        }

        // Verify token
        const tokenData = await verifyStreamToken(token);
        if (!tokenData) {
            Logger.warn({ tunerId, channelId }, 'Invalid or expired stream token');
            return new Response('Invalid or expired token', { status: 403 });
        }

        // Verify token matches requested resource
        if (tokenData.tunerId !== parseInt(tunerId, 10) ||
            tokenData.channelId !== parseInt(channelId, 10)) {
            Logger.warn({
                requested: { tunerId, channelId },
                token: tokenData,
            }, 'Token resource mismatch');
            return new Response('Token does not match resource', { status: 403 });
        }

        // Get channel from database
        const db = await getDb();
        const channel = await db.query.channels.findFirst({
            where: and(
                eq(channels.id, tokenData.channelId),
                eq(channels.fk_tuner, tokenData.tunerId),
                isNull(channels.deleted_at)
            ),
            with: {
                tuners: true,
            },
        });

        if (!channel || !channel.tuners) {
            return new Response('Channel not found', { status: 404 });
        }

        // Check if transcoding is enabled
        const settings = await getTranscodingSettings();
        if (!settings.enabled) {
            return new Response('Transcoding not enabled', { status: 503 });
        }

        // Get or create transcoding session
        const manager = getSessionManager();
        // Use the channel's URL field which includes the complete URL with port
        const sourceUrl = channel.url;

        const session = await manager.getOrCreateSession(
            tokenData.tunerId,
            tokenData.channelId,
            channel.guideName,
            sourceUrl,
            settings
        );

        // Note: We don't track viewer count for HLS since it's stateless.
        // The playlist is polled repeatedly by the player, which would
        // artificially inflate the count. Session cleanup is based on
        // lastAccessTime instead, updated by segment requests.

        // Serve the playlist with token appended to segment URLs
        const response = await servePlaylist(session.outputDir, token);

        return response;
    } catch (error) {
        Logger.error({ error }, 'Error serving HLS playlist');
        return new Response('Internal server error', { status: 500 });
    }
}
