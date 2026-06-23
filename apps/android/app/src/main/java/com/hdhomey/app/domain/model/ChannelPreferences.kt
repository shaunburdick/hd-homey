package com.hdhomey.app.domain.model

/**
 * Channel preferences domain entity.
 *
 * Captures a user's favorite and hidden channel selections for display filtering.
 * Populated from the backend endpoint `GET /api/preferences/channels`. Only channels
 * with explicit preferences are returned by the API; all unlisted channels are neutral
 * (neither favourite nor hidden).
 *
 * @property favorites Set of channel IDs the user has marked as favourite
 * @property hidden Set of channel IDs the user has chosen to hide
 */
data class ChannelPreferences(
    val favorites: Set<Int> = emptySet(),
    val hidden: Set<Int> = emptySet()
) {
    companion object {
        /** Convenience singleton representing a user with no saved preferences. */
        val EMPTY = ChannelPreferences()
    }

    /**
     * Returns true if the given channel has been marked as a favourite.
     *
     * @param channelId Primary key of the channel to check
     */
    fun isFavorite(channelId: Int): Boolean = channelId in favorites

    /**
     * Returns true if the given channel has been hidden by the user.
     *
     * @param channelId Primary key of the channel to check
     */
    fun isHidden(channelId: Int): Boolean = channelId in hidden
}
