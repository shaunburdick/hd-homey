package com.hdhomey.app.ui.player

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.annotation.OptIn
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.hls.HlsMediaSource
import com.hdhomey.app.domain.usecase.GenerateStreamUrlUseCase
import com.hdhomey.app.player.PlayerEventListener
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for the video player screen.
 *
 * Orchestrates stream URL generation and ExoPlayer lifecycle management.
 * Exposes playback state as a [StateFlow] of [PlayerUiState] for the
 * Activity to collect.
 *
 * Streams are loaded via a [HlsMediaSource] backed by a [CacheDataSource] so that
 * previously-fetched HLS segments are served from the on-disk cache rather than
 * re-fetched on transient network interruptions. This significantly improves live-stream
 * resilience on flaky Wi-Fi and cellular connections.
 *
 * @property exoPlayer Application-scoped ExoPlayer singleton from MediaModule
 * @property cacheDataSourceFactory Cache-wrapped data source factory from MediaModule
 * @property generateStreamUrlUseCase Use case for requesting HMAC tokens and building HLS URLs
 */
@OptIn(UnstableApi::class)
@HiltViewModel
class PlayerViewModel @Inject constructor(
    private val exoPlayer: ExoPlayer,
    private val cacheDataSourceFactory: CacheDataSource.Factory,
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

    /** Number of consecutive retry attempts for exponential backoff calculation. */
    private var retryAttempt: Int = 0

    /** Maximum number of retry attempts before giving up. */
    private companion object {
        private const val MAX_RETRY_ATTEMPTS = 3
        private const val BASE_RETRY_DELAY_MS = 1000L
    }

    /**
     * Load a stream for playback: request a token, build the HLS URL,
     * wrap it in a cache-aware [HlsMediaSource], and prepare the ExoPlayer.
     *
     * Transitions the state to [PlayerUiState.Loading] immediately, then to
     * [PlayerUiState.Buffering] after the media source is set, or [PlayerUiState.Error]
     * if an exception is thrown.
     *
     * Using [HlsMediaSource.Factory] with a [CacheDataSource.Factory] means ExoPlayer
     * reads already-downloaded HLS segments from disk before going to the network,
     * reducing re-buffering events on unstable connections.
     *
     * @param serverUrl Base URL of the HD Homey server (e.g., "http://192.168.1.100:3000")
     * @param tunerId ID of the tuner
     * @param channelId ID of the channel
     * @param resetRetry Whether to reset the retry counter to 0. Pass `false` when calling
     *   from [retryLoad] so the accumulated attempt count is preserved for backoff/give-up
     *   logic. Defaults to `true` for normal (non-retry) load requests.
     */
    fun loadStream(serverUrl: String, tunerId: Int, channelId: Int, resetRetry: Boolean = true) {
        currentServerUrl = serverUrl
        currentTunerId = tunerId
        currentChannelId = channelId

        _uiState.value = PlayerUiState.Loading
        if (resetRetry) retryAttempt = 0

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

                // Build an HLS media source backed by the cache data source so that
                // previously-fetched segments are served from disk on replay/retry.
                val mediaSource = HlsMediaSource.Factory(cacheDataSourceFactory)
                    .createMediaSource(MediaItem.fromUri(streamUrl))

                exoPlayer.setMediaSource(mediaSource)
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
     * Removes the [eventListener] before stopping so ExoPlayer does not dispatch
     * callbacks into a ViewModel that is no longer active, preventing memory leaks
     * and spurious state updates after the player has been released.
     *
     * Note: ExoPlayer is a singleton provided by [com.hdhomey.app.di.MediaModule], so we
     * stop playback but do NOT call [ExoPlayer.release] — that would destroy the singleton
     * and break subsequent playback sessions. Instead, we stop and clear media items so the
     * player is ready for the next [loadStream] call.
     */
    fun releasePlayer() {
        eventListener?.let { exoPlayer.removeListener(it) }
        eventListener = null
        exoPlayer.stop()
        exoPlayer.clearMediaItems()
    }

    override fun onCleared() {
        super.onCleared()
        // Safety net: remove the listener if releasePlayer() was not called first
        // (e.g., process death or unexpected ViewModel clearing).
        eventListener?.let { exoPlayer.removeListener(it) }
        eventListener = null
    }

    /**
     * Retry loading the stream with exponential backoff.
     *
     * Maximum [MAX_RETRY_ATTEMPTS] retries with delays of
     * 1s, 2s, and 4s (BASE_RETRY_DELAY_MS * 2^attempt).
     * After exhausting retries, emits an error with a finality message.
     *
     * Passes `resetRetry = false` to [loadStream] so the accumulated attempt counter
     * is preserved — otherwise [loadStream] would unconditionally reset it to zero,
     * making the retry counter useless and producing an infinite retry loop.
     */
    fun retryLoad() {
        if (currentTunerId <= 0 || currentChannelId <= 0 || currentServerUrl.isBlank()) return
        retryAttempt++
        if (retryAttempt >= MAX_RETRY_ATTEMPTS) {
            _uiState.value = PlayerUiState.Error(
                message = "Unable to load stream after $MAX_RETRY_ATTEMPTS attempts. Please try again later.",
                isRetryable = false
            )
            return
        }

        val delayMs = BASE_RETRY_DELAY_MS * (1L shl (retryAttempt - 1))

        _uiState.value = PlayerUiState.Loading

        viewModelScope.launch {
            delay(delayMs)  // Exponential backoff delay
            loadStream(currentServerUrl, currentTunerId, currentChannelId, resetRetry = false)
        }
    }
}
