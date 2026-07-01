package com.hdhomey.app.domain.model

/**
 * Channel with user preference metadata (favourite/hidden status).
 *
 * Combines a base [Channel] entity with the user's personalisation data so
 * the UI layer receives a single, self-contained object for each row in the
 * channel list. Created via [com.hdhomey.app.data.mapper.withMetadata].
 *
 * @property channel The base channel entity
 * @property isFavorite Whether the user has marked this channel as a favourite
 * @property isHidden Whether the user has chosen to hide this channel
 */
data class ChannelWithMetadata(
    val channel: Channel,
    val isFavorite: Boolean = false,
    val isHidden: Boolean = false
) {
    /**
     * Whether this channel should appear in the channel list.
     *
     * Channels hidden by the user are filtered out of the default view but
     * remain accessible when the user explicitly opts-in to show hidden channels.
     */
    val shouldDisplay: Boolean get() = !isHidden
}
