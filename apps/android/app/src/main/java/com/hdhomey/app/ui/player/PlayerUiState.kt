package com.hdhomey.app.ui.player

/**
 * UI state for the video player screen.
 *
 * Represents all possible states of video playback as a sealed interface
 * so the UI layer can exhaustively handle every state without an `else` branch.
 */
sealed interface PlayerUiState {

    /** Initial state — loading the stream URL and preparing ExoPlayer. */
    data object Loading : PlayerUiState

    /** ExoPlayer is buffering the stream before playback. */
    data object Buffering : PlayerUiState

    /**
     * Video is actively playing.
     *
     * @property isPlaying Whether playback is currently active (not paused)
     */
    data class Playing(val isPlaying: Boolean) : PlayerUiState

    /**
     * An error occurred during stream loading or playback.
     *
     * @property message Human-readable description of what went wrong
     * @property isRetryable Whether showing a retry button makes sense
     */
    data class Error(
        val message: String,
        val isRetryable: Boolean = true
    ) : PlayerUiState
}
