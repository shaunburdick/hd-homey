package com.hdhomey.app.ui.channels

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.hdhomey.app.domain.model.Channel
import com.hdhomey.app.domain.usecase.GetChannelPreferencesUseCase
import com.hdhomey.app.domain.usecase.GetChannelsUseCase
import com.hdhomey.app.ui.channels.model.sortedForDisplay
import com.hdhomey.app.ui.channels.model.toUiModels
import dagger.hilt.android.lifecycle.HiltViewModel
import kotlinx.coroutines.flow.MutableSharedFlow
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharedFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asSharedFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * ViewModel for ChannelListFragment.
 *
 * Manages channel list UI state and business logic.
 * Coordinates between use cases and UI layer.
 *
 * ## Responsibilities
 *
 * - Fetch channels from API via use case
 * - Merge channels with user preferences (favorites/hidden)
 * - Emit UI state changes (Loading, Success, Error, Empty)
 * - Handle user interactions (channel selection, retry)
 * - Emit navigation events (navigate to player)
 * - Handle errors gracefully
 *
 * ## Architecture
 *
 * ```
 * Fragment → ViewModel → UseCase → Repository → API
 *    ↑           ↓
 *    └─ StateFlow (UI state)
 *    └─ SharedFlow (navigation events)
 * ```
 *
 * ## State Management
 *
 * - [uiState]: StateFlow for UI state (Loading, Success, Error, Empty)
 * - [navigationEvents]: SharedFlow for one-time navigation events
 *
 * ## Usage in Fragment
 *
 * ```kotlin
 * @AndroidEntryPoint
 * class ChannelListFragment : Fragment() {
 *     private val viewModel: ChannelListViewModel by viewModels()
 *
 *     override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
 *         super.onViewCreated(view, savedInstanceState)
 *
 *         // Collect UI state
 *         viewLifecycleOwner.lifecycleScope.launch {
 *             viewModel.uiState.collect { state ->
 *                 when (state) {
 *                     is Loading -> showLoading()
 *                     is Success -> showChannels(state.channels)
 *                     is Error -> showError(state.message, state.isRetryable)
 *                     is Empty -> showEmptyState()
 *                 }
 *             }
 *         }
 *
 *         // Collect navigation events
 *         viewLifecycleOwner.lifecycleScope.launch {
 *             viewModel.navigationEvents.collect { event ->
 *                 when (event) {
 *                     is NavigateToPlayer -> navigateToPlayer(event.channel)
 *                     is NavigateBack -> requireActivity().finish()
 *                     is ShowError -> showErrorSnackbar(event.message)
 *                 }
 *             }
 *         }
 *
 *         // Load channels
 *         val tunerId = arguments?.getInt("tunerId") ?: return
 *         viewModel.loadChannels(tunerId)
 *     }
 * }
 * ```
 *
 * @property getChannelsUseCase Use case for fetching channel lineup
 * @property getChannelPreferencesUseCase Use case for fetching user preferences
 */
@HiltViewModel
class ChannelListViewModel @Inject constructor(
    private val getChannelsUseCase: GetChannelsUseCase,
    private val getChannelPreferencesUseCase: GetChannelPreferencesUseCase
) : ViewModel() {

    /**
     * UI state flow.
     *
     * Emits current state of the channel list screen.
     * Fragment observes this to update UI.
     */
    private val _uiState = MutableStateFlow<ChannelListUiState>(ChannelListUiState.Loading)
    val uiState: StateFlow<ChannelListUiState> = _uiState.asStateFlow()

    /**
     * Navigation event flow.
     *
     * Emits one-time navigation events (no replay).
     * Fragment collects and handles navigation.
     */
    private val _navigationEvents = MutableSharedFlow<ChannelListNavigation>()
    val navigationEvents: SharedFlow<ChannelListNavigation> = _navigationEvents.asSharedFlow()

    /**
     * Currently loaded tuner ID.
     *
     * Cached for refresh operations.
     */
    private var currentTunerId: Int? = null

    /**
     * Load channels for a tuner.
     *
     * Fetches channel lineup and user preferences, then merges them
     * into UI models with favorite/hidden flags.
     *
     * State transitions:
     * 1. Loading (show spinner)
     * 2. Success (channels loaded) OR Empty (no channels) OR Error (API failed)
     *
     * @param tunerId Tuner ID (database primary key)
     * @param tunerName Display name for tuner (shown in UI)
     */
    fun loadChannels(tunerId: Int, tunerName: String = "Tuner") {
        currentTunerId = tunerId
        _uiState.value = ChannelListUiState.Loading

        viewModelScope.launch {
            try {
                // Fetch channels and preferences in parallel
                val channelsResult = getChannelsUseCase(tunerId)
                val preferencesResult = getChannelPreferencesUseCase(tunerId)

                // Handle channels result
                channelsResult
                    .onSuccess { channels ->
                        if (channels.isEmpty()) {
                            _uiState.value = ChannelListUiState.Empty
                            return@launch
                        }

                        // Merge with preferences (gracefully handles empty preferences)
                        val preferences = preferencesResult.getOrNull()
                        val channelUiModels = if (preferences != null) {
                            channels.toUiModels(
                                favorites = preferences.favorites,
                                hidden = preferences.hidden
                            ).sortedForDisplay()
                        } else {
                            // No preferences - show all channels as neutral
                            channels.toUiModels(
                                favorites = emptySet(),
                                hidden = emptySet()
                            ).sortedForDisplay()
                        }

                        // Check if any channels are visible after filtering
                        if (channelUiModels.isEmpty()) {
                            _uiState.value = ChannelListUiState.Empty
                        } else {
                            _uiState.value = ChannelListUiState.Success(
                                channels = channelUiModels,
                                tunerName = tunerName
                            )
                        }
                    }
                    .onFailure { error ->
                        _uiState.value = ChannelListUiState.Error.fromThrowable(error)
                    }
            } catch (e: Exception) {
                _uiState.value = ChannelListUiState.Error.fromThrowable(e)
            }
        }
    }

    /**
     * Retry loading channels after an error.
     *
     * Uses cached tuner ID from last load attempt.
     */
    fun retry() {
        val tunerId = currentTunerId
        if (tunerId != null) {
            loadChannels(tunerId)
        } else {
            _uiState.value = ChannelListUiState.Error(
                message = "Cannot retry: tuner ID not available",
                isRetryable = false
            )
        }
    }

    /**
     * Refresh channel list.
     *
     * Called when user returns from player or manually refreshes.
     * Uses cached tuner ID from last load.
     */
    fun refresh() {
        val tunerId = currentTunerId
        if (tunerId != null) {
            loadChannels(tunerId)
        }
    }

    /**
     * Handle channel selection.
     *
     * User selected a channel to watch.
     * Emit navigation event to open player.
     *
     * @param channel Selected channel
     */
    fun onChannelSelected(channel: Channel) {
        viewModelScope.launch {
            _navigationEvents.emit(
                ChannelListNavigation.NavigateToPlayer(channel)
            )
        }
    }

    /**
     * Handle back button press.
     *
     * Emit navigation event to go back.
     */
    fun onBackPressed() {
        viewModelScope.launch {
            _navigationEvents.emit(ChannelListNavigation.NavigateBack)
        }
    }

    /**
     * Show error message without changing UI state.
     *
     * Used for transient errors (e.g., network timeout on preference fetch).
     *
     * @param message Error message to display
     */
    fun showError(message: String) {
        viewModelScope.launch {
            _navigationEvents.emit(ChannelListNavigation.ShowError(message))
        }
    }
}
