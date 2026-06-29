package com.hdhomey.app.ui.channels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hdhomey.app.data.provider.CurrentServerProvider
import com.hdhomey.app.data.repository.ChannelRepository
import com.hdhomey.app.domain.usecase.GetChannelsUseCase
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.drop
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
 * The active server is obtained from [CurrentServerProvider] rather than from
 * [AppPreferences] directly, avoiding blocking reads on the API hot path.
 *
 * @property getChannelsUseCase Use case that returns channels with preference metadata.
 * @property channelRepository Repository used to resolve tuner IDs when none is specified.
 * @property currentServerProvider In-memory holder for the currently active server.
 */
@HiltViewModel
class ChannelListViewModel @Inject constructor(
    private val getChannelsUseCase: GetChannelsUseCase,
    private val channelRepository: ChannelRepository,
    private val currentServerProvider: CurrentServerProvider
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

    init {
        // Reactively reload channels when the active server changes.
        // The first emission is skipped because [loadChannels] handles the
        // initial server selection — we only want to react to *subsequent* swaps.
        viewModelScope.launch {
            currentServerProvider.activeServerFlow
                .drop(1) // Skip initial emission (handled by loadChannels)
                .collect { server ->
                    if (server != null && _uiState.value is ChannelListUiState.Success) {
                        // Server changed — reload channels, tuner selection resets
                        loadChannels()
                    }
                }
        }
    }

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
     * @param tunerId ID of the tuner whose channels should be loaded.
     */
    fun loadChannels(tunerId: Int) {
        activeTunerId = tunerId
        _uiState.value = ChannelListUiState.Loading

        viewModelScope.launch {
            try {
                val server = currentServerProvider.getActiveServer()
                if (server == null) {
                    _uiState.value = ChannelListUiState.Error(
                        message = "No server selected. Please select a server first."
                    )
                    return@launch
                }

                val channels = getChannelsUseCase(server, tunerId)

                // Resolve the human-readable tuner name by finding the matching entry
                // in the tuner list. If the tuner is not found (e.g. deleted between
                // calls) we fall back to the synthesised "Tuner N" label so the
                // toolbar always displays something meaningful.
                val tuners = channelRepository.getTuners(server)
                tunerName = tuners.firstOrNull { it.first == tunerId }?.second
                    ?: "Tuner $tunerId"

                // Sort: favorites first, then by channel number
                val sortedChannels = channels.sortedWith(
                    compareByDescending<com.hdhomey.app.domain.model.ChannelWithMetadata> { it.isFavorite }
                        .thenBy { it.channel.number.toDoubleOrNull() ?: 999.0 }
                )

                _uiState.value = if (sortedChannels.isEmpty()) {
                    ChannelListUiState.Empty
                } else {
                    ChannelListUiState.Success(
                        channels = sortedChannels,
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
     * Load channels by auto-detecting the first available tuner.
     *
     * Fetches the list of tuners from the repository and uses the first one.
     * Falls back to [ChannelListUiState.Error] if no tuners are available.
     * Used when the fragment was opened without a specific tuner ID (e.g., from
     * the server list rather than a tuner-specific entry point).
     */
    fun loadChannels() {
        _uiState.value = ChannelListUiState.Loading

        viewModelScope.launch {
            try {
                val server = currentServerProvider.getActiveServer()
                if (server == null) {
                    _uiState.value = ChannelListUiState.Error(
                        message = "No server selected. Please select a server first.",
                        isRetryable = true
                    )
                    return@launch
                }

                val tuners = channelRepository.getTuners(server)
                val firstTuner = tuners.firstOrNull()
                if (firstTuner == null) {
                    _uiState.value = ChannelListUiState.Error(
                        message = "No tuners available. Add an HDHomeRun device first.",
                        isRetryable = true
                    )
                    return@launch
                }
                loadChannels(firstTuner.first)
            } catch (e: Exception) {
                _uiState.value = ChannelListUiState.Error(
                    message = e.message ?: "Failed to discover tuners"
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

    /**
     * Get the URL of the currently active server.
     *
     * Used by [ChannelListFragment] when navigating to [com.hdhomey.app.ui.player.PlayerActivity]
     * to provide the server URL needed for stream URL generation.
     *
     * @return The active server's base URL, or `null` if no server is active.
     */
    fun getActiveServerUrl(): String? {
        return currentServerProvider.getActiveServerUrl()
    }
}
