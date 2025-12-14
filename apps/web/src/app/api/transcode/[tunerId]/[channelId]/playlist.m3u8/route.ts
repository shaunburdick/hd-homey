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
import { generateViewerFingerprint } from '@/lib/viewer-fingerprint';
import Logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ tunerId: string; channelId: string }> }
) {
    try {
        const { tunerId, channelId } = await context.params;
        const token = req.nextUrl.searchParams.get('token');

        if (token === null || token === '') {
            Logger.warn({ tunerId, channelId }, 'Playlist request missing token');
            return new Response('Missing token', { status: 401 });
        }

        // Verify token
        const tokenData = await verifyStreamToken(token);
        if (tokenData === null) {
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

        if (channel?.tuners === undefined) {
            return new Response('Channel not found', { status: 404 });
        }

        // Check if tuner is active
        if (!channel.tuners.is_active) {
            Logger.warn({
                tunerId,
                channelId,
                tunerName: channel.tuners.name,
            }, 'Transcode playlist request for inactive tuner');
            return new Response('Tuner is not active', { status: 403 });
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
            settings,
            {
                videoCodec: channel.videoCodec,
                audioCodec: channel.audioCodec,
            }
        );

        // Generate viewer fingerprint from IP + User-Agent
        // This creates a stable identifier that persists across playlist polls,
        // allowing accurate viewer counting without cookies or client-side code.
        // Works with browsers, mobile apps, and media players.
        const viewerId = generateViewerFingerprint(req);

        Logger.debug({ sessionId: session.sessionId, viewerId }, 'Serving playlist with viewer fingerprint');

        // Serve the playlist with token and viewer_id appended to segment URLs
        // Viewer tracking happens in the segment endpoint
        const response = await servePlaylist(session.outputDir, token, viewerId);

        return response;
    } catch (error) {
        Logger.error({ error }, 'Error serving HLS playlist');
        return new Response('Internal server error', { status: 500 });
    }
}
