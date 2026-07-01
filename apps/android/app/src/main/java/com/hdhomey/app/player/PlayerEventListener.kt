package com.hdhomey.app.player

import androidx.media3.common.PlaybackException
import androidx.media3.common.Player
import com.hdhomey.app.ui.player.PlayerUiState
import kotlinx.coroutines.flow.MutableStateFlow

/**
 * ExoPlayer [Player.Listener] that translates playback events into
 * [PlayerUiState] transitions for the ViewModel to expose.
 *
 * This listener handles:
 * - [onPlaybackStateChanged]: Loading → Buffering → Playing state flow
 * - [onPlayerError]: Error state with diagnostics, or decoder-failure fallback
 * - [onIsPlayingChanged]: Play/pause toggle state
 *
 * @param uiState The ViewModel's mutable state flow to update
 * @param onDecoderInitFailed Optional callback invoked when the device cannot decode
 *   the stream format (error code [PlaybackException.ERROR_CODE_DECODER_INIT_FAILED],
 *   e.g., hardware MPEG-2 decoder absent). The ViewModel uses this hook to transparently
 *   fall back to HLS transcoding instead of showing an error to the user.
 *   When `null` no special handling is applied and decoder failures surface as [PlayerUiState.Error].
 */
class PlayerEventListener(
    private val uiState: MutableStateFlow<PlayerUiState>,
    private val onDecoderInitFailed: (() -> Unit)? = null
) : Player.Listener {

    override fun onPlaybackStateChanged(playbackState: Int) {
        when (playbackState) {
            Player.STATE_BUFFERING -> {
                uiState.value = PlayerUiState.Buffering
            }
            Player.STATE_READY -> {
                uiState.value = PlayerUiState.Playing(isPlaying = true)
            }
            Player.STATE_ENDED -> {
                // Stream ended naturally — show a message or restart.
                // For live TV, this shouldn't normally happen. If it does,
                // the user can navigate back.
            }
            Player.STATE_IDLE -> {
                // Initial state or after stop — ViewModel handles this.
            }
        }
    }

    override fun onPlayerError(error: PlaybackException) {
        if (error.errorCode == PlaybackException.ERROR_CODE_DECODER_INIT_FAILED) {
            // Device cannot initialise a decoder for this stream format (e.g., MPEG-2).
            // Invoke the fallback callback so the ViewModel can switch to HLS rather than
            // surfacing an opaque error to the user. If no callback was provided, fall
            // through to the standard error path.
            val callback = onDecoderInitFailed
            if (callback != null) {
                callback()
            } else {
                uiState.value = PlayerUiState.Error(
                    message = error.localizedMessage ?: "Playback error: ${error.errorCodeName}",
                    isRetryable = true
                )
            }
        } else {
            uiState.value = PlayerUiState.Error(
                message = error.localizedMessage ?: "Playback error: ${error.errorCodeName}",
                isRetryable = true
            )
        }
    }

    override fun onIsPlayingChanged(isPlaying: Boolean) {
        val current = uiState.value
        if (current is PlayerUiState.Playing) {
            uiState.value = current.copy(isPlaying = isPlaying)
        }
    }
}
