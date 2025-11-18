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
        const { searchParams } = req.nextUrl;
        const token = searchParams.get('token');
        const viewerId = searchParams.get('viewer_id');

        if (!token) {
            Logger.warn({ tunerId, channelId, segment }, 'Segment request missing token');
            return new Response('Missing token', { status: 401 });
        }

        if (!viewerId) {
            Logger.warn({ tunerId, channelId, segment }, 'Segment request missing viewer_id');
            return new Response('Missing viewer_id - please reload the page', { status: 400 });
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

        // Track viewer activity
        // First segment request with this viewer_id → add viewer
        // Subsequent requests → update activity
        const updated = manager.updateViewerActivity(sessionId, viewerId);

        if (!updated) {
            // First time seeing this viewer_id - add them
            try {
                manager.addViewer(sessionId, viewerId, {
                    userAgent: req.headers.get('user-agent') || undefined,
                });
                Logger.info({ sessionId, viewerId }, 'New viewer added via segment request');
            } catch (error) {
                // Session might have ended
                Logger.error({ error, sessionId, viewerId }, 'Failed to add viewer');
                return new Response('Session ended', { status: 410 });
            }
        }

        // Serve the segment
        return await serveSegment(session.outputDir, segment);
    } catch (error) {
        Logger.error({ error }, 'Error serving HLS segment');
        return new Response('Internal server error', { status: 500 });
    }
}
