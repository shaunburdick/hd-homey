package com.hdhomey.app.ui.channels

import android.os.Bundle
import android.util.Log
import android.view.LayoutInflater
import android.view.View
import android.view.ViewGroup
import android.view.animation.AnimationUtils
import android.widget.TextView
import androidx.fragment.app.Fragment
import androidx.fragment.app.viewModels
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.recyclerview.widget.LinearLayoutManager
import androidx.recyclerview.widget.RecyclerView
import com.hdhomey.app.R
import com.hdhomey.app.domain.model.ChannelWithMetadata
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

/**
 * Fragment displaying the channel list for a selected tuner.
 *
 * Collects [ChannelListUiState] from [ChannelListViewModel] and switches
 * between loading, success (RecyclerView), error, and empty states.
 *
 * Navigation:
 * - Receives `tunerId` (Int) from Navigation component arguments
 * - Channel clicks are forwarded to [onChannelClicked] (Phase 2.3: PlayerActivity)
 */
@AndroidEntryPoint
class ChannelListFragment : Fragment() {

    private val viewModel: ChannelListViewModel by viewModels()
    private lateinit var adapter: ChannelAdapter
    private var tunerId: Int = -1

    override fun onCreateView(
        inflater: LayoutInflater,
        container: ViewGroup?,
        savedInstanceState: Bundle?
    ): View? {
        return inflater.inflate(R.layout.fragment_channel_list, container, false)
    }

    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)

        // Get tuner ID from navigation arguments
        tunerId = arguments?.getInt("tunerId", -1) ?: -1

        // Setup RecyclerView
        val recyclerView = view.findViewById<RecyclerView>(R.id.channel_list_recycler_view)
        adapter = ChannelAdapter(
            onChannelClick = { channel -> onChannelClicked(channel) }
        )
        recyclerView.layoutManager = LinearLayoutManager(requireContext())
        recyclerView.adapter = adapter

        // Setup retry button — only shown in the error state, so safe to wire regardless
        view.findViewById<View>(R.id.retry_button)?.setOnClickListener {
            viewModel.retryLoad()
        }

        // Setup refresh button — reloads channels from the server
        view.findViewById<View>(R.id.refresh_button)?.setOnClickListener {
            if (tunerId > 0) {
                viewModel.loadChannels(tunerId)
            } else {
                viewModel.loadChannels()  // auto-detect tuner
            }
        }

        // Collect UI state safely within the STARTED lifecycle
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collectLatest { state ->
                    renderState(state)
                }
            }
        }

        // Kick off channel loading — auto-detect tuner if no ID provided
        if (tunerId > 0) {
            viewModel.loadChannels(tunerId)
        } else {
            viewModel.loadChannels()  // auto-detect first available tuner
        }
    }

    /**
     * Renders the current [ChannelListUiState] by toggling view visibility and
     * pushing data to the adapter.
     *
     * Each branch shows exactly one of: loadingState, recyclerView, errorState, emptyState.
     * All other views are set to [View.GONE] to avoid overlapping states.
     *
     * @param state The new UI state emitted by [ChannelListViewModel.uiState]
     */
    private fun renderState(state: ChannelListUiState) {
        val root = view ?: return

        val recyclerView = root.findViewById<RecyclerView>(R.id.channel_list_recycler_view)
        val loadingState = root.findViewById<View>(R.id.loading_state)
        val errorState = root.findViewById<View>(R.id.error_state)
        val emptyState = root.findViewById<View>(R.id.empty_state)
        val tunerNameText = root.findViewById<TextView>(R.id.tuner_name_text)

        when (state) {
            is ChannelListUiState.Loading -> {
                recyclerView.visibility = View.GONE
                errorState.visibility = View.GONE
                emptyState.visibility = View.GONE
                loadingState.visibility = View.VISIBLE
                // Start shimmer animation on the loading state container
                val shimmerAnim = AnimationUtils.loadAnimation(requireContext(), R.anim.shimmer)
                loadingState.startAnimation(shimmerAnim)
            }

            is ChannelListUiState.Success -> {
                loadingState.visibility = View.GONE
                errorState.visibility = View.GONE
                emptyState.visibility = View.GONE
                recyclerView.visibility = View.VISIBLE
                tunerNameText?.text = state.tunerName
                adapter.submitList(state.channels)
            }

            is ChannelListUiState.Error -> {
                loadingState.visibility = View.GONE
                recyclerView.visibility = View.GONE
                emptyState.visibility = View.GONE
                errorState.visibility = View.VISIBLE
                root.findViewById<TextView>(R.id.error_message_text)?.text = state.message
                // Only show the retry button when the error is actually retryable
                root.findViewById<View>(R.id.retry_button)?.visibility =
                    if (state.isRetryable) View.VISIBLE else View.GONE
            }

            is ChannelListUiState.Empty -> {
                loadingState.visibility = View.GONE
                recyclerView.visibility = View.GONE
                errorState.visibility = View.GONE
                emptyState.visibility = View.VISIBLE
            }
        }
    }

    /**
     * Handle channel item click — navigate to the video player.
     *
     * Launches [com.hdhomey.app.ui.player.PlayerActivity] with the channel's
     * tuner ID, channel ID, server URL, and display info. The activity uses
     * ExoPlayer to stream the HLS channel.
     *
     * @param channel The channel the user tapped
     */
    private fun onChannelClicked(channel: ChannelWithMetadata) {
        val serverUrl = viewModel.getActiveServerUrl()
        if (serverUrl == null) {
            Log.w("ChannelListFragment", "No active server URL available — cannot play stream")
            return
        }
        val intent = com.hdhomey.app.ui.player.PlayerActivity.createIntent(
            context = requireContext(),
            tunerId = channel.channel.tunerId,
            channelId = channel.channel.id,
            serverUrl = serverUrl,
            channelNumber = channel.channel.number,
            channelName = channel.channel.name
        )
        startActivity(intent)
    }
}
