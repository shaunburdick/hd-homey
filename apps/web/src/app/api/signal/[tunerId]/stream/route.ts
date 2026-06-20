/**
 * SSE Route: Per-Device Signal Stream
 *
 * GET /api/signal/[tunerId]/stream
 *
 * Subscribes to ALL physical tuner slots on the same device as the requested
 * tuner (tuner0, tuner1, …). Physical slots are NOT stored in the DB; the
 * poller auto-discovers them from /status.json and assigns synthetic negative
 * IDs for any slots beyond the DB-tracked ones. See plan.md §"Per-Device
 * Signal Page — All Physical Tuner Slots" for the architecture decision.
 *
 * @module app/api/signal/[tunerId]/stream/route
 */

import type { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { and, eq, isNull } from 'drizzle-orm';
import { auth } from '@/lib/auth/auth';
import { getDb } from '@/lib/database/db';
import { tuners } from '@/lib/database/schema';
import { getSignalPoller } from '@/lib/hdhr/signal-poller';
import type { TrackedTuner } from '@/lib/hdhr/signal-poller';
import { SSE_HEADERS } from '@/app/api/signal/sse-headers';
import {
    canOpenConnection,
    registerConnection,
    unregisterConnection,
} from '@/lib/hdhr/sse-connection-tracker';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface Params {
    tunerId: string;
}

/**
 * Lookup a tuner by DB id and build the full list of tuners to track on
 * that device. Each DB tuner on the same path (device URL) maps to a
 * physical slot resource ("tuner0", "tuner1", …) ordered by ascending id.
 *
 * @param tunerId - The DB id of the requested tuner
 * @returns Device URL + ordered list of trackedTuners, or null if not found
 */
async function resolveDevice(
    tunerId: number,
): Promise<{ deviceUrl: string; tunersToTrack: TrackedTuner[] } | null> {
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

    const tunersToTrack: TrackedTuner[] = deviceTuners.map((deviceTuner, index) => ({
        tunerId: deviceTuner.id,
        resource: `tuner${index}`,
    }));

    return { deviceUrl: tuner.path, tunersToTrack };
}

/**
 * GET /api/signal/[tunerId]/stream
 *
 * Opens an SSE stream that delivers signal events for ALL physical tuner
 * slots on the device associated with `tunerId`. The client page displays
 * a grid of SignalStatusCard components, one per slot.
 *
 * @returns 200 text/event-stream | 400 | 401 | 404 | 429
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<Params> },
): Promise<Response> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session === null || session.user === undefined) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { tunerId: tunerIdStr } = await context.params;
    const tunerId = parseInt(tunerIdStr, 10);

    if (isNaN(tunerId)) {
        return Response.json({ error: 'Invalid tunerId' }, { status: 400 });
    }

    const resolved = await resolveDevice(tunerId);
    if (resolved === null) {
        return Response.json({ error: 'Tuner not found' }, { status: 404 });
    }
    const { deviceUrl, tunersToTrack } = resolved;

    if (!canOpenConnection(session.user.id)) {
        return Response.json({ error: 'Too many connections' }, { status: 429 });
    }

    const userId = session.user.id;
    const poller = getSignalPoller();
    let subscriberId = '';
    let cleaned = false;

    function cleanup(): void {
        if (cleaned || subscriberId === '') {
            return;
        }
        cleaned = true;
        poller.unsubscribe(deviceUrl, subscriberId);
        unregisterConnection(userId, subscriberId);
    }

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            subscriberId = poller.subscribeAll({ deviceUrl, tunersToTrack, controller });
            registerConnection(userId, subscriberId);
        },
        cancel: cleanup,
    });

    request.signal.addEventListener('abort', cleanup);

    return new Response(stream, { headers: SSE_HEADERS });
}
