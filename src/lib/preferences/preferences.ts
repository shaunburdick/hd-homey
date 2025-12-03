/**
 * Core business logic for User Channel Preferences (SPEC-012)
 * Handles favorite and hidden channel preferences with intelligent state transitions
 */

import { eq, and } from 'drizzle-orm';
import { userChannelPreferences } from '@/lib/database/schema';
import type { DB } from '@/lib/database/db';
import type { UserChannelPreference } from '@/lib/database/schema';
import Logger from '@/lib/logger';

/**
 * Get all channel preferences for a user
 * Returns only preferences that exist (doesn't include channels with no preference)
 *
 * @param db Database connection
 * @param userId User ID
 * @returns Array of user channel preferences
 */
export function getUserChannelPreferences(
    db: DB,
    userId: string
): UserChannelPreference[] {
    return db
        .select()
        .from(userChannelPreferences)
        .where(eq(userChannelPreferences.userId, userId))
        .all();
}

/**
 * Get a single channel preference for a user
 *
 * @param db Database connection
 * @param userId User ID
 * @param channelId Channel ID
 * @returns User channel preference or null if doesn't exist
 */
export function getPreference(
    db: DB,
    userId: string,
    channelId: number
): UserChannelPreference | null {
    const result = db
        .select()
        .from(userChannelPreferences)
        .where(
            and(
                eq(userChannelPreferences.userId, userId),
                eq(userChannelPreferences.channelId, channelId)
            )
        )
        .get();

    return result ?? null;
}

/**
 * Create or update a channel preference
 * Uses INSERT OR REPLACE to handle both create and update
 *
 * @param db Database connection
 * @param userId User ID
 * @param channelId Channel ID
 * @param preference Preference values (isFavorite and/or isHidden)
 * @returns Updated preference
 * @throws Error if favorite and hidden are both true (database CHECK constraint)
 */
export function upsertPreference(
    db: DB,
    userId: string,
    channelId: number,
    preference: { isFavorite: boolean; isHidden: boolean }
): UserChannelPreference {
    // Check for invalid combination before attempting database operation
    if (preference.isFavorite && preference.isHidden) {
        throw new Error('Cannot be both favorite and hidden');
    }

    try {
        // Check if preference exists
        const existing = getPreference(db, userId, channelId);

        if (existing !== null) {
            // Update existing preference
            const [updated] = db
                .update(userChannelPreferences)
                .set({
                    isFavorite: preference.isFavorite,
                    isHidden: preference.isHidden,
                    updatedAt: new Date(),
                })
                .where(
                    and(
                        eq(userChannelPreferences.userId, userId),
                        eq(userChannelPreferences.channelId, channelId)
                    )
                )
                .returning()
                .all();

            return updated;
        } else {
            // Create new preference
            const [created] = db
                .insert(userChannelPreferences)
                .values({
                    userId,
                    channelId,
                    isFavorite: preference.isFavorite,
                    isHidden: preference.isHidden,
                })
                .returning()
                .all();

            return created;
        }
    } catch (error) {
        Logger.error({ userId, channelId, preference, error }, 'Failed to upsert channel preference');
        throw error;
    }
}

/**
 * Toggle favorite status for a channel
 * Intelligent behavior:
 * - If not favorite → set favorite=true, hidden=false (auto-unhide)
 * - If favorite → set favorite=false
 *
 * @param db Database connection
 * @param userId User ID
 * @param channelId Channel ID
 * @returns Updated preference
 */
export function toggleFavorite(
    db: DB,
    userId: string,
    channelId: number
): UserChannelPreference {
    const existing = getPreference(db, userId, channelId);

    if (existing !== null && existing.isFavorite === true) {
        // Currently favorite → unfavorite (keep hidden state)
        return upsertPreference(db, userId, channelId, {
            isFavorite: false,
            isHidden: existing.isHidden,
        });
    } else {
        // Not favorite → favorite (and auto-unhide if needed)
        return upsertPreference(db, userId, channelId, {
            isFavorite: true,
            isHidden: false,
        });
    }
}

/**
 * Toggle hidden status for a channel
 * Intelligent behavior:
 * - If not hidden → set hidden=true, favorite=false (auto-unfavorite)
 * - If hidden → set hidden=false
 *
 * @param db Database connection
 * @param userId User ID
 * @param channelId Channel ID
 * @returns Updated preference
 */
export function toggleHidden(
    db: DB,
    userId: string,
    channelId: number
): UserChannelPreference {
    const existing = getPreference(db, userId, channelId);

    if (existing !== null && existing.isHidden === true) {
        // Currently hidden → unhide (keep favorite state)
        return upsertPreference(db, userId, channelId, {
            isFavorite: existing.isFavorite,
            isHidden: false,
        });
    } else {
        // Not hidden → hide (and auto-unfavorite if needed)
        return upsertPreference(db, userId, channelId, {
            isFavorite: false,
            isHidden: true,
        });
    }
}
