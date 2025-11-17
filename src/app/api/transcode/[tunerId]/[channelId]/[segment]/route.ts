/**
 * HLS Segment endpoint - serves individual .ts segment files
 */

import type { NextRequest } from 'next/server';
import { verifyStreamToken } from '@/lib/stream-token';
import { getSessionManager } from '@/lib/transcoding/session-manager';
import { serveSegment } from '@/lib/transcoding/hls-server';
import Logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ tunerId: string; channelId: string; segment: string }> }
) {
    try {
        const { tunerId, channelId, segment } = await context.params;
        const token = req.nextUrl.searchParams.get('token');

        if (!token) {
            Logger.warn({ tunerId, channelId, segment }, 'Segment request missing token');
            return new Response('Missing token', { status: 401 });
        }

        // Verify token
        const tokenData = await verifyStreamToken(token);
        if (!tokenData) {
            Logger.warn({ tunerId, channelId, segment }, 'Invalid or expired stream token');
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

        // Get session
        const manager = getSessionManager();
        const sessionId = `${tunerId}:${channelId}`;
        const session = manager.getSession(sessionId);

        if (!session) {
            Logger.warn({ sessionId, segment }, 'Session not found for segment request');
            return new Response('Session not found', { status: 404 });
        }

        // Update last access time by incrementing/decrementing (net zero but updates timestamp)
        manager.incrementViewers(sessionId);
        manager.decrementViewers(sessionId);

        // Serve the segment
        return await serveSegment(session.outputDir, segment);
    } catch (error) {
        Logger.error({ error }, 'Error serving HLS segment');
        return new Response('Internal server error', { status: 500 });
    }
}
