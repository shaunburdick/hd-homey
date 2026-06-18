/**
 * HLS Segment endpoint - serves individual .ts segment files
 */

import type { NextRequest } from 'next/server';
import { verifyStreamToken } from '@/lib/stream-token';
import { getSessionManager } from '@/lib/transcoding/session-manager';
import { serveSegment } from '@/lib/transcoding/hls-server';
import { generateViewerFingerprint } from '@/lib/viewer-fingerprint';
import Logger from '@/lib/logger';

export const dynamic = 'force-dynamic';
interface SegmentParams {
    tunerId: string;
    channelId: string;
    segment: string;
}

interface TokenValidationContext {
    tunerId: string;
    channelId: string;
    segment: string;
    token: string;
}

/**
 * Validate the stream token and check it matches the requested resource.
 * Returns a Response error or null if valid.
 */
async function validateToken({ tunerId, channelId, segment, token }: TokenValidationContext): Promise<Response | null> {
    const tokenData = await verifyStreamToken(token);
    if (tokenData === null) {
        Logger.warn({ tunerId, channelId, segment }, 'Invalid or expired stream token');
        return new Response('Invalid or expired token', { status: 403 });
    }

    if (tokenData.tunerId !== parseInt(tunerId, 10) ||
        tokenData.channelId !== parseInt(channelId, 10)) {
        Logger.warn({
            requested: { tunerId, channelId },
            token: tokenData,
        }, 'Token resource mismatch');
        return new Response('Token does not match resource', { status: 403 });
    }

    return null;
}

interface TrackViewerOptions {
    sessionId: string;
    viewerId: string;
    req: NextRequest;
}

/**
 * Track a viewer for the session, adding them if this is their first request.
 * Returns a Response error if the session has ended, or null on success.
 */
function trackViewer({ sessionId, viewerId, req }: TrackViewerOptions): Response | null {
    const manager = getSessionManager();
    const updated = manager.updateViewerActivity(sessionId, viewerId);

    if (!updated) {
        try {
            const userAgentHeader = req.headers.get('user-agent');
            manager.addViewer({ sessionId, viewerId, metadata: {
                userAgent: userAgentHeader ?? undefined,
            } });
            Logger.info({ sessionId, viewerId }, 'New viewer added via segment request');
        } catch (error) {
            // Session ended between the lookup and the add attempt — safe to surface as 410
            Logger.error({ error, sessionId, viewerId }, 'Failed to add viewer');
            return new Response('Session ended', { status: 410 });
        }
    }

    return null;
}

export async function GET(
    req: NextRequest,
    context: { params: Promise<SegmentParams> }
) {
    try {
        const { tunerId, channelId, segment } = await context.params;
        const { searchParams } = req.nextUrl;
        const token = searchParams.get('token');
        let viewerId = searchParams.get('viewer_id');

        if (token === null || token === '') {
            Logger.warn({ tunerId, channelId, segment }, 'Segment request missing token');
            return new Response('Missing token', { status: 401 });
        }

        // If viewer_id not in URL, generate from fingerprint
        if (viewerId === null || viewerId === '') {
            viewerId = generateViewerFingerprint(req);
            Logger.debug({ tunerId, channelId, segment, viewerId }, 'Generated viewer_id from fingerprint');
        }

        const tokenError = await validateToken({ tunerId, channelId, segment, token });
        if (tokenError !== null) {
            return tokenError;
        }

        const manager = getSessionManager();
        const sessionId = `${tunerId}:${channelId}`;
        const session = manager.getSession(sessionId);

        if (session === undefined) {
            Logger.warn({ sessionId, segment }, 'Session not found for segment request');
            return new Response('Session not found', { status: 404 });
        }

        const viewerError = trackViewer({ sessionId, viewerId, req });
        if (viewerError !== null) {
            return viewerError;
        }

        return await serveSegment(session.outputDir, segment);
    } catch (error) {
        Logger.error({ error }, 'Error serving HLS segment');
        return new Response('Internal server error', { status: 500 });
    }
}
