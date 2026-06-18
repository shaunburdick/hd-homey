/**
 * HLS Playlist endpoint - serves the m3u8 playlist for a transcoded channel
 */

import type { NextRequest } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { getDb } from '@/lib/database/db';
import { channels } from '@/lib/database/schema';
import { verifyStreamToken } from '@/lib/stream-token';
import type { StreamTokenData } from '@/lib/stream-token';
import { getTranscodingSettings } from '@/lib/settings';
import { getSessionManager } from '@/lib/transcoding/session-manager';
import { servePlaylist } from '@/lib/transcoding/hls-server';
import { generateViewerFingerprint } from '@/lib/viewer-fingerprint';
import Logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** Radix for parsing integer route parameters */
const DECIMAL_RADIX = 10;

interface PlaylistParams {
    tunerId: string;
    channelId: string;
}

interface TokenVerificationResult {
    tokenData: StreamTokenData;
    error?: never;
}

interface TokenVerificationError {
    tokenData?: never;
    error: Response;
}

interface SessionResult {
    session: Awaited<ReturnType<ReturnType<typeof getSessionManager>['getOrCreateSession']>>;
    error?: never;
}

interface SessionError {
    session?: never;
    error: Response;
}

interface VerifyTokenOptions {
    token: string;
    tunerId: string;
    channelId: string;
}

interface SessionOptions {
    tokenData: StreamTokenData;
    tunerId: string;
    channelId: string;
}

/**
 * Verify the stream token exists and matches the requested resource.
 * Returns the token data or a Response error.
 */
async function verifyAndMatchToken(
    { token, tunerId, channelId }: VerifyTokenOptions
): Promise<TokenVerificationResult | TokenVerificationError> {
    const tokenData = await verifyStreamToken(token);
    if (tokenData === null) {
        Logger.warn({ tunerId, channelId }, 'Invalid or expired stream token');
        return { error: new Response('Invalid or expired token', { status: 403 }) };
    }

    const tunerIdInt = parseInt(tunerId, DECIMAL_RADIX);
    const channelIdInt = parseInt(channelId, DECIMAL_RADIX);
    if (tokenData.tunerId !== tunerIdInt || tokenData.channelId !== channelIdInt) {
        Logger.warn(
            { requested: { tunerId, channelId }, token: tokenData },
            'Token resource mismatch'
        );
        return { error: new Response('Token does not match resource', { status: 403 }) };
    }

    return { tokenData };
}

/**
 * Load channel with its tuner from the database.
 */
async function loadChannelForPlayback(tunerId: number, channelId: number) {
    const db = await getDb();
    return await db.query.channels.findFirst({
        where: and(
            eq(channels.id, channelId),
            eq(channels.fk_tuner, tunerId),
            isNull(channels.deleted_at)
        ),
        with: { tuners: true },
    });
}

/**
 * Get or create a transcoding session for the given channel.
 * Returns the session or a Response error if preconditions fail.
 */
async function getOrCreatePlaylistSession(
    { tokenData, tunerId, channelId }: SessionOptions
): Promise<SessionResult | SessionError> {
    const channel = await loadChannelForPlayback(tokenData.tunerId, tokenData.channelId);

    if (channel?.tuners === undefined) {
        return { error: new Response('Channel not found', { status: 404 }) };
    }

    if (!channel.tuners.is_active) {
        Logger.warn(
            { tunerId, channelId, tunerName: channel.tuners.name },
            'Transcode playlist request for inactive tuner'
        );
        return { error: new Response('Tuner is not active', { status: 403 }) };
    }

    const settings = await getTranscodingSettings();
    if (!settings.enabled) {
        return { error: new Response('Transcoding not enabled', { status: 503 }) };
    }

    const manager = getSessionManager();
    const session = await manager.getOrCreateSession({
        tunerId: tokenData.tunerId,
        channelId: tokenData.channelId,
        channelName: channel.guideName,
        sourceUrl: channel.url,
        settings,
        codecs: { videoCodec: channel.videoCodec, audioCodec: channel.audioCodec },
    });

    return { session };
}

export async function GET(
    req: NextRequest,
    context: { params: Promise<PlaylistParams> }
) {
    try {
        const { tunerId, channelId } = await context.params;
        const token = req.nextUrl.searchParams.get('token');

        if (token === null || token === '') {
            Logger.warn({ tunerId, channelId }, 'Playlist request missing token');
            return new Response('Missing token', { status: 401 });
        }

        const tokenResult = await verifyAndMatchToken({ token, tunerId, channelId });
        if (tokenResult.error !== undefined) {
            return tokenResult.error;
        }

        const sessionResult = await getOrCreatePlaylistSession({
            tokenData: tokenResult.tokenData,
            tunerId,
            channelId,
        });
        if (sessionResult.error !== undefined) {
            return sessionResult.error;
        }

        const viewerId = generateViewerFingerprint(req);
        Logger.debug(
            { sessionId: sessionResult.session.sessionId, viewerId },
            'Serving playlist with viewer fingerprint'
        );

        return await servePlaylist({
            outputDir: sessionResult.session.outputDir,
            token,
            viewerId,
        });
    } catch (error) {
        Logger.error({ error }, 'Error serving HLS playlist');
        return new Response('Internal server error', { status: 500 });
    }
}
