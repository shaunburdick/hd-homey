import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';
import { and, eq, isNull, or } from 'drizzle-orm';
import type { SQL } from 'drizzle-orm';
import { getDb } from '@/lib/database/db';
import { channels, userChannelPreferences } from '@/lib/database/schema';
import { auth } from '@/lib/auth/auth';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * Parse and validate the optional tunerId query parameter.
 * Returns the numeric ID, null if absent, or a NextResponse error if invalid.
 */
function parseTunerIdParam(
    url: URL
): { tunerId: number | null; error?: never } | { tunerId?: never; error: NextResponse } {
    const tunerIdParam = url.searchParams.get('tunerId');
    if (tunerIdParam === null) {
        return { tunerId: null };
    }

    const tunerId = parseInt(tunerIdParam, 10);
    if (isNaN(tunerId) || tunerId <= 0) {
        return {
            error: NextResponse.json(
                { error: 'Bad Request', message: 'tunerId must be a positive integer' },
                { status: 400 }
            ),
        };
    }

    return { tunerId };
}

/**
 * Build the WHERE conditions for the preference query.
 * Only includes channels where the user has an explicit preference set.
 */
function buildPreferenceConditions(userId: string, tunerId: number | null): SQL[] {
    const conditions: SQL[] = [
        eq(userChannelPreferences.userId, userId),
        isNull(channels.deleted_at),
        or(
            eq(userChannelPreferences.isFavorite, true),
            eq(userChannelPreferences.isHidden, true)
        ) as SQL,
    ];

    if (tunerId !== null) {
        conditions.push(eq(channels.fk_tuner, tunerId));
    }

    return conditions;
}

/**
 * Fetch channel preferences for a user, optionally filtered by tuner.
 */
async function fetchChannelPreferences(userId: string, tunerId: number | null) {
    const db = await getDb();
    const conditions = buildPreferenceConditions(userId, tunerId);

    return await db
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
}

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
        const session = await auth.api.getSession({
            headers: await import('next/headers').then((mod) => mod.headers()),
        });

        if (session?.user === null || session?.user === undefined) {
            return NextResponse.json(
                { error: 'Unauthorized', message: 'Valid authentication token required' },
                { status: 401 }
            );
        }

        const tunerIdResult = parseTunerIdParam(new URL(request.url));
        if (tunerIdResult.error !== undefined) {
            return tunerIdResult.error;
        }

        const preferences = await fetchChannelPreferences(
            session.user.id,
            tunerIdResult.tunerId
        );

        return NextResponse.json({ data: preferences });
    } catch (error) {
        logger.error({ error }, 'Error fetching channel preferences');
        return NextResponse.json(
            { error: 'Internal Server Error', message: 'Failed to retrieve channel preferences' },
            { status: 500 }
        );
    }
}
