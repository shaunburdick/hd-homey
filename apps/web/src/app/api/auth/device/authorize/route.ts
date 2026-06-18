import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/lib/database/db';
import type { DeviceCode } from '@/lib/database/schema';
import { deviceCodes } from '@/lib/database/schema';
import { auth } from '@/lib/auth/auth';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** Length of a device authorization code */
const DEVICE_CODE_LENGTH = 6;

const authorizeRequestSchema = z.object({
    code: z.string().length(DEVICE_CODE_LENGTH),
});

type DeviceCodeValidationResult =
    | { deviceCode: DeviceCode; error?: never }
    | { deviceCode?: never; error: NextResponse };

/**
 * Require an authenticated session from the current request headers.
 * Returns the session or null if unauthenticated.
 */
async function requireSession() {
    return auth.api.getSession({
        headers: await import('next/headers').then((mod) => mod.headers()),
    });
}

/**
 * Verify a device code exists, is not expired, and is still pending.
 * Returns the device code record or a NextResponse error.
 */
async function validateDeviceCode(code: string): Promise<DeviceCodeValidationResult> {
    const db = await getDb();

    const deviceCode = await db.query.deviceCodes.findFirst({
        where: eq(deviceCodes.code, code.toUpperCase()),
    });

    if (deviceCode === null || deviceCode === undefined) {
        return {
            error: NextResponse.json(
                { error: 'Invalid code' },
                { status: 404 }
            ),
        };
    }

    if (new Date() > new Date(deviceCode.expiresAt)) {
        return {
            error: NextResponse.json(
                { error: 'Code has expired' },
                { status: 410 }
            ),
        };
    }

    if (deviceCode.status !== 'pending') {
        return {
            error: NextResponse.json(
                { error: `Code has already been ${deviceCode.status}` },
                { status: 409 }
            ),
        };
    }

    return { deviceCode };
}

/**
 * POST /api/auth/device/authorize
 * Authorize a device code (mark it as authorized by current user)
 *
 * Request body:
 * {
 *   "code": "A8F2K9"
 * }
 *
 * Response (200):
 * {
 *   "success": true
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const session = await requireSession();

        if (session?.user === null || session?.user === undefined) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const validated = authorizeRequestSchema.parse(body);

        const result = await validateDeviceCode(validated.code);
        if (result.error !== undefined) {
            return result.error;
        }

        const db = await getDb();
        await db.update(deviceCodes)
            .set({
                status: 'authorized',
                authorizedAt: new Date(),
                authorizedBy: session.user.id,
            })
            .where(eq(deviceCodes.code, validated.code.toUpperCase()));

        return NextResponse.json({ success: true });
    } catch (error) {
        if (error instanceof z.ZodError) {
            return NextResponse.json(
                {
                    error: 'Invalid request',
                    details: error.issues,
                },
                { status: 400 }
            );
        }

        logger.error({ error }, 'Error authorizing device code');
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
