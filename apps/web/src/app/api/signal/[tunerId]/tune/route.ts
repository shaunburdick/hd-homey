/**
 * Signal API Route: Tune Channel
 *
 * POST /api/signal/[tunerId]/tune
 *
 * Accepts a JSON body with `guideNumber` and `resource` fields:
 *   - guideNumber: the channel's guide number (e.g. "5.1")
 *   - resource: the physical tuner slot name (e.g. "tuner0", "tuner2")
 *
 * The `resource` field is used to derive the device slot index directly,
 * replacing the former sibling-sort approach.
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

/** Regex for valid resource names: "tuner0", "tuner1", etc. */
const RESOURCE_PATTERN = /^tuner\d+$/;

interface Params {
    tunerId: string;
}

interface ParsedBody {
    guideNumber: string;
    resource: string;
}

/** Possible outcomes from body parsing */
type ParseBodyResult = ParsedBody | 'missing-guide' | 'missing-resource' | 'invalid-resource' | null;

/**
 * Parse and validate guideNumber + resource from the request body.
 *
 * @param request - Incoming POST request
 * @returns Parsed body if valid; a sentinel string or null on failure
 */
async function parseBody(request: NextRequest): Promise<ParseBodyResult> {
    try {
        const body = await request.json() as { guideNumber?: unknown; resource?: unknown };

        if (typeof body.guideNumber !== 'string' || body.guideNumber === '') {
            return 'missing-guide';
        }

        if (typeof body.resource !== 'string' || body.resource === '') {
            return 'missing-resource';
        }

        if (!RESOURCE_PATTERN.test(body.resource)) {
            return 'invalid-resource';
        }

        return { guideNumber: body.guideNumber, resource: body.resource };
    } catch {
        return null;
    }
}

/**
 * Convert a ParseBodyResult into a 400 Response when validation failed.
 * Returns null when the body is valid (i.e., a ParsedBody was returned).
 *
 * @param result - Value returned by parseBody
 */
function bodyValidationError(result: ParseBodyResult): Response | null {
    if (result === null || result === 'missing-guide') {
        return Response.json({ error: 'guideNumber is required' }, { status: 400 });
    }
    if (result === 'missing-resource') {
        return Response.json({ error: 'resource is required', expected: 'tunerN' }, { status: 400 });
    }
    if (result === 'invalid-resource') {
        return Response.json({ error: 'Invalid resource', expected: 'tunerN' }, { status: 400 });
    }
    return null;
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
            `${devicePath}/tuner${tunerNum}/set?channel=v${encodeURIComponent(guideNumber)}`,
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
 * @returns 200 `{ success: true, resource: string }` on success
 * @returns 400 if guideNumber or resource is missing/invalid
 * @returns 401 if not authenticated
 * @returns 403 if not admin
 * @returns 404 if tuner or channel not found
 * @returns 409 if active viewers present (and force not set)
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

    const parsedBody = await parseBody(request);
    const validationError = bodyValidationError(parsedBody);
    if (validationError !== null) {
        return validationError;
    }

    // parsedBody is confirmed ParsedBody here — sentinel cases are handled above
    const { guideNumber, resource } = parsedBody as ParsedBody;

    const db = await getDb();
    const tuner = await db.query.tuners.findFirst({
        where: and(eq(tuners.id, tunerId), isNull(tuners.deleted_at)),
    });

    if (tuner === undefined) {
        return Response.json({ error: 'Tuner not found' }, { status: 404 });
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

    const tunerNum = parseInt(resource.replace(/\D/g, ''), 10);
    const tuneOk = await sendTuneCommand({ devicePath: tuner.path, tunerNum, guideNumber });
    if (!tuneOk) {
        return Response.json({ error: 'Device unreachable or tune command failed' }, { status: 502 });
    }

    return Response.json({ success: true, resource });
}
