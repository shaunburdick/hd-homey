package com.hdhomey.app.ui.player

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import androidx.annotation.OptIn
import androidx.media3.common.MediaItem
import androidx.media3.common.util.UnstableApi
import androidx.media3.datasource.cache.CacheDataSource
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.hls.HlsMediaSource
import com.hdhomey.app.data.provider.CurrentServerProvider
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
 * ## Stream Strategy: Try Raw MPEG-TS First, Fall Back to HLS
 *
 * [loadStream] always attempts the raw MPEG-TS proxy stream first:
 *
 * 1. **Raw MPEG-TS** (`/tuners/{id}/channel/{id}/stream?token=…`) — no transcoding,
 *    ~1-2 s start-up latency, original quality. Requires a hardware MPEG-2 decoder on
 *    the Android device. Most modern Android TVs and flagship phones include one; mid-range
 *    phones and some tablets may not.
 *
 * 2. **HLS transcoded** (`/api/transcode/{id}/{id}/playlist.m3u8?token=…`) — FFmpeg on the
 *    server converts MPEG-2 to H.264/AAC before delivery. ~6-10 s start-up latency but
 *    universally compatible and cache-backed for resilience on flaky networks.
 *
 * A single HMAC token is requested once and reused for both URLs so the fallback transition
 * is instantaneous with no extra round-trip.
 *
 * If ExoPlayer raises [androidx.media3.common.PlaybackException.ERROR_CODE_DECODER_INIT_FAILED]
 * during raw playback, [PlayerEventListener] fires the `onDecoderInitFailed` callback and
 * [fallbackToHls] seamlessly switches to the HLS source — the user never sees an error.
 *
 * The active server is obtained from [CurrentServerProvider] — the [serverUrl] passed into
 * [loadStream] is used for URL building, while the full [Server] object (with JWT) is retrieved
 * from the provider for API calls.
 *
 * @property exoPlayer Application-scoped ExoPlayer singleton from MediaModule.
 * @property cacheDataSourceFactory Cache-wrapped data source factory from MediaModule.
 * @property generateStreamUrlUseCase Use case for requesting HMAC tokens and building stream URLs.
 * @property currentServerProvider In-memory holder for the currently active server.
 */
@OptIn(UnstableApi::class)
@HiltViewModel
class PlayerViewModel @Inject constructor(
    private val exoPlayer: ExoPlayer,
    private val cacheDataSourceFactory: CacheDataSource.Factory,
    private val generateStreamUrlUseCase: GenerateStreamUrlUseCase,
    private val currentServerProvider: CurrentServerProvider
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

    /** Tracks which stream type is currently active, used for diagnostics and retry decisions. */
    private enum class StreamMode { RAW, HLS }
    private var streamMode: StreamMode = StreamMode.RAW

    /** Maximum number of retry attempts before giving up. */
    private companion object {
        private const val MAX_RETRY_ATTEMPTS = 3
        private const val BASE_RETRY_DELAY_MS = 1000L
    }

    /**
     * Load a stream for playback using the try-raw-then-HLS strategy.
     *
     * 1. Requests a single HMAC token valid for both stream types.
     * 2. Builds both the raw MPEG-TS URL and the HLS URL from that token.
     * 3. Starts playback via the raw MPEG-TS proxy (lower latency, original quality).
     * 4. If ExoPlayer fires [androidx.media3.common.PlaybackException.ERROR_CODE_DECODER_INIT_FAILED],
     *    [fallbackToHls] is called transparently — the user never sees an error.
     *
     * Transitions the state to [PlayerUiState.Loading] immediately, then to
     * [PlayerUiState.Buffering] after the media source is set, or [PlayerUiState.Error]
     * if an exception is thrown before playback starts.
     *
     * @param serverUrl Base URL of the HD Homey server (e.g., "http://192.168.1.100:3000").
     * @param tunerId ID of the tuner.
     * @param channelId ID of the channel.
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
                // Remove any stale listener to avoid duplicate callbacks on retry
                eventListener?.let { exoPlayer.removeListener(it) }

                // Retrieve the active server (with JWT) from CurrentServerProvider
                val server = currentServerProvider.getActiveServer()
                if (server == null) {
                    _uiState.value = PlayerUiState.Error(
                        message = "No server selected."
                    )
                    return@launch
                }

                // Request ONE token reusable for both stream types — avoids two round-trips
                val streamToken = generateStreamUrlUseCase(server, tunerId, channelId)
                val hlsUrl = generateStreamUrlUseCase.buildStreamUrl(serverUrl, tunerId, channelId, streamToken)
                val rawUrl = generateStreamUrlUseCase.buildRawStreamUrl(serverUrl, tunerId, channelId, streamToken)

                // Attempt raw MPEG-TS first; fall back to HLS on decoder init failure
                streamMode = StreamMode.RAW
                tryRawStream(rawUrl, hlsUrl)
            } catch (e: Exception) {
                _uiState.value = PlayerUiState.Error(
                    message = e.message ?: "Failed to load stream"
                )
            }
        }
    }

    /**
     * Start playback with the raw MPEG-TS proxy stream.
     *
     * Registers a [PlayerEventListener] with [onDecoderInitFailed] wired to [fallbackToHls].
     * If the device's hardware decoder cannot handle MPEG-2, [fallbackToHls] is invoked
     * seamlessly — no error is shown to the user.
     *
     * Raw streams use a plain [MediaItem] (no cache wrapper) because:
     * - The raw stream is a continuous live pipe — there are no discrete segments to cache.
     * - We want the decoder-failure signal to arrive quickly; a cache layer could delay it.
     *
     * @param rawUrl Full raw MPEG-TS proxy URL.
     * @param hlsUrl Full HLS playlist URL (passed through to [fallbackToHls] if needed).
     */
    private fun tryRawStream(rawUrl: String, hlsUrl: String) {
        PlayerEventListener(_uiState, onDecoderInitFailed = {
            // MPEG-2 not supported on this device — switch to HLS transparently
            fallbackToHls(hlsUrl)
        }).also {
            eventListener = it
            exoPlayer.addListener(it)
        }

        // Plain MediaItem — no cache wrapper for the raw stream probe
        exoPlayer.setMediaItem(MediaItem.fromUri(rawUrl))
        exoPlayer.prepare()
        exoPlayer.play()
        _uiState.value = PlayerUiState.Buffering
    }

    /**
     * Switch to HLS transcoded playback after a decoder-init failure on the raw stream.
     *
     * Removes the decoder-failure-aware listener, replaces the media source with a
     * cache-backed [HlsMediaSource], and resumes playback. Called only from the
     * `onDecoderInitFailed` callback in [tryRawStream].
     *
     * Using [HlsMediaSource.Factory] with [cacheDataSourceFactory] means previously-fetched
     * HLS segments are served from disk on replay/retry, reducing re-buffering events on
     * flaky connections.
     *
     * @param hlsUrl Full HLS playlist URL built from the same token as the raw URL.
     */
    private fun fallbackToHls(hlsUrl: String) {
        streamMode = StreamMode.HLS

        // Replace listener — new one has no fallback callback (we're already on HLS)
        eventListener?.let { exoPlayer.removeListener(it) }
        PlayerEventListener(_uiState).also {
            eventListener = it
            exoPlayer.addListener(it)
        }

        // Stop and clear before switching media source to avoid player state conflicts
        exoPlayer.stop()
        exoPlayer.clearMediaItems()

        // HLS source with on-disk cache for segment reuse on replay / transient errors
        val mediaSource = HlsMediaSource.Factory(cacheDataSourceFactory)
            .createMediaSource(MediaItem.fromUri(hlsUrl))
        exoPlayer.setMediaSource(mediaSource)
        exoPlayer.prepare()
        exoPlayer.play()
        _uiState.value = PlayerUiState.Buffering
    }

    /**
     * Pause or resume playback.
     *
     * Delegates directly to ExoPlayer and then syncs the UI state to
     * reflect the actual player state (in case a race condition means
     * [exoPlayer.isPlaying] disagrees with [play]).
     *
     * @param play true to resume playback, false to pause.
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
     *
     * Note: each retry goes through [loadStream] which will again try raw MPEG-TS first.
     * If the device could not decode raw the first time it will immediately fall back to HLS
     * again without any user-visible flicker.
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
