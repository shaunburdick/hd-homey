/**
 * SSE Route: Antenna Tuning Mode — All Tuners Stream
 *
 * GET /api/signal/antenna/stream
 *
 * Fans out signal events from ALL active tuners across all configured devices
 * into a single SSE stream. Each event carries a `tunerId` discriminator.
 *
 * Handles partial device failures gracefully: if one device is unreachable,
 * its tuners emit error events while other devices continue normally.
 *
 * @module app/api/signal/antenna/stream/route
 */

import { headers } from 'next/headers';
import { and, isNull, eq } from 'drizzle-orm';
import { auth } from '@/lib/auth/auth';
import { getDb } from '@/lib/database/db';
import { tuners } from '@/lib/database/schema';
import { getSignalPoller } from '@/lib/hdhr/signal-poller';
import { formatSseEvent } from '@/lib/hdhr/signal-parsers';
import type { NextRequest } from 'next/server';

/** Use Node.js runtime — Edge Runtime has 30s timeout limit which breaks SSE */
export const runtime = 'nodejs';

/** Force dynamic to prevent response caching / buffering */
export const dynamic = 'force-dynamic';

/** SSE response headers */
const SSE_HEADERS: Record<string, string> = {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
};

/**
 * GET /api/signal/antenna/stream
 *
 * Opens an SSE stream for all active tuners simultaneously.
 * Requires an authenticated session.
 *
 * @returns 200 text/event-stream on success
 * @returns 401 if not authenticated
 */
export async function GET(request: NextRequest): Promise<Response> {
    // 1. Validate session
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session?.user) {
        return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // 2. Query all active tuners
    const db = await getDb();
    const allTuners = await db.query.tuners.findMany({
        where: and(
            eq(tuners.is_active, true),
            isNull(tuners.deleted_at),
        ),
    });

    // 3. Group tuners by device path (one poll entry per device)
    const deviceGroups = new Map<string, Array<{ tunerId: number; resource: string }>>();

    // Sort all tuners by ID so resource indices are stable
    const sortedTuners = [...allTuners].sort((a, b) => a.id - b.id);

    // Group by path and assign resource names based on per-device sort order
    for (const tuner of sortedTuners) {
        const group = deviceGroups.get(tuner.path);
        if (group !== undefined) {
            group.push({ tunerId: tuner.id, resource: `tuner${group.length}` });
        } else {
            deviceGroups.set(tuner.path, [{ tunerId: tuner.id, resource: 'tuner0' }]);
        }
    }

    const poller = getSignalPoller();
    const subscriberIds: Array<{ deviceUrl: string; subscriberId: string }> = [];

    const stream = new ReadableStream<Uint8Array>({
        start(controller) {
            // 4. Handle empty tuner list
            if (deviceGroups.size === 0) {
                const noTunersEvent = formatSseEvent('signal', {
                    event: 'signal',
                    tunerId: -1,
                    resource: 'none',
                    idle: true,
                    ss: null,
                    snq: null,
                    seq: null,
                    timestamp: Date.now(),
                    error: 'no-tuners',
                });
                controller.enqueue(new TextEncoder().encode(noTunersEvent));
                controller.close();
                return;
            }

            // 5. Subscribe to each device group
            for (const [deviceUrl, deviceTuners] of deviceGroups) {
                const subscriberId = poller.subscribeAll(deviceUrl, deviceTuners, controller);
                subscriberIds.push({ deviceUrl, subscriberId });
            }
        },
        cancel() {
            // 6. Unsubscribe all on client disconnect
            for (const { deviceUrl, subscriberId } of subscriberIds) {
                poller.unsubscribe(deviceUrl, subscriberId);
            }
        },
    });

    // 7. Also unsubscribe on request abort
    request.signal.addEventListener('abort', () => {
        for (const { deviceUrl, subscriberId } of subscriberIds) {
            poller.unsubscribe(deviceUrl, subscriberId);
        }
    });

    return new Response(stream, { headers: SSE_HEADERS });
}
