package com.hdhomey.app.ui.channels

import com.hdhomey.app.ui.channels.model.ChannelUiModel

/**
 * UI state for ChannelListFragment.
 *
 * Represents all possible states of the channel list screen using sealed interface.
 * ViewModel emits this state via StateFlow for Fragment to observe and render.
 *
 * ## State Transitions
 *
 * ```
 * Initial → Loading
 *    ↓
 * Success (with channels)
 *    ↓
 * User selects channel → Navigate to Player
 *    ↓
 * User backs out of player → Refresh (Loading → Success)
 *
 * OR
 *
 * Loading → Error (retry available)
 *    ↓
 * User clicks retry → Loading → Success
 *
 * OR
 *
 * Loading → Empty (no channels found)
 * ```
 *
 * ## Usage in ViewModel
 *
 * ```kotlin
 * class ChannelListViewModel @Inject constructor(
 *     private val getChannelsUseCase: GetChannelsUseCase
 * ) : ViewModel() {
 *     private val _uiState = MutableStateFlow<ChannelListUiState>(Loading)
 *     val uiState: StateFlow<ChannelListUiState> = _uiState.asStateFlow()
 *
 *     fun loadChannels(tunerId: Int) {
 *         viewModelScope.launch {
 *             _uiState.value = Loading
 *             getChannelsUseCase(tunerId)
 *                 .onSuccess { channels ->
 *                     if (channels.isEmpty()) {
 *                         _uiState.value = Empty
 *                     } else {
 *                         _uiState.value = Success(channels, "My Tuner")
 *                     }
 *                 }
 *                 .onFailure { error ->
 *                     _uiState.value = Error(error.message ?: "Unknown error")
 *                 }
 *         }
 *     }
 * }
 * ```
 *
 * ## Usage in Fragment
 *
 * ```kotlin
 * viewLifecycleOwner.lifecycleScope.launch {
 *     viewModel.uiState.collect { state ->
 *         when (state) {
 *             is Loading -> showLoadingSpinner()
 *             is Success -> showChannels(state.channels)
 *             is Error -> showErrorMessage(state.message, state.isRetryable)
 *             is Empty -> showEmptyState()
 *         }
 *     }
 * }
 * ```
 */
sealed interface ChannelListUiState {
    /**
     * Initial state - loading channels from server.
     *
     * Display:
     * - Show loading spinner/progress bar
     * - Disable channel list interaction
     * - Show "Loading channels..." message
     */
    data object Loading : ChannelListUiState

    /**
     * Channels loaded successfully.
     *
     * Display:
     * - Hide loading spinner
     * - Populate RecyclerView with channels
     * - Enable D-pad navigation
     * - Show tuner name in toolbar/header
     *
     * @property channels List of channels with preference flags (favorites, hidden)
     * @property tunerName Display name of the tuner (e.g., "Living Room HDHomeRun")
     */
    data class Success(
        val channels: List<ChannelUiModel>,
        val tunerName: String
    ) : ChannelListUiState {
        /**
         * Count of visible channels (excluding hidden).
         */
        val visibleChannelCount: Int
            get() = channels.count { it.shouldDisplay }

        /**
         * Count of favorite channels.
         */
        val favoriteCount: Int
            get() = channels.count { it.isFavorite }

        /**
         * Check if list has any channels to display.
         */
        val hasChannels: Boolean
            get() = visibleChannelCount > 0
    }

    /**
     * Error occurred while loading channels.
     *
     * Display:
     * - Hide loading spinner
     * - Show error icon and message
     * - Show "Retry" button if retryable
     * - Log error for debugging
     *
     * @property message User-friendly error message
     * @property isRetryable True if user can retry (network error), false if fatal (auth error)
     */
    data class Error(
        val message: String,
        val isRetryable: Boolean = true
    ) : ChannelListUiState {
        companion object {
            /**
             * Create error state from exception.
             *
             * Maps common exceptions to user-friendly messages:
             * - IOException → "Network error. Check your connection."
             * - HttpException (401) → "Session expired. Please sign in again."
             * - HttpException (404) → "Tuner not found."
             * - Other → Generic error with exception message
             *
             * @param throwable Exception that caused the error
             * @return Error state with appropriate message and retry flag
             */
            fun fromThrowable(throwable: Throwable): Error {
                return when (throwable) {
                    is java.io.IOException -> Error(
                        message = "Network error. Check your connection and try again.",
                        isRetryable = true
                    )
                    is retrofit2.HttpException -> when (throwable.code()) {
                        401 -> Error(
                            message = "Session expired. Please sign in again.",
                            isRetryable = false
                        )
                        404 -> Error(
                            message = "Tuner not found. It may have been removed.",
                            isRetryable = false
                        )
                        500, 502, 503 -> Error(
                            message = "Server error. Please try again later.",
                            isRetryable = true
                        )
                        else -> Error(
                            message = "Failed to load channels: ${throwable.message()}",
                            isRetryable = true
                        )
                    }
                    else -> Error(
                        message = throwable.message ?: "An unexpected error occurred",
                        isRetryable = true
                    )
                }
            }
        }
    }

    /**
     * No channels found for tuner.
     *
     * Display:
     * - Hide loading spinner
     * - Show empty state icon and message
     * - Show "No channels found" message
     * - Suggest user to scan for channels in tuner settings
     */
    data object Empty : ChannelListUiState
}
