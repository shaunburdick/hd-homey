import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/database/db';
import { deviceCodes } from '@/lib/database/schema';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

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

        if (code === null) {
            return NextResponse.json(
                { error: 'Missing code parameter' },
                { status: 400 }
            );
        }

        if (code.length !== 6) {
            return NextResponse.json(
                { error: 'Invalid code format' },
                { status: 400 }
            );
        }

        const db = await getDb();

        // Find the device code
        const deviceCode = await db.query.deviceCodes.findFirst({
            where: eq(deviceCodes.code, code.toUpperCase()),
        });

        if (deviceCode === null || deviceCode === undefined) {
            return NextResponse.json(
                { error: 'Invalid code' },
                { status: 404 }
            );
        }

        // Check if code is expired
        if (new Date() > new Date(deviceCode.expiresAt)) {
            return NextResponse.json(
                { error: 'Code has expired' },
                { status: 410 } // 410 Gone
            );
        }

        // Check if code is already used
        if (deviceCode.status !== 'pending') {
            return NextResponse.json(
                { error: `Code has already been ${deviceCode.status}` },
                { status: 409 } // 409 Conflict
            );
        }

        return NextResponse.json({
            deviceName: deviceCode.deviceName,
            deviceType: deviceCode.deviceType,
            expiresAt: new Date(deviceCode.expiresAt).toISOString(),
        });
    } catch (error) {
        logger.error({ error }, 'Error validating device code');
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
