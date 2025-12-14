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

const streamTokenRequestSchema = z.object({
    tunerId: z.number().int().positive(),
    channelId: z.number().int().positive(),
});

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
        // Require authentication
        const session = await auth.api.getSession({
            headers: await import('next/headers').then((mod) => mod.headers()),
        });

        if (session?.user === null || session?.user === undefined) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Valid authentication token required' },
                { status: 401 }
            );
        }

        // Parse and validate request body
        const body = await request.json();
        const validated = streamTokenRequestSchema.parse(body);

        const db = await getDb();

        // Verify tuner exists and is not deleted
        const tuner = await db.query.tuners.findFirst({
            where: and(
                eq(tuners.id, validated.tunerId),
                isNull(tuners.deleted_at)
            ),
        });

        if (tuner === null || tuner === undefined) {
            return NextResponse.json(
                { error: 'Not Found', message: `Tuner ${validated.tunerId} not found` },
                { status: 404 }
            );
        }

        // Verify channel exists for this tuner and is not deleted
        const channel = await db.query.channels.findFirst({
            where: and(
                eq(channels.id, validated.channelId),
                eq(channels.fk_tuner, validated.tunerId),
                isNull(channels.deleted_at)
            ),
        });

        if (channel === null || channel === undefined) {
            return NextResponse.json(
                {
                    error: 'Not Found',
                    message: `Channel ${validated.channelId} not found on tuner ${validated.tunerId}`
                },
                { status: 404 }
            );
        }

        // Generate stream token
        const token = await generateStreamToken(validated.tunerId, validated.channelId);
        // Calculate expiry timestamp (uses Config.streamTokenExpiry)
        const expiresAt = Math.floor(Date.now() / 1000) + Config.streamTokenExpiry;

        return NextResponse.json({
            token,
            expiresAt,
            tunerId: validated.tunerId,
            channelId: validated.channelId,
        });
    } catch (error) {
        if (error instanceof z.ZodError) {
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
