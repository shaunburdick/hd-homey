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
import type { Tuner } from '@/lib/database/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const SSE_HEADERS: Record<string, string> = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
};

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

/**
 * GET /api/signal/antenna/stream
 *
 * Opens an SSE stream for all active tuners simultaneously.
 *
 * @returns 200 text/event-stream | 401
 */
export async function GET(request: NextRequest): Promise<Response> {
    const session = await auth.api.getSession({ headers: await headers() });
    if (session === null || session.user === undefined) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = await getDb();
    const allTuners = await db.query.tuners.findMany({
        where: and(eq(tuners.is_active, true), isNull(tuners.deleted_at)),
    });

    const sortedTuners = [...allTuners].sort((tunerA, tunerB) => tunerA.id - tunerB.id);
    const deviceGroups = groupByDevice(sortedTuners);
    const poller = getSignalPoller();
    const subscriberIds: { deviceUrl: string; subscriberId: string }[] = [];

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            if (deviceGroups.size === 0) {
                const noTunersEvent = formatSseEvent('signal', {
                    event: 'signal', tunerId: -1, resource: 'none', idle: true,
                    ss: null, snq: null, seq: null, timestamp: Date.now(), error: 'no-tuners',
                });
                controller.enqueue(new TextEncoder().encode(noTunersEvent));
                controller.close();
                return;
            }

            for (const [deviceUrl, deviceTuners] of deviceGroups) {
                const subscriberId = poller.subscribeAll({
                    deviceUrl, tunersToTrack: deviceTuners, controller,
                });
                subscriberIds.push({ deviceUrl, subscriberId });
            }
        },
        cancel() {
            for (const { deviceUrl, subscriberId } of subscriberIds) {
                poller.unsubscribe(deviceUrl, subscriberId);
            }
        },
    });

    request.signal.addEventListener('abort', () => {
        for (const { deviceUrl, subscriberId } of subscriberIds) {
            poller.unsubscribe(deviceUrl, subscriberId);
        }
    });

    return new Response(stream, { headers: SSE_HEADERS });
}
