package com.hdhomey.app.ui.channels

import com.hdhomey.app.domain.model.ChannelWithMetadata

/**
 * UI state for ChannelListFragment.
 *
 * Represents all possible states of the channel list screen as a sealed
 * interface so the UI layer can exhaustively handle every state without
 * an `else` branch.
 */
sealed interface ChannelListUiState {

    /** Initial state — loading channels from server. */
    data object Loading : ChannelListUiState

    /**
     * Channels loaded successfully.
     *
     * @property channels Ordered list of channels with user preference metadata
     * @property tunerName Human-readable label for the tuner shown in the toolbar
     */
    data class Success(
        val channels: List<ChannelWithMetadata>,
        val tunerName: String
    ) : ChannelListUiState

    /**
     * Error occurred while loading channels.
     *
     * @property message Human-readable description of what went wrong
     * @property isRetryable Whether showing a retry button makes sense (default true)
     */
    data class Error(
        val message: String,
        val isRetryable: Boolean = true
    ) : ChannelListUiState

    /** No channels found for this tuner. */
    data object Empty : ChannelListUiState
}
