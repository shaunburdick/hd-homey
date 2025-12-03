'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth/auth';
import { getDb } from '@/lib/database/db';
import { toggleFavorite, toggleHidden } from '@/lib/preferences/preferences';
import Logger from '@/lib/logger';
import type { UserChannelPreference } from '@/lib/database/schema';

export interface PreferenceActionResult {
    success: boolean;
    preference?: UserChannelPreference | null;
    error?: string;
}

/**
 * Toggle favorite status for a channel
 *
 * Favoriting a hidden channel will automatically unhide it.
 * Returns the updated preference state.
 *
 * @param channelId - The channel ID to toggle favorite status for
 * @returns Result object with success status and updated preference
 */
export async function toggleFavoriteAction(
    channelId: number
): Promise<PreferenceActionResult> {
    try {
        // Get authenticated session
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (session?.user === null || session?.user === undefined) {
            Logger.warn({ channelId }, 'Unauthorized favorite toggle attempt');
            return {
                success: false,
                error: 'You must be logged in to favorite channels',
            };
        }

        const userId = session.user.id;
        const db = await getDb();

        // Toggle favorite status
        const preference = toggleFavorite(db, userId, channelId);

        Logger.info(
            { userId, channelId, isFavorite: preference.isFavorite },
            'Channel favorite status toggled'
        );

        return {
            success: true,
            preference,
        };
    } catch (error) {
        Logger.error({ channelId, error }, 'Failed to toggle favorite status');
        return {
            success: false,
            error: 'Failed to update favorite status. Please try again.',
        };
    }
}

/**
 * Toggle hidden status for a channel
 *
 * Hiding a favorited channel will automatically unfavorite it.
 * Returns the updated preference state.
 *
 * @param channelId - The channel ID to toggle hidden status for
 * @returns Result object with success status and updated preference
 */
export async function toggleHiddenAction(
    channelId: number
): Promise<PreferenceActionResult> {
    try {
        // Get authenticated session
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (session?.user === null || session?.user === undefined) {
            Logger.warn({ channelId }, 'Unauthorized hide toggle attempt');
            return {
                success: false,
                error: 'You must be logged in to hide channels',
            };
        }

        const userId = session.user.id;
        const db = await getDb();

        // Toggle hidden status
        const preference = toggleHidden(db, userId, channelId);

        Logger.info(
            { userId, channelId, isHidden: preference.isHidden },
            'Channel hidden status toggled'
        );

        return {
            success: true,
            preference,
        };
    } catch (error) {
        Logger.error({ channelId, error }, 'Failed to toggle hidden status');
        return {
            success: false,
            error: 'Failed to update hidden status. Please try again.',
        };
    }
}
