/**
 * Signal API Route: Clear/Release Tuner
 *
 * POST /api/signal/[tunerId]/clear
 *
 * Accepts a JSON body with a `resource` field identifying the physical tuner
 * slot to release (e.g. "tuner0", "tuner2"). The device slot index is derived
 * directly from the resource string, replacing the former sibling-sort approach.
 *
 * Clearing is performed via the HDHomeRun native TCP protocol (port 65001)
 * because the device firmware does NOT expose an HTTP `/tuner{N}/set` endpoint.
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
import { nativeSet, extractHostname } from '@/lib/hdhr/native-protocol';
import type { NativeProtocolError } from '@/lib/hdhr/native-protocol';
import Logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** Regex for valid resource names: "tuner0", "tuner1", etc. */
const RESOURCE_PATTERN = /^tuner\d+$/;

/** Error sentinel returned when resource field is absent or empty */
const ERR_MISSING_RESOURCE = 'missing-resource' as const;

/** Error sentinel returned when resource field does not match RESOURCE_PATTERN */
const ERR_INVALID_RESOURCE = 'invalid-resource' as const;

interface Params {
    tunerId: string;
}

/**
 * Parse and validate resource from the request body.
 *
 * @param request - Incoming POST request
 * @returns The resource string if valid; a string sentinel describing the error otherwise
 */
async function parseResource(
    request: NextRequest,
): Promise<string | typeof ERR_MISSING_RESOURCE | typeof ERR_INVALID_RESOURCE> {
    try {
        const body = await request.json() as { resource?: unknown };

        if (typeof body.resource !== 'string' || body.resource === '') {
            return ERR_MISSING_RESOURCE;
        }

        if (!RESOURCE_PATTERN.test(body.resource)) {
            return ERR_INVALID_RESOURCE;
        }

        return body.resource;
    } catch {
        return ERR_MISSING_RESOURCE;
    }
}

interface SendClearCommandOptions {
    devicePath: string;
    tunerNum: number;
    tunerId: number;
    resource: string;
}

/**
 * Send a clear command to the device via the native TCP protocol.
 *
 * Sets `/tuner{N}/channel` to `none` using the HDHomeRun binary control
 * protocol on port 65001. Returns a 502 Response on any failure, or null
 * on success so the caller can proceed to return 200.
 *
 * @param options - Device path, tuner slot number, tunerId, and resource
 * @returns Null on success; a 502 Response on device error or bad path
 */
async function sendClearCommand(options: SendClearCommandOptions): Promise<Response | null> {
    const { devicePath, tunerNum, tunerId, resource } = options;
    const deviceIp = extractHostname(devicePath);
    if (deviceIp === '') {
        Logger.warn({ devicePath, tunerId, resource }, 'extractHostname returned empty string');
        return Response.json({ error: 'Device unreachable', tunerId, resource }, { status: 502 });
    }
    try {
        await nativeSet({ deviceIp, variable: `/tuner${tunerNum}/channel`, value: 'none' });
        return null;
    } catch (error) {
        const nativeErr = error as Partial<NativeProtocolError>;
        Logger.error(
            { tunerId, resource, deviceIp, errorCode: nativeErr.code, errorMsg: nativeErr.message },
            'Failed to send clear command',
        );
        return Response.json(
            { error: 'Device unreachable', errorCode: nativeErr.code, details: nativeErr.message },
            { status: 502 },
        );
    }
}

/**
 * POST /api/signal/[tunerId]/clear
 *
 * @returns 200 `{ success: true, resource: string }` on success
 * @returns 400 if resource is missing or invalid
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

    const resourceResult = await parseResource(request);

    if (resourceResult === ERR_MISSING_RESOURCE) {
        return Response.json({ error: 'resource is required', expected: 'tunerN' }, { status: 400 });
    }

    if (resourceResult === ERR_INVALID_RESOURCE) {
        return Response.json({ error: 'Invalid resource', expected: 'tunerN' }, { status: 400 });
    }

    const resource = resourceResult;

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

    const tunerNum = parseInt(resource.replace(/\D/g, ''), 10);

    const clearError = await sendClearCommand({ devicePath: tuner.path, tunerNum, tunerId, resource });
    if (clearError !== null) {
        return clearError;
    }

    return Response.json({ success: true, resource });
}
