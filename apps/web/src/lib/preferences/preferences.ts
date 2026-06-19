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
 * Options for getPreference
 */
export interface GetPreferenceOptions {
    /** Database connection */
    db: DB;
    /** User ID */
    userId: string;
    /** Channel ID */
    channelId: number;
}

/**
 * Get a single channel preference for a user
 *
 * @param options - db, userId, and channelId
 * @returns User channel preference or null if doesn't exist
 */
export function getPreference({
    db,
    userId,
    channelId,
}: GetPreferenceOptions): UserChannelPreference | null {
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
 * Options for upsertPreference
 */
export interface UpsertPreferenceOptions {
    /** Database connection */
    db: DB;
    /** User ID */
    userId: string;
    /** Channel ID */
    channelId: number;
    /** Preference values */
    preference: { isFavorite: boolean; isHidden: boolean };
}

/**
 * Create or update a channel preference
 * Uses INSERT OR REPLACE to handle both create and update
 *
 * @param options - db, userId, channelId, and preference values
 * @returns Updated preference
 * @throws Error if favorite and hidden are both true (database CHECK constraint)
 */
export function upsertPreference({
    db,
    userId,
    channelId,
    preference,
}: UpsertPreferenceOptions): UserChannelPreference {
    // Check for invalid combination before attempting database operation
    if (preference.isFavorite && preference.isHidden) {
        throw new Error('Cannot be both favorite and hidden');
    }

    try {
        // Check if preference exists
        const existing = getPreference({ db, userId, channelId });

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
 * Options for toggleFavorite
 */
export interface TogglePreferenceOptions {
    /** Database connection */
    db: DB;
    /** User ID */
    userId: string;
    /** Channel ID */
    channelId: number;
}

/**
 * Toggle favorite status for a channel
 * Intelligent behavior:
 * - If not favorite → set favorite=true, hidden=false (auto-unhide)
 * - If favorite → set favorite=false
 *
 * @param options - db, userId, and channelId
 * @returns Updated preference
 */
export function toggleFavorite({
    db,
    userId,
    channelId,
}: TogglePreferenceOptions): UserChannelPreference {
    const existing = getPreference({ db, userId, channelId });

    if (existing !== null && existing.isFavorite === true) {
        // Currently favorite → unfavorite (keep hidden state)
        return upsertPreference({ db, userId, channelId, preference: {
            isFavorite: false,
            isHidden: existing.isHidden,
        } });
    } else {
        // Not favorite → favorite (and auto-unhide if needed)
        return upsertPreference({ db, userId, channelId, preference: {
            isFavorite: true,
            isHidden: false,
        } });
    }
}

/**
 * Toggle hidden status for a channel
 * Intelligent behavior:
 * - If not hidden → set hidden=true, favorite=false (auto-unfavorite)
 * - If hidden → set hidden=false
 *
 * @param options - db, userId, and channelId
 * @returns Updated preference
 */
export function toggleHidden({
    db,
    userId,
    channelId,
}: TogglePreferenceOptions): UserChannelPreference {
    const existing = getPreference({ db, userId, channelId });

    if (existing !== null && existing.isHidden === true) {
        // Currently hidden → unhide (keep favorite state)
        return upsertPreference({ db, userId, channelId, preference: {
            isFavorite: existing.isFavorite,
            isHidden: false,
        } });
    } else {
        // Not hidden → hide (and auto-unfavorite if needed)
        return upsertPreference({ db, userId, channelId, preference: {
            isFavorite: false,
            isHidden: true,
        } });
    }
}
