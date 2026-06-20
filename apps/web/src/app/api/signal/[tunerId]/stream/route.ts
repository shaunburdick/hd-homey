/**
 * SSE Route: Single-Tuner Signal Stream
 *
 * GET /api/signal/[tunerId]/stream
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

/** Lookup a tuner by DB id and compute its HDHomeRun resource name */
async function resolveTuner(tunerId: number) {
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
    const resource = resourceIndex >= 0 ? `tuner${resourceIndex}` : 'tuner0';

    return { tuner, resource };
}

/**
 * GET /api/signal/[tunerId]/stream
 *
 * Opens an SSE stream for a single tuner's signal data.
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

    const resolved = await resolveTuner(tunerId);
    if (resolved === null) {
        return Response.json({ error: 'Tuner not found' }, { status: 404 });
    }
    const { tuner, resource } = resolved;

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
        poller.unsubscribe(tuner.path, subscriberId);
        unregisterConnection(userId, subscriberId);
    }

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            subscriberId = poller.subscribe({
                deviceUrl: tuner.path, tunerDbId: tunerId, resource, controller,
            });
            registerConnection(userId, subscriberId);
        },
        cancel: cleanup,
    });

    request.signal.addEventListener('abort', cleanup);

    return new Response(stream, { headers: SSE_HEADERS });
}
