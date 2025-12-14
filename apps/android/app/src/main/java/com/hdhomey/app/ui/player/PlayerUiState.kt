package com.hdhomey.app.ui.player

/**
 * UI state representation for the video player screen.
 *
 * This sealed interface represents all possible states of the video player,
 * from initial preparation through active playback and error scenarios.
 */
sealed interface PlayerUiState {
    /**
     * Initial state while preparing the stream.
     * Shows a loading indicator and prepares ExoPlayer.
     *
     * @property channelName Name of the channel being loaded (for display)
     */
    data class Preparing(
        val channelName: String
    ) : PlayerUiState

    /**
     * Stream is ready and actively playing.
     * Player controls are visible and interactive.
     *
     * @property channelName Name of the currently playing channel
     * @property controls Current state of the player controls
     */
    data class Playing(
        val channelName: String,
        val controls: PlayerControls
    ) : PlayerUiState

    /**
     * Playback is paused by user action.
     * Stream remains buffered and ready to resume.
     *
     * @property channelName Name of the paused channel
     * @property controls Current state of the player controls
     */
    data class Paused(
        val channelName: String,
        val controls: PlayerControls
    ) : PlayerUiState

    /**
     * Playback is buffering or rebuffering.
     * Shows a loading indicator over the video.
     *
     * @property channelName Name of the channel being buffered
     */
    data class Buffering(
        val channelName: String
    ) : PlayerUiState

    /**
     * An error occurred during stream preparation or playback.
     * Displays error message and optional retry action.
     *
     * @property message User-friendly error message
     * @property isRetryable Whether the user can retry the operation
     */
    data class Error(
        val message: String,
        val isRetryable: Boolean
    ) : PlayerUiState {
        companion object {
            /**
             * Maps exceptions to user-friendly error states.
             *
             * @param throwable The exception that occurred
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
                        403 -> Error(
                            message = "Access denied. You don't have permission to view this channel.",
                            isRetryable = false
                        )
                        404 -> Error(
                            message = "Channel not found. It may have been removed.",
                            isRetryable = false
                        )
                        else -> Error(
                            message = "Server error (${throwable.code()}). Try again later.",
                            isRetryable = true
                        )
                    }
                    else -> Error(
                        message = "An unexpected error occurred: ${throwable.message ?: "Unknown error"}",
                        isRetryable = true
                    )
                }
            }
        }
    }
}
