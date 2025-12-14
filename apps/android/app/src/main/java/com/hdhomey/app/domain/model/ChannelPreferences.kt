package com.hdhomey.app.domain.model

/**
 * Channel preferences domain entity.
 *
 * User's channel preferences across all tuners (favorites and hidden channels).
 * Stored per-user on the backend and merged with channel data for display.
 *
 * ## Design
 *
 * - Uses [Set] for O(1) lookup performance
 * - Stores channel numbers (not IDs) because they're stable across tuners
 * - Empty state provided via [EMPTY] companion object
 *
 * ## Backend API
 *
 * Fetched from: `GET /api/preferences/channels`
 * **Note**: Backend endpoint NOT YET IMPLEMENTED in Phase 2
 *
 * ## Usage Example
 *
 * ```kotlin
 * val prefs = ChannelPreferences(
 *     favorites = setOf("2.1", "4.1", "7.1"),
 *     hidden = setOf("99.1", "100.5")
 * )
 *
 * prefs.isFavorite("2.1")  // true
 * prefs.isHidden("99.1")   // true
 * prefs.isFavorite("5.1")  // false
 * ```
 *
 * @property favorites Set of favorited channel numbers (e.g., "2.1", "4.1")
 * @property hidden Set of hidden channel numbers (e.g., "99.1", "100.5")
 */
data class ChannelPreferences(
    val favorites: Set<String>,
    val hidden: Set<String>
) {
    /**
     * Check if a channel is marked as favorite.
     *
     * @param channelNumber Channel number to check (e.g., "2.1")
     * @return True if channel is in favorites set
     */
    fun isFavorite(channelNumber: String): Boolean =
        channelNumber in favorites

    /**
     * Check if a channel is marked as hidden.
     *
     * @param channelNumber Channel number to check (e.g., "99.1")
     * @return True if channel is in hidden set
     */
    fun isHidden(channelNumber: String): Boolean =
        channelNumber in hidden

    /**
     * Get count of favorite channels.
     *
     * @return Number of favorited channels
     */
    val favoriteCount: Int
        get() = favorites.size

    /**
     * Get count of hidden channels.
     *
     * @return Number of hidden channels
     */
    val hiddenCount: Int
        get() = hidden.size

    companion object {
        /**
         * Empty preferences state.
         *
         * Use when user has no preferences set or when API call fails.
         * All channels will be treated as neutral (not favorite, not hidden).
         */
        val EMPTY = ChannelPreferences(
            favorites = emptySet(),
            hidden = emptySet()
        )
    }
}
