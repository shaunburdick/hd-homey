import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/database/db';
import { deviceCodes } from '@/lib/database/schema';
import { auth } from '@/lib/auth/auth';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/device/poll?code=A8F2K9
 * Poll for device code authorization status
 *
 * Query params:
 * - code: 6-character device code
 *
 * Response (200):
 * Pending:
 * {
 *   "status": "pending"
 * }
 *
 * Authorized:
 * {
 *   "status": "authorized",
 *   "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *   "user": {
 *     "id": "user_123",
 *     "username": "john",
 *     "role": "admin"
 *   }
 * }
 *
 * Expired:
 * {
 *   "status": "expired"
 * }
 *
 * Denied:
 * {
 *   "status": "denied"
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
            where: eq(deviceCodes.code, code),
            with: {
                authorizer: {
                    columns: {
                        id: true,
                        username: true,
                        role: true,
                    },
                },
            },
        });

        if (deviceCode === null || deviceCode === undefined) {
            return NextResponse.json(
                { error: 'Invalid code' },
                { status: 404 }
            );
        }

        // Check if code is expired
        if (new Date() > new Date(deviceCode.expiresAt)) {
            // Update status to expired if not already
            if (deviceCode.status === 'pending') {
                await db.update(deviceCodes)
                    .set({ status: 'expired' })
                    .where(eq(deviceCodes.code, code));
            }
            return NextResponse.json({ status: 'expired' });
        }

        // Return status based on device code state
        switch (deviceCode.status) {
            case 'pending':
                return NextResponse.json({ status: 'pending' });

            case 'denied':
                return NextResponse.json({ status: 'denied' });

            case 'authorized': {
                if (deviceCode.authorizer === null || deviceCode.authorizer === undefined) {
                    // This shouldn't happen, but handle it
                    return NextResponse.json(
                        { error: 'Authorization error' },
                        { status: 500 }
                    );
                }

                // Generate JWT session token
                const session = await auth.api.signInUser({
                    userId: deviceCode.authorizer.id,
                    dontRememberMe: false,
                });

                if (session === null || session === undefined) {
                    return NextResponse.json(
                        { error: 'Failed to create session' },
                        { status: 500 }
                    );
                }

                return NextResponse.json({
                    status: 'authorized',
                    token: session.token,
                    user: {
                        id: deviceCode.authorizer.id,
                        username: deviceCode.authorizer.username,
                        role: deviceCode.authorizer.role,
                    },
                });
            }

            case 'expired':
                return NextResponse.json({ status: 'expired' });

            default:
                return NextResponse.json(
                    { error: 'Unknown status' },
                    { status: 500 }
                );
        }
    } catch (error) {
        logger.error({ error }, 'Error polling device code');
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
