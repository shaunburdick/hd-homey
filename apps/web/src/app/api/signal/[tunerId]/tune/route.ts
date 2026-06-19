/**
 * Signal API Route: Tune Channel
 *
 * POST /api/signal/[tunerId]/tune
 *
 * @module app/api/signal/[tunerId]/tune/route
 */

import type { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { and, eq, isNull } from 'drizzle-orm';
import { auth } from '@/lib/auth/auth';
import { getDb } from '@/lib/database/db';
import { tuners, channels } from '@/lib/database/schema';
import { getSessionManager } from '@/lib/transcoding/session-manager';
import { AuthRoles } from '@/lib/auth-roles';

export const dynamic = 'force-dynamic';

const DEVICE_TIMEOUT_MS = 3_000;

interface Params {
    tunerId: string;
}

/** Resolve a tuner and its per-device resource index */
async function resolveTunerAndIndex(tunerId: number) {
    const db = await getDb();
    const tuner = await db.query.tuners.findFirst({
        where: and(eq(tuners.id, tunerId), isNull(tuners.deleted_at)),
    });

    if (tuner === undefined) {
        return null;
    }

    const deviceTuners = await db.query.tuners.findMany({
        where: and(eq(tuners.path, tuner.path), isNull(tuners.deleted_at)),
    });

    deviceTuners.sort((tunerA, tunerB) => tunerA.id - tunerB.id);
    const resourceIndex = deviceTuners.findIndex((tun) => tun.id === tunerId);
    return { tuner, tunerNum: resourceIndex >= 0 ? resourceIndex : 0 };
}

/** Parse guideNumber from request body */
async function parseGuideNumber(request: NextRequest): Promise<string | null> {
    try {
        const body = await request.json() as { guideNumber?: unknown };
        if (typeof body.guideNumber !== 'string' || body.guideNumber === '') {
            return null;
        }
        return body.guideNumber;
    } catch {
        return null;
    }
}

/** Verify channel exists for tuner */
async function findChannel(tunerId: number, guideNumber: string) {
    const db = await getDb();
    return await db.query.channels.findFirst({
        where: and(
            eq(channels.fk_tuner, tunerId),
            eq(channels.guideNumber, guideNumber),
            eq(channels.is_active, true),
            isNull(channels.deleted_at),
        ),
    });
}

/** Check active viewer conflict; returns 409 Response or null if no conflict */
function checkConflict(tunerId: number, force: boolean): Response | null {
    if (force) {
        return null;
    }

    const conflicting = getSessionManager().getActiveSessions().filter((sess) => sess.tunerId === tunerId);
    const viewerCount = conflicting.reduce((sum, sess) => sum + sess.viewerCount, 0);
    if (viewerCount > 0) {
        return Response.json({ conflict: true, viewers: viewerCount }, { status: 409 });
    }

    return null;
}

interface SendTuneCommandOptions {
    devicePath: string;
    tunerNum: number;
    guideNumber: string;
}

/** Send tune command to device */
async function sendTuneCommand(options: SendTuneCommandOptions): Promise<boolean> {
    const { devicePath, tunerNum, guideNumber } = options;
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), DEVICE_TIMEOUT_MS);
        const response = await fetch(
            `${devicePath}/tuner${tunerNum}/set?channel=v${guideNumber}`,
            { signal: controller.signal },
        );
        clearTimeout(timer);
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * POST /api/signal/[tunerId]/tune
 *
 * @returns 200 | 400 | 401 | 403 | 404 | 409 | 502
 */
export async function POST(
    request: NextRequest,
    context: { params: Promise<Params> },
): Promise<Response> {
    const session = await auth.api.getSession({ headers: await headers() });

    if (session === null || session.user === undefined) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (session.user.role !== AuthRoles.Admin) {
        return Response.json({ error: 'Forbidden', message: 'Admin access required' }, { status: 403 });
    }

    const { tunerId: tunerIdStr } = await context.params;
    const tunerId = parseInt(tunerIdStr, 10);

    if (isNaN(tunerId)) {
        return Response.json({ error: 'Invalid tunerId' }, { status: 400 });
    }

    const resolved = await resolveTunerAndIndex(tunerId);
    if (resolved === null) {
        return Response.json({ error: 'Tuner not found' }, { status: 404 });
    }

    const guideNumber = await parseGuideNumber(request);
    if (guideNumber === null) {
        return Response.json({ error: 'guideNumber is required' }, { status: 400 });
    }

    const channel = await findChannel(tunerId, guideNumber);
    if (channel === undefined) {
        return Response.json({ error: 'Channel not found' }, { status: 404 });
    }

    const force = new URL(request.url).searchParams.get('force') === 'true';
    const conflictResponse = checkConflict(tunerId, force);
    if (conflictResponse !== null) {
        return conflictResponse;
    }

    const { tuner, tunerNum } = resolved;
    const tuneOk = await sendTuneCommand({ devicePath: tuner.path, tunerNum, guideNumber });
    if (!tuneOk) {
        return Response.json({ error: 'Device unreachable or tune command failed' }, { status: 502 });
    }

    return Response.json({ success: true, resource: `tuner${tunerNum}` });
}
