package com.hdhomey.app.ui.channels.model

import com.hdhomey.app.domain.model.Channel

/**
 * Channel UI model with user preferences.
 *
 * Combines channel data with user-specific state (favorites, hidden)
 * for display in the channel list RecyclerView.
 *
 * ## Design Rationale
 *
 * - Separates domain model ([Channel]) from UI concerns
 * - Includes computed properties for display logic
 * - Provides sorting priority (favorites first)
 * - Determines visibility (hidden channels filtered out)
 *
 * ## Usage in RecyclerView Adapter
 *
 * ```kotlin
 * class ChannelAdapter : RecyclerView.Adapter<ChannelViewHolder>() {
 *     private var channels: List<ChannelUiModel> = emptyList()
 *
 *     fun submitList(newChannels: List<ChannelUiModel>) {
 *         channels = newChannels
 *             .filter { it.shouldDisplay } // Remove hidden
 *             .sortedBy { it.displayPriority } // Favorites first
 *         notifyDataSetChanged()
 *     }
 *
 *     override fun onBindViewHolder(holder: ChannelViewHolder, position: Int) {
 *         val uiModel = channels[position]
 *         holder.bind(
 *             channelName = uiModel.channel.displayName,
 *             showFavoriteIcon = uiModel.isFavorite,
 *             isHd = uiModel.channel.isHd
 *         )
 *     }
 * }
 * ```
 *
 * ## Sorting and Filtering
 *
 * Use [displayPriority] for sorting and [shouldDisplay] for filtering:
 *
 * ```kotlin
 * val visibleChannels = channels
 *     .filter { it.shouldDisplay }
 *     .sortedWith(
 *         compareBy<ChannelUiModel> { it.displayPriority }
 *             .thenBy { it.channel.sortKey }
 *     )
 * ```
 *
 * Result: Favorites (2.1, 4.1, 7.1) → All others (10.1, 13.1, ...) → Hidden excluded
 *
 * @property channel Domain channel entity with core data
 * @property isFavorite True if user marked this channel as favorite
 * @property isHidden True if user marked this channel as hidden (don't display)
 */
data class ChannelUiModel(
    val channel: Channel,
    val isFavorite: Boolean = false,
    val isHidden: Boolean = false
) {
    /**
     * Determine if channel should be displayed in list.
     *
     * Hidden channels are filtered out from the UI.
     *
     * @return False if hidden, true otherwise
     */
    val shouldDisplay: Boolean
        get() = !isHidden

    /**
     * Get display priority for sorting.
     *
     * Priority levels:
     * - 0: Favorite channels (show first)
     * - 1: Regular channels (show after favorites)
     *
     * Use with [channel.sortKey] for complete sorting:
     * ```kotlin
     * channels.sortedWith(
     *     compareBy<ChannelUiModel> { it.displayPriority }
     *         .thenBy { it.channel.sortKey }
     * )
     * ```
     *
     * @return 0 for favorites, 1 for regular channels
     */
    val displayPriority: Int
        get() = when {
            isFavorite -> 0 // Show first
            else -> 1 // Show after favorites
        }

    /**
     * Get accessibility description for screen readers.
     *
     * Examples:
     * - "2.1 CBS, HD, Favorite"
     * - "4.1 NBC, HD"
     * - "7.1 ABC, Standard Definition"
     *
     * @return Formatted accessibility description
     */
    val contentDescription: String
        get() = buildString {
            append(channel.displayName)
            append(if (channel.isHd) ", HD" else ", Standard Definition")
            if (isFavorite) append(", Favorite")
        }
}

/**
 * Extension function to merge channels with preferences.
 *
 * Combines domain channel list with user preferences to create UI models.
 *
 * @receiver List of domain channels
 * @param favorites Set of favorite channel numbers
 * @param hidden Set of hidden channel numbers
 * @return List of ChannelUiModels with preference flags applied
 */
fun List<Channel>.toUiModels(
    favorites: Set<String>,
    hidden: Set<String>
): List<ChannelUiModel> = map { channel ->
    ChannelUiModel(
        channel = channel,
        isFavorite = channel.number in favorites,
        isHidden = channel.number in hidden
    )
}

/**
 * Extension function to sort and filter channels for display.
 *
 * Applies standard display logic:
 * 1. Filter out hidden channels
 * 2. Sort favorites first
 * 3. Within each group, sort by channel number
 *
 * @receiver List of ChannelUiModels
 * @return Sorted and filtered list ready for RecyclerView
 */
fun List<ChannelUiModel>.sortedForDisplay(): List<ChannelUiModel> =
    filter { it.shouldDisplay }
        .sortedWith(
            compareBy<ChannelUiModel> { it.displayPriority }
                .thenBy { it.channel.sortKey }
        )
