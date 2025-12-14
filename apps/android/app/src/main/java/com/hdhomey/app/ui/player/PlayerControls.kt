package com.hdhomey.app.ui.player

/**
 * UI model representing the state of video player controls.
 *
 * This data class encapsulates all control-related state that affects
 * the player UI, such as whether controls are visible, playback state,
 * and current position.
 */
data class PlayerControls(
    /**
     * Whether the player controls are currently visible.
     * Controls auto-hide after a timeout period (typically 3 seconds).
     */
    val controlsVisible: Boolean = true,

    /**
     * Whether the video is currently playing.
     * False when paused, preparing, or buffering.
     */
    val isPlaying: Boolean = false,

    /**
     * Current playback position in milliseconds.
     * Used to display and seek within the stream.
     */
    val currentPosition: Long = 0L,

    /**
     * Total duration of the content in milliseconds.
     * For live streams, this is typically the DVR window or C.TIME_UNSET.
     */
    val duration: Long = androidx.media3.common.C.TIME_UNSET,

    /**
     * Whether the stream is a live stream (vs. on-demand content).
     * Affects UI elements like seek bar behavior and duration display.
     */
    val isLiveStream: Boolean = true
) {
    companion object {
        /**
         * Default controls state for initial player setup.
         */
        val Default = PlayerControls()
    }
}
