/**
 * SSE Route: Single-Tuner Signal Stream
 *
 * GET /api/signal/[tunerId]/stream
 *
 * Returns a text/event-stream Response that continuously emits signal metrics
 * for the specified tuner using the SignalPollingManager singleton.
 *
 * Events emitted:
 * - `signal` (every 2 s): SS, SNQ, SEQ gauges
 * - `streaminfo` (on channel change): program/PID listing
 * - `atsc3plp` / `atsc3l1` (on ATSC 3.0 lock): advanced diagnostics
 * - `ping` (every 30 s): keepalive
 *
 * @module app/api/signal/[tunerId]/stream/route
 */

import { headers } from 'next/headers';
import { and, eq, isNull } from 'drizzle-orm';
import { auth } from '@/lib/auth/auth';
import { getDb } from '@/lib/database/db';
import { tuners } from '@/lib/database/schema';
import { getSignalPoller } from '@/lib/hdhr/signal-poller';
import type { NextRequest } from 'next/server';

/** Use Node.js runtime — Edge Runtime has 30s timeout limit which breaks SSE */
export const runtime = 'nodejs';

/** Force dynamic to prevent response caching / buffering */
export const dynamic = 'force-dynamic';

/** SSE response headers — disable all caching and buffering proxies */
const SSE_HEADERS: Record<string, string> = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
};

interface Params {
    tunerId: string;
}

/**
 * GET /api/signal/[tunerId]/stream
 *
 * Opens an SSE stream for a single tuner's signal data.
 * Requires an authenticated session.
 *
 * @returns 200 text/event-stream on success
 * @returns 401 if not authenticated
 * @returns 404 if tunerId is unknown or deleted
 */
export async function GET(
    request: NextRequest,
    context: { params: Promise<Params> },
): Promise<Response> {
    // 1. Validate session
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Parse tunerId and look up in DB
    const { tunerId: tunerIdStr } = await context.params;
    const tunerId = parseInt(tunerIdStr, 10);

    if (isNaN(tunerId)) {
        return Response.json({ error: 'Invalid tunerId' }, { status: 400 });
    }

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

    // 3. Determine the HDHomeRun resource name for this tuner
    //    Query all tuners with the same device path, sorted by ID, and find the index
    const deviceTuners = await db.query.tuners.findMany({
        where: and(
            eq(tuners.path, tuner.path),
            isNull(tuners.deleted_at),
        ),
    });

    deviceTuners.sort((a, b) => a.id - b.id);
    const resourceIndex = deviceTuners.findIndex((t) => t.id === tunerId);
    const resource = resourceIndex >= 0 ? `tuner${resourceIndex}` : 'tuner0';

    // 4. Create ReadableStream with SSE subscription
    const poller = getSignalPoller();
    let subscriberId: string;

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            subscriberId = poller.subscribe(tuner.path, tunerId, resource, controller);
        },
        cancel() {
            if (subscriberId) {
                poller.unsubscribe(tuner.path, subscriberId);
            }
        },
    });

    // 5. Close stream when client disconnects
    request.signal.addEventListener('abort', () => {
        if (subscriberId) {
            poller.unsubscribe(tuner.path, subscriberId);
        }
    });

    return new Response(stream, { headers: SSE_HEADERS });
}
