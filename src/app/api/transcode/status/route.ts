/**
 * Transcoding status endpoint - returns active sessions
 */

import type { NextRequest } from 'next/server';
import { auth } from '@/auth';
import { AuthRoles } from '@/lib/auth-roles';
import { getSessionManager } from '@/lib/transcoding/session-manager';
import Logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        // Check admin auth
        const session = await auth();
        if (!session?.user || session.user.role !== AuthRoles.Admin) {
            Logger.warn({ user: session?.user }, 'Unauthorized status request');
            return new Response('Unauthorized', { status: 403 });
        }

        const manager = getSessionManager();
        const activeSessions = manager.getActiveSessions();

        return Response.json({
            sessions: activeSessions,
            count: activeSessions.length,
        });
    } catch (error) {
        Logger.error({ error }, 'Error fetching transcoding status');
        return new Response('Internal server error', { status: 500 });
    }
}

/**
 * Stop a specific session (admin only)
 */
export async function DELETE(req: NextRequest) {
    try {
        // Check admin auth
        const session = await auth();
        if (!session?.user || session.user.role !== AuthRoles.Admin) {
            Logger.warn({ user: session?.user }, 'Unauthorized stop session request');
            return new Response('Unauthorized', { status: 403 });
        }

        const { searchParams } = req.nextUrl;
        const sessionId = searchParams.get('sessionId');

        if (!sessionId) {
            return new Response('Missing sessionId', { status: 400 });
        }

        const manager = getSessionManager();
        await manager.stopSession(sessionId);

        return Response.json({ success: true });
    } catch (error) {
        Logger.error({ error }, 'Error stopping session');
        return new Response('Internal server error', { status: 500 });
    }
}
