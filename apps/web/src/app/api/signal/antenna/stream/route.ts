/**
 * SSE Route: Antenna Tuning Mode — All Tuners Stream
 *
 * GET /api/signal/antenna/stream
 *
 * @module app/api/signal/antenna/stream/route
 */

import type { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { and, isNull, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth/auth';
import { getDb } from '@/lib/database/db';
import { tuners } from '@/lib/database/schema';
import { getSignalPoller } from '@/lib/hdhr/signal-poller';
import { formatSseEvent } from '@/lib/hdhr/signal-parsers';
import { SSE_HEADERS } from '@/app/api/signal/sse-headers';
import {
    canOpenConnection,
    registerConnection,
    unregisterConnection,
} from '@/lib/hdhr/sse-connection-tracker';
import type { Tuner } from '@/lib/database/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Group sorted tuners by device path and compute resource names */
function groupByDevice(sortedTuners: Tuner[]): Map<string, { tunerId: number; resource: string }[]> {
    const deviceGroups = new Map<string, { tunerId: number; resource: string }[]>();

    for (const tuner of sortedTuners) {
        const group = deviceGroups.get(tuner.path);
        if (group !== undefined) {
            group.push({ tunerId: tuner.id, resource: `tuner${group.length}` });
        } else {
            deviceGroups.set(tuner.path, [{ tunerId: tuner.id, resource: 'tuner0' }]);
        }
    }

    return deviceGroups;
}

interface StreamStartOptions {
    deviceGroups: Map<string, { tunerId: number; resource: string }[]>;
    userId: string;
    subscriberIds: { deviceUrl: string; subscriberId: string }[];
}

/** Initialize poller subscriptions and register connections inside ReadableStream.start() */
function startAntennaStream(
    controller: ReadableStreamDefaultController<Uint8Array>,
    options: StreamStartOptions,
): void {
    const { deviceGroups, userId, subscriberIds } = options;

    if (deviceGroups.size === 0) {
        const noTunersEvent = formatSseEvent('signal', {
            event: 'signal', tunerId: -1, resource: 'none', idle: true,
            ss: null, snq: null, seq: null, timestamp: Date.now(), error: 'no-tuners',
        });
        controller.enqueue(new TextEncoder().encode(noTunersEvent));
        controller.close();
        return;
    }

    const poller = getSignalPoller();
    for (const [deviceUrl, deviceTuners] of deviceGroups) {
        const subscriberId = poller.subscribeAll({
            deviceUrl, tunersToTrack: deviceTuners, controller,
        });
        subscriberIds.push({ deviceUrl, subscriberId });
        registerConnection(userId, subscriberId);
    }
}

/**
 * GET /api/signal/antenna/stream
 *
 * Opens an SSE stream for all active tuners simultaneously.
 *
 * @returns 200 text/event-stream | 401 | 429
 */
export async function GET(request: NextRequest): Promise<Response> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session === null || session.user === undefined) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    if (!canOpenConnection(session.user.id)) {
        return Response.json({ error: 'Too many connections' }, { status: 429 });
    }

    const db = await getDb();
    const allTuners = await db.query.tuners.findMany({
        where: and(eq(tuners.is_active, true), isNull(tuners.deleted_at)),
    });

    const sortedTuners = [...allTuners].sort((tunerA, tunerB) => tunerA.id - tunerB.id);
    const deviceGroups = groupByDevice(sortedTuners);
    const userId = session.user.id;
    const poller = getSignalPoller();
    const subscriberIds: { deviceUrl: string; subscriberId: string }[] = [];
    let cleaned = false;

    function cleanup(): void {
        if (cleaned) {
            return;
        }
        cleaned = true;
        for (const { deviceUrl, subscriberId } of subscriberIds) {
            poller.unsubscribe(deviceUrl, subscriberId);
            unregisterConnection(userId, subscriberId);
        }
    }

    const stream = new ReadableStream<Uint8Array>({
        start: (controller) => {
            startAntennaStream(controller, { deviceGroups, userId, subscriberIds });
        },
        cancel: cleanup,
    });

    request.signal.addEventListener('abort', cleanup);

    return new Response(stream, { headers: SSE_HEADERS });
}
