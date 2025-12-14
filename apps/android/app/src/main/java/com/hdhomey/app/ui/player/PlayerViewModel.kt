package com.hdhomey.app.ui.player

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hdhomey.app.domain.model.StreamToken
import com.hdhomey.app.domain.usecase.GenerateStreamUrlUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.Job
import kotlinx.coroutines.delay
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for the video player screen.
 *
 * Manages stream URL generation, token refresh, and playback state.
 * Coordinates between the domain layer (use cases) and UI layer (Activity).
 *
 * Note: ExoPlayer is managed by the Activity, not the ViewModel, because
 * ExoPlayer is Activity-scoped in Hilt and ViewModels should not depend on
 * Activity-scoped dependencies. The ViewModel provides stream URLs and the
 * Activity sets them on the player.
 *
 * @property generateStreamUrlUseCase Use case for generating authenticated stream URLs
 */
@HiltViewModel
class PlayerViewModel @Inject constructor(
    private val generateStreamUrlUseCase: GenerateStreamUrlUseCase
) : ViewModel() {

    // UI State
    private val _uiState = MutableStateFlow<PlayerUiState>(
        PlayerUiState.Preparing(channelName = "")
    )
    val uiState: StateFlow<PlayerUiState> = _uiState.asStateFlow()

    // Navigation Events
    private val _navigationEvents = MutableSharedFlow<PlayerNavigation>()
    val navigationEvents: SharedFlow<PlayerNavigation> = _navigationEvents.asSharedFlow()

    // Stream URL events (emitted when URL is ready for player)
    private val _streamUrlEvents = MutableSharedFlow<String>()
    val streamUrlEvents: SharedFlow<String> = _streamUrlEvents.asSharedFlow()

    // Internal state
    private var currentStreamToken: StreamToken? = null
    private var tokenRefreshJob: Job? = null
    private var currentTunerId: Int? = null
    private var currentChannelId: Int? = null
    private var currentServerUrl: String? = null
    private var currentChannelName: String = ""

    /**
     * Loads and starts playing a channel stream.
     *
     * Generates a stream URL with authentication token and emits it via streamUrlEvents.
     * The Activity should collect this event and set the URL on ExoPlayer.
     *
     * @param tunerId HDHomeRun tuner ID (database primary key)
     * @param channelId Channel ID (database primary key)
     * @param channelName Display name of the channel
     * @param serverUrl Base URL of the HD Homey server
     */
    fun loadStream(tunerId: Int, channelId: Int, channelName: String, serverUrl: String) {
        // Store parameters for token refresh
        currentTunerId = tunerId
        currentChannelId = channelId
        currentServerUrl = serverUrl
        currentChannelName = channelName

        _uiState.value = PlayerUiState.Preparing(channelName)

        viewModelScope.launch {
            try {
                // Generate stream token
                val result = generateStreamUrlUseCase(serverUrl, tunerId, channelId)
                result.fold(
                    onSuccess = { streamUrl ->
                        // Emit stream URL for Activity to set on player
                        _streamUrlEvents.emit(streamUrl)

                        // Update state to playing (Activity will manage actual player state)
                        _uiState.value = PlayerUiState.Playing(
                            channelName = channelName,
                            controls = PlayerControls.Default.copy(isPlaying = true)
                        )

                        // Schedule token refresh (every 10 minutes, token expires at 15min)
                        scheduleTokenRefresh()
                    },
                    onFailure = { error ->
                        handleStreamError(error)
                    }
                )
            } catch (e: Exception) {
                handleStreamError(e)
            }
        }
    }

    /**
     * Schedules automatic token refresh to prevent expiration during playback.
     * Tokens expire after 15 minutes, so we refresh every 10 minutes.
     */
    private fun scheduleTokenRefresh() {
        tokenRefreshJob?.cancel()
        tokenRefreshJob = viewModelScope.launch {
            // Refresh every 10 minutes (600,000ms)
            // Token expires at 15 minutes, so this provides 5min buffer
            delay(600_000)
            refreshToken()
        }
    }

    /**
     * Refreshes the stream token and emits new URL for player update.
     * Called automatically every 10 minutes during playback.
     */
    private suspend fun refreshToken() {
        val tunerId = currentTunerId ?: return
        val channelId = currentChannelId ?: return
        val serverUrl = currentServerUrl ?: return

        try {
            val result = generateStreamUrlUseCase(serverUrl, tunerId, channelId)
            result.fold(
                onSuccess = { newStreamUrl ->
                    // Emit new stream URL for Activity to update player
                    _streamUrlEvents.emit(newStreamUrl)

                    // Schedule next refresh
                    scheduleTokenRefresh()
                },
                onFailure = { error ->
                    // Token refresh failed - show error but don't stop playback
                    // User can continue watching until current token expires
                    viewModelScope.launch {
                        _navigationEvents.emit(
                            PlayerNavigation.ShowError("Token refresh failed. Stream may stop soon.")
                        )
                    }
                }
            )
        } catch (e: Exception) {
            // Silent failure - current stream will continue until token expires
            viewModelScope.launch {
                _navigationEvents.emit(
                    PlayerNavigation.ShowError("Token refresh error. Stream may stop soon.")
                )
            }
        }
    }

    /**
     * Handles back button press.
     * Stops token refresh and navigates back to channel list.
     */
    fun onBackPressed() {
        tokenRefreshJob?.cancel()
        viewModelScope.launch {
            _navigationEvents.emit(PlayerNavigation.NavigateBack)
        }
    }

    /**
     * Updates UI state based on playback state changes from Activity.
     *
     * @param isPlaying Whether playback is active
     */
    fun updatePlaybackState(isPlaying: Boolean) {
        val currentState = _uiState.value
        if (currentState is PlayerUiState.Playing || currentState is PlayerUiState.Paused) {
            _uiState.value = if (isPlaying) {
                PlayerUiState.Playing(
                    channelName = currentChannelName,
                    controls = PlayerControls.Default.copy(isPlaying = true)
                )
            } else {
                PlayerUiState.Paused(
                    channelName = currentChannelName,
                    controls = PlayerControls.Default.copy(isPlaying = false)
                )
            }
        }
    }

    /**
     * Updates UI state to buffering.
     */
    fun onBuffering() {
        _uiState.value = PlayerUiState.Buffering(currentChannelName)
    }

    /**
     * Handles playback errors from Activity/ExoPlayer.
     *
     * @param errorMessage Error message from ExoPlayer
     */
    fun onPlaybackError(errorMessage: String) {
        _uiState.value = PlayerUiState.Error(
            message = errorMessage,
            isRetryable = true
        )
    }

    /**
     * Retries loading the stream after an error.
     * Only applicable for retryable errors (network issues).
     */
    fun retry() {
        val tunerId = currentTunerId ?: return
        val channelId = currentChannelId ?: return
        val serverUrl = currentServerUrl ?: return
        val channelName = currentChannelName

        loadStream(tunerId, channelId, channelName, serverUrl)
    }

    /**
     * Handles errors during stream loading.
     *
     * @param error The exception that occurred
     */
    private fun handleStreamError(error: Throwable) {
        val errorState = PlayerUiState.Error.fromThrowable(error)
        _uiState.value = errorState

        // Emit session expired navigation for 401/403 errors
        if (error is retrofit2.HttpException && (error.code() == 401 || error.code() == 403)) {
            viewModelScope.launch {
                _navigationEvents.emit(PlayerNavigation.SessionExpired)
            }
        }
    }

    /**
     * Cancels token refresh when ViewModel is cleared.
     */
    override fun onCleared() {
        super.onCleared()
        tokenRefreshJob?.cancel()
    }
}
