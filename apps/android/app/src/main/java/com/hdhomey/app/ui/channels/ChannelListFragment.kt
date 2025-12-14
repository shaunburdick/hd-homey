package com.hdhomey.app.ui.channels

import android.content.Intent
import android.os.Bundle
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.constraintlayout.widget.Group
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.lifecycleScope
import androidx.recyclerview.widget.RecyclerView
import com.hdhomey.app.R
import com.hdhomey.app.data.repository.ServerRepository
import com.hdhomey.app.ui.player.PlayerActivity
import dagger.hilt.android.AndroidEntryPoint
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.EntryPoint
import dagger.hilt.android.components.FragmentComponent
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Entry point for accessing Fragment-scoped dependencies.
 */
@EntryPoint
@dagger.hilt.InstallIn(FragmentComponent::class)
interface ChannelListEntryPoint {
    fun serverRepository(): ServerRepository
}

/**
 * Fragment displaying channel list from HDHomeRun tuner.
 *
 * Displays channels with support for:
 * - D-pad navigation for Android TV
 * - Channel selection (opens video player)
 * - Loading states (spinner)
 * - Error states (retry button)
 * - Empty states (no channels message)
 *
 * ## Architecture
 *
 * ```
 * Fragment → ViewModel (StateFlow) → Use Cases → Repositories → API
 * ```
 *
 * ## Navigation
 *
 * Receives tuner ID via arguments:
 * ```kotlin
 * val fragment = ChannelListFragment().apply {
 *     arguments = Bundle().apply {
 *         putInt("tunerId", 1)
 *         putString("tunerName", "Living Room HDHomeRun")
 *     }
 * }
 * ```
 *
 * Navigates to PlayerActivity when channel selected.
 *
 * ## UI States
 *
 * - Loading: Show spinner, hide list
 * - Success: Show list with channels
 * - Empty: Show "no channels" message
 * - Error: Show error message with retry button
 *
 * @see ChannelListViewModel
 * @see ChannelAdapter
 */
@AndroidEntryPoint
class ChannelListFragment : Fragment() {

    private val viewModel: ChannelListViewModel by viewModels()

    // ServerRepository accessed via EntryPoint to avoid Kotlin metadata issues
    private lateinit var serverRepository: ServerRepository

    // View references
    private lateinit var tunerNameText: TextView
    private lateinit var channelCountText: TextView
    private lateinit var recyclerView: RecyclerView
    private lateinit var progressBar: ProgressBar
    private lateinit var loadingText: TextView
    private lateinit var emptyStateGroup: Group
    private lateinit var errorStateGroup: Group
    private lateinit var errorText: TextView
    private lateinit var retryButton: Button

    private lateinit var adapter: ChannelAdapter

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_channel_list, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Get ServerRepository via EntryPoint
        serverRepository = EntryPointAccessors.fromFragment(
            this,
            ChannelListEntryPoint::class.java
        ).serverRepository()

        // Initialize views
        tunerNameText = view.findViewById(R.id.tunerNameText)
        channelCountText = view.findViewById(R.id.channelCountText)
        recyclerView = view.findViewById(R.id.channelRecyclerView)
        progressBar = view.findViewById(R.id.progressBar)
        loadingText = view.findViewById(R.id.loadingText)
        emptyStateGroup = view.findViewById(R.id.emptyStateGroup)
        errorStateGroup = view.findViewById(R.id.errorStateGroup)
        errorText = view.findViewById(R.id.errorText)
        retryButton = view.findViewById(R.id.retryButton)

        // Setup RecyclerView
        adapter = ChannelAdapter { channelUiModel ->
            viewModel.onChannelSelected(channelUiModel.channel)
        }
        recyclerView.adapter = adapter

        // Setup retry button
        retryButton.setOnClickListener {
            viewModel.retry()
        }

        // Collect UI state
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.uiState.collect { state ->
                renderUiState(state)
            }
        }

        // Collect navigation events
        viewLifecycleOwner.lifecycleScope.launch {
            viewModel.navigationEvents.collect { event ->
                handleNavigationEvent(event)
            }
        }

        // Load channels
        val tunerId = arguments?.getInt(ARG_TUNER_ID)
        val tunerName = arguments?.getString(ARG_TUNER_NAME) ?: "Tuner"
        if (tunerId != null) {
            viewModel.loadChannels(tunerId, tunerName)
        } else {
            showError("Tuner ID not provided", isRetryable = false)
        }
    }

    override fun onResume() {
        super.onResume()
        // Refresh channels when returning from player
        viewModel.refresh()
    }

    /**
     * Render UI based on state.
     *
     * Shows/hides appropriate views for each state.
     *
     * @param state Current UI state from ViewModel
     */
    private fun renderUiState(state: ChannelListUiState) {
        when (state) {
            is ChannelListUiState.Loading -> {
                showLoading()
            }
            is ChannelListUiState.Success -> {
                showChannels(state)
            }
            is ChannelListUiState.Empty -> {
                showEmptyState()
            }
            is ChannelListUiState.Error -> {
                showError(state.message, state.isRetryable)
            }
        }
    }

    /**
     * Show loading state.
     *
     * Display spinner and "Loading channels..." text.
     */
    private fun showLoading() {
        recyclerView.visibility = View.GONE
        progressBar.visibility = View.VISIBLE
        loadingText.visibility = View.VISIBLE
        emptyStateGroup.visibility = View.GONE
        errorStateGroup.visibility = View.GONE
        channelCountText.text = getString(R.string.channel_count_placeholder)
    }

    /**
     * Show success state with channels.
     *
     * Display RecyclerView with channel list.
     *
     * @param state Success state with channels and tuner name
     */
    private fun showChannels(state: ChannelListUiState.Success) {
        recyclerView.visibility = View.VISIBLE
        progressBar.visibility = View.GONE
        loadingText.visibility = View.GONE
        emptyStateGroup.visibility = View.GONE
        errorStateGroup.visibility = View.GONE

        // Update tuner name
        tunerNameText.text = state.tunerName

        // Update channel count
        val countText = if (state.favoriteCount > 0) {
            getString(
                R.string.channel_count_with_favorites,
                state.visibleChannelCount,
                state.favoriteCount
            )
        } else {
            getString(R.string.channel_count, state.visibleChannelCount)
        }
        channelCountText.text = countText

        // Submit channel list to adapter
        adapter.submitList(state.channels)
    }

    /**
     * Show empty state.
     *
     * Display "No channels found" message.
     */
    private fun showEmptyState() {
        recyclerView.visibility = View.GONE
        progressBar.visibility = View.GONE
        loadingText.visibility = View.GONE
        emptyStateGroup.visibility = View.VISIBLE
        errorStateGroup.visibility = View.GONE
        channelCountText.text = getString(R.string.channel_count, 0)
    }

    /**
     * Show error state.
     *
     * Display error message and retry button (if retryable).
     *
     * @param message Error message to display
     * @param isRetryable Whether retry button should be shown
     */
    private fun showError(message: String, isRetryable: Boolean) {
        recyclerView.visibility = View.GONE
        progressBar.visibility = View.GONE
        loadingText.visibility = View.GONE
        emptyStateGroup.visibility = View.GONE
        errorStateGroup.visibility = View.VISIBLE

        errorText.text = message
        retryButton.visibility = if (isRetryable) View.VISIBLE else View.GONE
    }

    /**
     * Handle navigation events from ViewModel.
     *
     * @param event Navigation event (player, back, error)
     */
    private fun handleNavigationEvent(event: ChannelListNavigation) {
        when (event) {
            is ChannelListNavigation.NavigateToPlayer -> {
                navigateToPlayer(event.channel.tunerId, event.channel.id, event.channel.name)
            }
            is ChannelListNavigation.NavigateBack -> {
                requireActivity().finish()
            }
            is ChannelListNavigation.ShowError -> {
                Toast.makeText(requireContext(), event.message, Toast.LENGTH_LONG).show()
            }
        }
    }

    /**
     * Navigate to video player activity.
     *
     * Opens PlayerActivity with channel details and server URL.
     *
     * @param tunerId Tuner ID
     * @param channelId Channel ID
     * @param channelName Channel name for display
     */
    private fun navigateToPlayer(tunerId: Int, channelId: Int, channelName: String) {
        // Get active server URL
        val activeServer = serverRepository.getActiveServer()
        if (activeServer == null) {
            Toast.makeText(
                requireContext(),
                "No active server found. Please select a server first.",
                Toast.LENGTH_LONG
            ).show()
            return
        }

        // Launch PlayerActivity with channel details
        val intent = Intent(requireContext(), PlayerActivity::class.java).apply {
            putExtra(PlayerActivity.EXTRA_TUNER_ID, tunerId)
            putExtra(PlayerActivity.EXTRA_CHANNEL_ID, channelId)
            putExtra(PlayerActivity.EXTRA_CHANNEL_NAME, channelName)
            putExtra(PlayerActivity.EXTRA_SERVER_URL, activeServer.url)
        }
        startActivity(intent)
    }

    companion object {
        const val ARG_TUNER_ID = "tunerId"
        const val ARG_TUNER_NAME = "tunerName"

        /**
         * Create new instance of ChannelListFragment with arguments.
         *
         * @param tunerId Tuner ID to load channels from
         * @param tunerName Display name for tuner
         * @return Fragment instance with arguments set
         */
        fun newInstance(tunerId: Int, tunerName: String): ChannelListFragment {
            return ChannelListFragment().apply {
                arguments = Bundle().apply {
                    putInt(ARG_TUNER_ID, tunerId)
                    putString(ARG_TUNER_NAME, tunerName)
                }
            }
        }
    }
}
