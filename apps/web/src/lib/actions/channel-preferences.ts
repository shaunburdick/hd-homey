'use server';

import { headers } from 'next/headers';
import { auth } from '@/lib/auth/auth';
import type { DB } from '@/lib/database/db';
import { getDb } from '@/lib/database/db';
import { toggleFavorite, toggleHidden } from '@/lib/preferences/preferences';
import Logger from '@/lib/logger';
import type { UserChannelPreference } from '@/lib/database/schema';

export interface PreferenceActionResult {
    success: boolean;
    preference?: UserChannelPreference | null;
    error?: string;
}

interface AuthenticatedContext {
    success: true;
    userId: string;
    db: DB;
}

interface AuthError {
    success: false;
    error: string;
}

/**
 * Get authenticated user and database connection for preference actions
 *
 * @param channelId - Channel ID for logging
 * @param action - Action name for logging (e.g., "favorite", "hide")
 * @returns Either authenticated context or error result
 */
async function getAuthenticatedContext(
    channelId: number,
    action: string
): Promise<AuthenticatedContext | AuthError> {
    try {
        const session = await auth.api.getSession({
            headers: await headers()
        });

        if (session?.user === null || session?.user === undefined) {
            Logger.warn({ channelId }, `Unauthorized ${action} attempt`);
            return {
                success: false,
                error: `You must be logged in to ${action} channels`,
            };
        }

        const db = await getDb();

        return {
            success: true,
            userId: session.user.id,
            db,
        };
    } catch (error) {
        Logger.error({ channelId, error }, `Failed to authenticate for ${action}`);
        return {
            success: false,
            error: 'Authentication failed. Please try again.',
        };
    }
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
        // Get authenticated context
        const context = await getAuthenticatedContext(channelId, 'favorite');
        if (!context.success) {
            return context;
        }

        const { userId, db } = context;

        // Toggle favorite status
        const preference = toggleFavorite({ db, userId, channelId });

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
        // Get authenticated context
        const context = await getAuthenticatedContext(channelId, 'hide');
        if (!context.success) {
            return context;
        }

        const { userId, db } = context;

        // Toggle hidden status
        const preference = toggleHidden({ db, userId, channelId });

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
