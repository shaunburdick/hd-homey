import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { and, eq, gt } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/lib/database/db';
import { deviceCodes } from '@/lib/database/schema';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** Maximum device name length */
const MAX_DEVICE_NAME_LENGTH = 100;

/** Length of a generated device code */
const DEVICE_CODE_LENGTH = 6;

/** Maximum attempts to generate a unique code before giving up */
const MAX_CODE_GENERATION_ATTEMPTS = 10;

/** Code expiry duration in minutes */
const CODE_EXPIRY_MINUTES = 5;

/** Milliseconds per minute */
const MS_PER_MINUTE = 60 * 1000;

const deviceCodeRequestSchema = z.object({
    deviceName: z.string().min(1).max(MAX_DEVICE_NAME_LENGTH),
    deviceType: z.enum(['tv', 'tablet', 'phone']),
});

/**
 * Generate a 6-character alphanumeric device code.
 * Uses characters that are unambiguous: no O/0, I/1, etc.
 */
function generateDeviceCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let index = 0; index < DEVICE_CODE_LENGTH; index++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

/**
 * Extract client IP address from request headers.
 * Prefers x-forwarded-for, falls back to x-real-ip, then 'unknown'.
 */
function extractClientIp(request: NextRequest): string {
    const xForwardedFor = request.headers.get('x-forwarded-for');
    const xRealIp = request.headers.get('x-real-ip');
    return xForwardedFor ?? xRealIp ?? 'unknown';
}

/**
 * Attempt to find a unique device code not currently in use.
 * Retries up to MAX_CODE_GENERATION_ATTEMPTS times.
 * Returns null if unable to generate a unique code.
 */
async function findUniqueCode(): Promise<string | null> {
    const db = await getDb();
    let attempts = 0;

    while (attempts < MAX_CODE_GENERATION_ATTEMPTS) {
        const code = generateDeviceCode();
        attempts++;

        const existing = await db.query.deviceCodes.findFirst({
            where: and(
                eq(deviceCodes.code, code),
                gt(deviceCodes.expiresAt, new Date())
            ),
        });

        if (existing === null || existing === undefined) {
            return code;
        }
    }

    return null;
}

interface PersistCodeOptions {
    request: NextRequest;
    code: string;
    validated: z.infer<typeof deviceCodeRequestSchema>;
}

/**
 * Persist the generated device code and build the pairing URL response.
 */
async function persistAndBuildResponse({ request, code, validated }: PersistCodeOptions): Promise<NextResponse> {
    const db = await getDb();
    const expiresAt = new Date(Date.now() + CODE_EXPIRY_MINUTES * MS_PER_MINUTE);
    const ipAddress = extractClientIp(request);
    const userAgent = request.headers.get('user-agent') ?? 'unknown';

    await db.insert(deviceCodes).values({
        code,
        deviceName: validated.deviceName,
        deviceType: validated.deviceType,
        status: 'pending',
        expiresAt,
        ipAddress,
        userAgent,
    });

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
        const body = await request.json();
        logger.info({ body }, 'Device code request body');
        const validated = deviceCodeRequestSchema.parse(body);

        const code = await findUniqueCode();
        if (code === null) {
            return NextResponse.json(
                { error: 'Failed to generate unique code' },
                { status: 500 }
            );
        }

        return await persistAndBuildResponse({ request, code, validated });
    } catch (error) {
        if (error instanceof z.ZodError) {
            logger.error({ error: error.issues }, 'Device code validation error');
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
