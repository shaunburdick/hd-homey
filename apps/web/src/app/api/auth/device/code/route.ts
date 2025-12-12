import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { and, eq, gt } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/lib/database/db';
import { deviceCodes } from '@/lib/database/schema';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

const deviceCodeRequestSchema = z.object({
    deviceName: z.string().min(1).max(100),
    deviceType: z.enum(['tv', 'tablet', 'phone']),
});

/**
 * Generate a 6-character alphanumeric device code
 * Format: XXXXXX (uppercase letters and numbers, avoiding ambiguous characters)
 */
function generateDeviceCode(): string {
    // Use characters that are unambiguous: no O/0, I/1, etc.
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * POST /api/auth/device/code
 * Generate a new device pairing code
 *
 * Request body:
 * {
 *   "deviceName": "Living Room TV",
 *   "deviceType": "tv" | "tablet" | "phone"
 * }
 *
 * Response (201):
 * {
 *   "code": "A8F2K9",
 *   "expiresAt": "2025-12-12T18:30:00.000Z",
 *   "pairingUrl": "http://localhost:3000/pair?code=A8F2K9"
 * }
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const db = await getDb();

        // Parse and validate request body
        const body = await request.json();
        const validated = deviceCodeRequestSchema.parse(body);

        // Generate unique code (retry if collision)
        let code: string;
        let attempts = 0;
        const maxAttempts = 10;

        do {
            code = generateDeviceCode();
            attempts++;

            if (attempts > maxAttempts) {
                return NextResponse.json(
                    { error: 'Failed to generate unique code' },
                    { status: 500 }
                );
            }

            // Check if code already exists and is not expired
            const existing = await db.query.deviceCodes.findFirst({
                where: and(
                    eq(deviceCodes.code, code),
                    gt(deviceCodes.expiresAt, new Date())
                ),
            });

            if (existing === null || existing === undefined) {
                break;
            } // Code is unique
        } while (attempts < maxAttempts);

        // Code expires in 5 minutes
        const expiresAt = new Date(Date.now() + 5 * 60 * 1000);

        // Get client IP and user agent
        const xForwardedFor = request.headers.get('x-forwarded-for');
        const xRealIp = request.headers.get('x-real-ip');
        const ipAddress = xForwardedFor ?? xRealIp ?? 'unknown';
        const userAgent = request.headers.get('user-agent') ?? 'unknown';

        // Insert device code into database
        await db.insert(deviceCodes).values({
            code,
            deviceName: validated.deviceName,
            deviceType: validated.deviceType,
            status: 'pending',
            expiresAt,
            ipAddress,
            userAgent,
        });

        // Build pairing URL
        const host = request.headers.get('host') ?? 'localhost:3000';
        const protocol = request.headers.get('x-forwarded-proto') ?? 'http';
        const pairingUrl = `${protocol}://${host}/pair?code=${code}`;

        return NextResponse.json(
            {
                code,
                expiresAt: expiresAt.toISOString(),
                pairingUrl,
            },
            { status: 201 }
        );
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

        logger.error({ error }, 'Error generating device code');
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
