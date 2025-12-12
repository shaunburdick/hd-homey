import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/lib/database/db';
import { deviceCodes } from '@/lib/database/schema';
import { auth } from '@/lib/auth/auth';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const authorizeRequestSchema = z.object({
    code: z.string().length(6),
});

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
        // Require authentication
        const session = await auth.api.getSession({
            headers: await import('next/headers').then((mod) => mod.headers()),
        });

        if (session?.user === null || session?.user === undefined) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        // Parse and validate request body
        const body = await request.json();
        const validated = authorizeRequestSchema.parse(body);

        const db = await getDb();

        // Find the device code
        const deviceCode = await db.query.deviceCodes.findFirst({
            where: eq(deviceCodes.code, validated.code.toUpperCase()),
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
                { status: 410 }
            );
        }

        // Check if code is still pending
        if (deviceCode.status !== 'pending') {
            return NextResponse.json(
                { error: `Code has already been ${deviceCode.status}` },
                { status: 409 }
            );
        }

        // Authorize the device code
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
