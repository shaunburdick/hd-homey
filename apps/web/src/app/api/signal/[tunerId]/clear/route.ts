/**
 * Signal API Route: Clear/Release Tuner
 *
 * POST /api/signal/[tunerId]/clear
 *
 * @module app/api/signal/[tunerId]/clear/route
 */

import type { NextRequest } from 'next/server';
import { headers } from 'next/headers';
import { and, eq, isNull } from 'drizzle-orm';
import { auth } from '@/lib/auth/auth';
import { getDb } from '@/lib/database/db';
import { tuners } from '@/lib/database/schema';
import { AuthRoles } from '@/lib/auth-roles';

export const dynamic = 'force-dynamic';

/** Device command timeout in milliseconds */
const DEVICE_TIMEOUT_MS = 3_000;

interface Params {
    tunerId: string;
}

/**
 * POST /api/signal/[tunerId]/clear
 *
 * @returns 200 `{ success: true, resource: string }` on success
 * @returns 401 if not authenticated
 * @returns 403 if not admin
 * @returns 404 if tuner not found
 * @returns 502 if device is unreachable
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

    const db = await getDb();
    const tuner = await db.query.tuners.findFirst({
        where: and(
            eq(tuners.id, tunerId),
            isNull(tuners.deleted_at),
        ),
    });

    if (tuner === undefined) {
        return Response.json({ error: 'Tuner not found' }, { status: 404 });
    }

    const deviceTuners = await db.query.tuners.findMany({
        where: and(
            eq(tuners.path, tuner.path),
            isNull(tuners.deleted_at),
        ),
    });
    deviceTuners.sort((tunerA, tunerB) => tunerA.id - tunerB.id);
    const resourceIndex = deviceTuners.findIndex((tun) => tun.id === tunerId);
    const tunerNum = resourceIndex >= 0 ? resourceIndex : 0;

    const clearUrl = `${tuner.path}/tuner${tunerNum}/set?channel=none`;

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), DEVICE_TIMEOUT_MS);
        const response = await fetch(clearUrl, { signal: controller.signal });
        clearTimeout(timer);

        if (!response.ok) {
            return Response.json({ error: 'Device clear command failed' }, { status: 502 });
        }
    } catch {
        return Response.json({ error: 'Device unreachable' }, { status: 502 });
    }

    return Response.json({ success: true, resource: `tuner${tunerNum}` });
}
