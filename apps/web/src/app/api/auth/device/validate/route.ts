import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/database/db';
import { deviceCodes } from '@/lib/database/schema';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** Required length for a device code */
const DEVICE_CODE_LENGTH = 6;

/**
 * Validate the code query parameter format.
 * Returns a NextResponse error if invalid, or null if valid.
 */
function validateCodeParam(code: string | null): NextResponse | null {
    if (code === null) {
        return NextResponse.json(
            { error: 'Missing code parameter' },
            { status: 400 }
        );
    }

    if (code.length !== DEVICE_CODE_LENGTH) {
        return NextResponse.json(
            { error: 'Invalid code format' },
            { status: 400 }
        );
    }

    return null;
}

/**
 * Look up device code and check its validity status.
 * Returns a NextResponse error or the device info if valid.
 */
async function lookupDeviceCode(code: string): Promise<NextResponse> {
    const db = await getDb();

    const deviceCode = await db.query.deviceCodes.findFirst({
        where: eq(deviceCodes.code, code.toUpperCase()),
    });

    if (deviceCode === null || deviceCode === undefined) {
        return NextResponse.json(
            { error: 'Invalid code' },
            { status: 404 }
        );
    }

    if (new Date() > new Date(deviceCode.expiresAt)) {
        return NextResponse.json(
            { error: 'Code has expired' },
            { status: 410 }
        );
    }

    if (deviceCode.status !== 'pending') {
        return NextResponse.json(
            { error: `Code has already been ${deviceCode.status}` },
            { status: 409 }
        );
    }

    return NextResponse.json({
        deviceName: deviceCode.deviceName,
        deviceType: deviceCode.deviceType,
        expiresAt: new Date(deviceCode.expiresAt).toISOString(),
    });
}

/**
 * GET /api/auth/device/validate?code=A8F2K9
 * Validate a device code and return device info (without authorizing)
 *
 * Response (200):
 * {
 *   "deviceName": "Living Room TV",
 *   "deviceType": "tv",
 *   "expiresAt": "2025-12-12T18:30:00.000Z"
 * }
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
    try {
        const { searchParams } = new URL(request.url);
        const code = searchParams.get('code');

        const paramError = validateCodeParam(code);
        if (paramError !== null) {
            return paramError;
        }

        return await lookupDeviceCode(code as string);
    } catch (error) {
        logger.error({ error }, 'Error validating device code');
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
