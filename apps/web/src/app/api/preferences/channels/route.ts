import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { and, eq, isNull, or } from 'drizzle-orm';
import { getDb } from '@/lib/database/db';
import { channels, userChannelPreferences } from '@/lib/database/schema';
import { auth } from '@/lib/auth/auth';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/preferences/channels
 * Get channel preferences for the authenticated user
 *
 * Query parameters:
 * - tunerId (optional): Filter preferences by tuner ID
 *
 * Response (200):
 * {
 *   "data": [
 *     {
 *       "channelId": 1,
 *       "tunerId": 1,
 *       "guideNumber": "2.1",
 *       "guideName": "CBS",
 *       "isFavorite": true,
 *       "isHidden": false,
 *       "updatedAt": 1734200000000
 *     }
 *   ]
 * }
 *
 * Only returns channels with explicit preferences (isFavorite=true OR isHidden=true).
 * Channels without preferences are omitted (Android app treats them as neutral).
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
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

        // Get optional tunerId query parameter
        const url = new URL(request.url);
        const tunerIdParam = url.searchParams.get('tunerId');
        const tunerId = tunerIdParam !== null ? parseInt(tunerIdParam, 10) : null;

        // Validate tunerId if provided
        if (tunerId !== null && (isNaN(tunerId) || tunerId <= 0)) {
            return NextResponse.json(
                { error: 'Bad Request', message: 'tunerId must be a positive integer' },
                { status: 400 }
            );
        }

        const db = await getDb();

        // Build WHERE conditions
        const conditions = [
            eq(userChannelPreferences.userId, session.user.id),
            isNull(channels.deleted_at),
            // Only include channels with at least one preference set
            or(
                eq(userChannelPreferences.isFavorite, true),
                eq(userChannelPreferences.isHidden, true)
            ),
        ];

        // Add tunerId filter if provided
        if (tunerId !== null) {
            conditions.push(eq(channels.fk_tuner, tunerId));
        }

        // Join channels with user preferences
        // Only returns channels where user has explicit preferences
        const preferences = await db
            .select({
                channelId: channels.id,
                tunerId: channels.fk_tuner,
                guideNumber: channels.guideNumber,
                guideName: channels.guideName,
                isFavorite: userChannelPreferences.isFavorite,
                isHidden: userChannelPreferences.isHidden,
                updatedAt: userChannelPreferences.updatedAt,
            })
            .from(userChannelPreferences)
            .innerJoin(channels, eq(userChannelPreferences.channelId, channels.id))
            .where(and(...conditions));

        return NextResponse.json({ data: preferences });
    } catch (error) {
        logger.error({ error }, 'Error fetching channel preferences');
        return NextResponse.json(
            { error: 'Internal Server Error', message: 'Failed to retrieve channel preferences' },
            { status: 500 }
        );
    }
}
