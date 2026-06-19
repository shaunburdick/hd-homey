/**
 * Signal API Route: Clear/Release Tuner
 *
 * POST /api/signal/[tunerId]/clear
 *
 * Releases the currently tuned channel on a specific HDHomeRun tuner.
 * Requires admin role.
 *
 * @module app/api/signal/[tunerId]/clear/route
 */

import { headers } from 'next/headers';
import { and, eq, isNull } from 'drizzle-orm';
import { auth } from '@/lib/auth/auth';
import { getDb } from '@/lib/database/db';
import { tuners } from '@/lib/database/schema';
import { AuthRoles } from '@/lib/auth-roles';
import type { NextRequest } from 'next/server';

export const dynamic = 'force-dynamic';

interface Params {
    tunerId: string;
}

/**
 * POST /api/signal/[tunerId]/clear
 *
 * Releases the currently tuned channel on the specified tuner.
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

    // 5. Determine resource index
    const deviceTuners = await db.query.tuners.findMany({
        where: and(
            eq(tuners.path, tuner.path),
            isNull(tuners.deleted_at),
        ),
    });
    deviceTuners.sort((a, b) => a.id - b.id);
    const resourceIndex = deviceTuners.findIndex((t) => t.id === tunerId);
    const tunerNum = resourceIndex >= 0 ? resourceIndex : 0;

    // 6. Send clear command to device
    const clearUrl = `${tuner.path}/tuner${tunerNum}/set?channel=none`;

    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 3000);
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
