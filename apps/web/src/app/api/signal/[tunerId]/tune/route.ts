/**
 * Signal API Route: Tune Channel
 *
 * POST /api/signal/[tunerId]/tune
 *
 * Tunes a specific HDHomeRun tuner to a channel by guide number.
 * Requires admin role. Checks for active viewers before tuning to prevent
 * interrupting live streams.
 *
 * @module app/api/signal/[tunerId]/tune/route
 */

import { headers } from 'next/headers';
import { and, eq, isNull } from 'drizzle-orm';
import { auth } from '@/lib/auth/auth';
import { getDb } from '@/lib/database/db';
import { tuners, channels } from '@/lib/database/schema';
import { getSessionManager } from '@/lib/transcoding/session-manager';
import { AuthRoles } from '@/lib/auth-roles';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

interface Params {
    tunerId: string;
}

/**
 * POST /api/signal/[tunerId]/tune
 *
 * Tunes the specified tuner to a channel.
 *
 * Request body: `{ guideNumber: string }`
 * Query param: `?force=true` to override active viewer check
 *
 * @returns 200 `{ success: true, resource: string }` on success
 * @returns 401 if not authenticated
 * @returns 403 if not admin
 * @returns 404 if tuner or channel not found
 * @returns 409 if active viewers and force not set
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<Params> },
): Promise<Response> {
    // 1. Validate session
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Require admin role
    if (session.user.role !== AuthRoles.Admin) {
        return Response.json({ error: 'Forbidden', message: 'Admin access required' }, { status: 403 });
    }

    // 3. Parse tunerId
    const { tunerId: tunerIdStr } = await context.params;
    const tunerId = parseInt(tunerIdStr, 10);

    if (isNaN(tunerId)) {
        return Response.json({ error: 'Invalid tunerId' }, { status: 400 });
    }

    // 4. Look up tuner in DB
    const db = await getDb();
    const tuner = await db.query.tuners.findFirst({
        where: and(
            eq(tuners.id, tunerId),
            isNull(tuners.deleted_at),
        ),
    });

    if (!tuner) {
        return Response.json({ error: 'Tuner not found' }, { status: 404 });
    }

    // 5. Parse request body
    let guideNumber: string;
    try {
        const body = await request.json() as { guideNumber?: unknown };
        if (typeof body.guideNumber !== 'string' || !body.guideNumber) {
            return Response.json({ error: 'guideNumber is required' }, { status: 400 });
        }
        guideNumber = body.guideNumber;
    } catch {
        return Response.json({ error: 'Invalid request body' }, { status: 400 });
    }

    // 6. Verify channel exists for this tuner
    const channel = await db.query.channels.findFirst({
        where: and(
            eq(channels.fk_tuner, tunerId),
            eq(channels.guideNumber, guideNumber),
            eq(channels.is_active, true),
            isNull(channels.deleted_at),
        ),
    });

    if (!channel) {
        return Response.json({ error: 'Channel not found' }, { status: 404 });
    }

    // 7. Check for active viewer conflict
    const forceParam = new URL(request.url).searchParams.get('force');
    const force = forceParam === 'true';

    if (!force) {
        const sessionManager = getSessionManager();
        const activeSessions = sessionManager.getActiveSessions();
        const conflicting = activeSessions.filter((s) => s.tunerId === tunerId);

        if (conflicting.length > 0) {
            const viewerCount = conflicting.reduce((sum, s) => sum + s.viewerCount, 0);
            return Response.json(
                { conflict: true, viewers: viewerCount },
                { status: 409 },
            );
        }
    }

    // 8. Determine resource index for this tuner
    const deviceTuners = await db.query.tuners.findMany({
        where: and(
            eq(tuners.path, tuner.path),
            isNull(tuners.deleted_at),
        ),
    });
    deviceTuners.sort((a, b) => a.id - b.id);
    const resourceIndex = deviceTuners.findIndex((t) => t.id === tunerId);
    const tunerNum = resourceIndex >= 0 ? resourceIndex : 0;

    // 9. Send tune command to device
    const tuneUrl = `${tuner.path}/tuner${tunerNum}/set?channel=v${guideNumber}`;

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
        const response = await fetch(tuneUrl, { signal: controller.signal });
        clearTimeout(timer);

        if (!response.ok) {
            return Response.json({ error: 'Device tune command failed' }, { status: 502 });
        }
    } catch {
        return Response.json({ error: 'Device unreachable' }, { status: 502 });
    }

    return Response.json({ success: true, resource: `tuner${tunerNum}` });
}
