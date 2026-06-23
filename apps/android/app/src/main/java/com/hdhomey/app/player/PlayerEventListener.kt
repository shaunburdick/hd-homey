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
 * - [onPlayerError]: Error state with diagnostics
 * - [onIsPlayingChanged]: Play/pause toggle state
 *
 * @param uiState The ViewModel's mutable state flow to update
 */
class PlayerEventListener(
    private val uiState: MutableStateFlow<PlayerUiState>
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
        uiState.value = PlayerUiState.Error(
            message = error.localizedMessage ?: "Playback error: ${error.errorCodeName}",
            isRetryable = true
        )
    }

    override fun onIsPlayingChanged(isPlaying: Boolean) {
        val current = uiState.value
        if (current is PlayerUiState.Playing) {
            uiState.value = current.copy(isPlaying = isPlaying)
        }
    }
}
