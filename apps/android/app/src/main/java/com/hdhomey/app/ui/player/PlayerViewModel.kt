package com.hdhomey.app.ui.player

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.media3.common.MediaItem
import androidx.media3.exoplayer.ExoPlayer
import com.hdhomey.app.domain.usecase.GenerateStreamUrlUseCase
import com.hdhomey.app.player.PlayerEventListener
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for the video player screen.
 *
 * Orchestrates stream URL generation and ExoPlayer lifecycle management.
 * Exposes playback state as a [StateFlow] of [PlayerUiState] for the
 * Activity to collect.
 *
 * @property exoPlayer Application-scoped ExoPlayer singleton from MediaModule
 * @property generateStreamUrlUseCase Use case for requesting HMAC tokens and building HLS URLs
 */
@HiltViewModel
class PlayerViewModel @Inject constructor(
    private val exoPlayer: ExoPlayer,
    private val generateStreamUrlUseCase: GenerateStreamUrlUseCase
) : ViewModel() {

    /**
     * Exposed ExoPlayer instance for use by PlayerActivity.
     *
     * The Activity sets this on its PlayerView so video output and
     * built-in controls work correctly. The ViewModel retains ownership
     * of the player lifecycle (prepare, play, pause, stop).
     */
    val player: ExoPlayer get() = exoPlayer

    private val _uiState = MutableStateFlow<PlayerUiState>(PlayerUiState.Loading)

    /** Listener that translates ExoPlayer events into [PlayerUiState] updates. */
    private var eventListener: PlayerEventListener? = null

    /**
     * Observable UI state for the player activity.
     *
     * Starts as [PlayerUiState.Loading] and transitions based on
     * stream loading and playback events.
     */
    val uiState: StateFlow<PlayerUiState> = _uiState.asStateFlow()

    /** Current tuner ID, used for retry logic. */
    private var currentTunerId: Int = -1

    /** Current channel ID, used for retry logic. */
    private var currentChannelId: Int = -1

    /** Current server URL, used for retry logic. */
    private var currentServerUrl: String = ""

    /**
     * Load a stream for playback: request a token, build the HLS URL,
     * and prepare the ExoPlayer.
     *
     * Transitions the state to [PlayerUiState.Loading] immediately, then to
     * [PlayerUiState.Playing] on success, or [PlayerUiState.Error] if an
     * exception is thrown.
     *
     * @param serverUrl Base URL of the HD Homey server (e.g., "http://192.168.1.100:3000")
     * @param tunerId ID of the tuner
     * @param channelId ID of the channel
     */
    fun loadStream(serverUrl: String, tunerId: Int, channelId: Int) {
        currentServerUrl = serverUrl
        currentTunerId = tunerId
        currentChannelId = channelId

        _uiState.value = PlayerUiState.Loading

        viewModelScope.launch {
            try {
                // Register the event listener before preparing the player;
                // remove any stale listener first to avoid duplicate callbacks on retry
                eventListener?.let { exoPlayer.removeListener(it) }
                PlayerEventListener(_uiState).also {
                    eventListener = it
                    exoPlayer.addListener(it)
                }

                val streamUrl = generateStreamUrlUseCase.generateStreamUrl(
                    serverUrl = serverUrl,
                    tunerId = tunerId,
                    channelId = channelId
                )

                // Build a MediaItem from the HLS URL and prepare ExoPlayer for playback
                val mediaItem = MediaItem.fromUri(streamUrl)
                exoPlayer.setMediaItem(mediaItem)
                exoPlayer.prepare()

                // Note: isPlaying is updated by PlayerEventListener.onIsPlayingChanged
                // after exoPlayer.play() completes asynchronously
                exoPlayer.play()

                // Initial state is Buffering — PlayerEventListener transitions to
                // Playing when ExoPlayer signals STATE_READY
                _uiState.value = PlayerUiState.Buffering
            } catch (e: Exception) {
                _uiState.value = PlayerUiState.Error(
                    message = e.message ?: "Failed to load stream"
                )
            }
        }
    }

    /**
     * Pause or resume playback.
     *
     * Delegates directly to ExoPlayer and then syncs the UI state to
     * reflect the actual player state (in case a race condition means
     * [exoPlayer.isPlaying] disagrees with [play]).
     *
     * @param play true to resume playback, false to pause
     */
    fun playPause(play: Boolean) {
        if (play) {
            exoPlayer.play()
        } else {
            exoPlayer.pause()
        }
        _uiState.value = PlayerUiState.Playing(isPlaying = exoPlayer.isPlaying)
    }

    /**
     * Stop playback and clear the current media item.
     *
     * Should be called when the player activity is destroyed.
     *
     * Note: ExoPlayer is a singleton provided by [com.hdhomey.app.di.MediaModule], so we
     * stop playback but do NOT call [ExoPlayer.release] — that would destroy the singleton
     * and break subsequent playback sessions. Instead, we stop and clear media items so the
     * player is ready for the next [loadStream] call.
     */
    fun releasePlayer() {
        exoPlayer.stop()
        exoPlayer.clearMediaItems()
    }

    /**
     * Retry loading after an error.
     *
     * Re-uses the last [currentServerUrl], [currentTunerId], and [currentChannelId]
     * recorded by [loadStream]. No-ops if [loadStream] has never been called.
     */
    fun retryLoad() {
        if (currentTunerId > 0 && currentChannelId > 0 && currentServerUrl.isNotBlank()) {
            loadStream(currentServerUrl, currentTunerId, currentChannelId)
        }
    }
}
