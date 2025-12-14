package com.hdhomey.app.ui.channels

import com.hdhomey.app.domain.model.Channel

/**
 * Navigation events from ChannelListFragment.
 *
 * Single-use events for navigating to other screens.
 * Events are consumed after handling to prevent duplicate navigation.
 *
 * ## Design Pattern
 *
 * Uses sealed interface for type-safe event handling.
 * ViewModel emits events via SharedFlow (hot stream, no replay).
 * Fragment collects events and navigates accordingly.
 *
 * ## Usage in ViewModel
 *
 * ```kotlin
 * class ChannelListViewModel @Inject constructor() : ViewModel() {
 *     private val _navigationEvents = MutableSharedFlow<ChannelListNavigation>()
 *     val navigationEvents: SharedFlow<ChannelListNavigation> = _navigationEvents.asSharedFlow()
 *
 *     fun onChannelSelected(channel: Channel) {
 *         viewModelScope.launch {
 *             _navigationEvents.emit(NavigateToPlayer(channel))
 *         }
 *     }
 * }
 * ```
 *
 * ## Usage in Fragment
 *
 * ```kotlin
 * viewLifecycleOwner.lifecycleScope.launch {
 *     viewModel.navigationEvents.collect { event ->
 *         when (event) {
 *             is NavigateToPlayer -> {
 *                 val intent = Intent(requireContext(), PlayerActivity::class.java).apply {
 *                     putExtra("tunerId", event.channel.tunerId)
 *                     putExtra("channelId", event.channel.id)
 *                     putExtra("channelName", event.channel.name)
 *                 }
 *                 startActivity(intent)
 *             }
 *             is NavigateBack -> requireActivity().finish()
 *             is ShowError -> showErrorSnackbar(event.message)
 *         }
 *     }
 * }
 * ```
 */
sealed interface ChannelListNavigation {
    /**
     * Navigate to video player screen.
     *
     * User selected a channel to watch.
     * Navigate to PlayerActivity with channel details.
     *
     * @property channel Selected channel with tuner info
     */
    data class NavigateToPlayer(
        val channel: Channel
    ) : ChannelListNavigation

    /**
     * Navigate back to previous screen.
     *
     * User pressed back button or cancelled action.
     * Finish activity or pop back stack.
     */
    data object NavigateBack : ChannelListNavigation

    /**
     * Show error message without navigation.
     *
     * Display error Snackbar or Toast.
     * User remains on channel list screen.
     *
     * @property message Error message to display
     */
    data class ShowError(
        val message: String
    ) : ChannelListNavigation
}
