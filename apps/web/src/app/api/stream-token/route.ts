import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { z } from 'zod';
import { getDb } from '@/lib/database/db';
import { channels, tuners } from '@/lib/database/schema';
import { auth } from '@/lib/auth/auth';
import { generateStreamToken } from '@/lib/stream-token';
import Config from '@/lib/config';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/** Milliseconds per second, for converting to Unix timestamp */
const MS_PER_SECOND = 1000;

const streamTokenRequestSchema = z.object({
    tunerId: z.number().int().positive(),
    channelId: z.number().int().positive(),
});

type ValidatedRequest = z.infer<typeof streamTokenRequestSchema>;

/**
 * Verify that a tuner exists and is not soft-deleted.
 * Returns the tuner record or null if not found.
 */
async function findActiveTuner(tunerId: number) {
    const db = await getDb();
    return await db.query.tuners.findFirst({
        where: and(
            eq(tuners.id, tunerId),
            isNull(tuners.deleted_at)
        ),
    });
}

/**
 * Verify that a channel exists for the given tuner and is not soft-deleted.
 * Returns the channel record or null if not found.
 */
async function findActiveChannel(channelId: number, tunerId: number) {
    const db = await getDb();
    return await db.query.channels.findFirst({
        where: and(
            eq(channels.id, channelId),
            eq(channels.fk_tuner, tunerId),
            isNull(channels.deleted_at)
        ),
    });
}

/**
 * Build the stream token response after validating tuner and channel.
 */
async function buildStreamTokenResponse(validated: ValidatedRequest): Promise<NextResponse> {
    const tuner = await findActiveTuner(validated.tunerId);
    if (tuner === null || tuner === undefined) {
        return NextResponse.json(
            { error: 'Not Found', message: `Tuner ${validated.tunerId} not found` },
            { status: 404 }
        );
    }

    const channel = await findActiveChannel(validated.channelId, validated.tunerId);
    if (channel === null || channel === undefined) {
        return NextResponse.json(
            {
                error: 'Not Found',
                message: `Channel ${validated.channelId} not found on tuner ${validated.tunerId}`
            },
            { status: 404 }
        );
    }

    const token = await generateStreamToken(validated.tunerId, validated.channelId);
    const expiresAt = Math.floor(Date.now() / MS_PER_SECOND) + Config.streamTokenExpiry;

    return NextResponse.json({
        token,
        expiresAt,
        tunerId: validated.tunerId,
        channelId: validated.channelId,
    });
}

/**
 * POST /api/stream-token
 * Generate a short-lived HMAC token for HLS video streaming
 *
 * Request body:
 * {
 *   "tunerId": 1,
 *   "channelId": 5
 * }
 *
 * Response (200):
 * {
 *   "token": "MToxOjE3MzQyMDQ4MDA6YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXow",
 *   "expiresAt": 1734204800,
 *   "tunerId": 1,
 *   "channelId": 5
 * }
 *
 * Token format: base64url(tunerId:channelId:expiresAt:signature)
 * Token expiry: 15 minutes (900 seconds)
 * Signature: HMAC-SHA256(tunerId:channelId:expiresAt, streamSecret).slice(0, 32)
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
    try {
        const session = await auth.api.getSession({
            headers: await import('next/headers').then((mod) => mod.headers()),
        });

        if (session?.user === null || session?.user === undefined) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Valid authentication token required' },
                { status: 401 }
            );
        }

        const body = await request.json();
        const validated = streamTokenRequestSchema.parse(body);

        return await buildStreamTokenResponse(validated);
    } catch (error) {
        if (error instanceof z.ZodError) {
            logger.warn({ issues: error.issues }, 'Stream token request validation failed');
            return NextResponse.json(
                {
                    error: 'Bad Request',
                    message: 'tunerId and channelId must be positive integers',
                    details: error.issues,
                },
                { status: 400 }
            );
        }

        logger.error({ error }, 'Error generating stream token');
        return NextResponse.json(
            { error: 'Internal Server Error', message: 'Failed to generate stream token' },
            { status: 500 }
        );
    }
}
