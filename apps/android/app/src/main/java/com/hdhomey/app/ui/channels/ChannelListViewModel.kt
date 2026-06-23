package com.hdhomey.app.ui.channels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hdhomey.app.domain.usecase.GetChannelsUseCase
import com.hdhomey.app.storage.AppPreferences
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for the channel list screen.
 *
 * Orchestrates channel data loading and UI state management.
 * Uses [GetChannelsUseCase] to fetch channels merged with user preferences
 * and exposes the result as a [StateFlow] of [ChannelListUiState] for the
 * fragment to collect.
 *
 * @property getChannelsUseCase Use case that returns channels with preference metadata
 * @property appPreferences Application-scoped preferences (active server, etc.)
 */
@HiltViewModel
class ChannelListViewModel @Inject constructor(
    private val getChannelsUseCase: GetChannelsUseCase,
    private val appPreferences: AppPreferences
) : ViewModel() {

    private val _uiState = MutableStateFlow<ChannelListUiState>(ChannelListUiState.Loading)

    /**
     * Observable UI state for the channel list fragment.
     *
     * Starts as [ChannelListUiState.Loading] and transitions to
     * [ChannelListUiState.Success], [ChannelListUiState.Empty], or
     * [ChannelListUiState.Error] after [loadChannels] completes.
     */
    val uiState: StateFlow<ChannelListUiState> = _uiState.asStateFlow()

    /** Tuner ID used by the most recent [loadChannels] call; used to support [retryLoad]. */
    private var activeTunerId: Int = -1

    /** Display name for the active tuner; populated after a successful load. */
    private var tunerName: String = ""

    /**
     * Load the channel list for the specified tuner.
     *
     * Transitions the state to [ChannelListUiState.Loading] immediately,
     * then to [ChannelListUiState.Success] or [ChannelListUiState.Empty] on success,
     * or [ChannelListUiState.Error] if an exception is thrown.
     *
     * Called when the fragment starts or when retrying after an error.
     *
     * @param tunerId ID of the tuner whose channels should be loaded
     */
    fun loadChannels(tunerId: Int) {
        activeTunerId = tunerId
        _uiState.value = ChannelListUiState.Loading

        viewModelScope.launch {
            try {
                val channels = getChannelsUseCase(tunerId)

                // A full implementation would fetch the tuner display name from the
                // repository; for now we synthesise a human-readable fallback so the
                // toolbar always has something useful to show.
                tunerName = "Tuner $tunerId"

                _uiState.value = if (channels.isEmpty()) {
                    ChannelListUiState.Empty
                } else {
                    ChannelListUiState.Success(
                        channels = channels,
                        tunerName = tunerName
                    )
                }
            } catch (e: Exception) {
                _uiState.value = ChannelListUiState.Error(
                    message = e.message ?: "Failed to load channels"
                )
            }
        }
    }

    /**
     * Retry loading channels after an error.
     *
     * Re-uses the last [activeTunerId] recorded by [loadChannels].
     * No-ops if [loadChannels] has never been called (tunerId <= 0).
     */
    fun retryLoad() {
        if (activeTunerId > 0) {
            loadChannels(activeTunerId)
        }
    }
}
