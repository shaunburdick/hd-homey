package com.hdhomey.app.ui.player

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.enableEdgeToEdge
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.media3.ui.PlayerView
import com.hdhomey.app.R
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Full-screen video player activity for live TV stream playback.
 *
 * Uses Media3 ExoPlayer (provided via Hilt) to play HLS streams from the
 * HD Homey backend. Receives tuner ID, channel ID, and server URL via Intent extras.
 *
 * States:
 * - Loading: generating token and preparing ExoPlayer
 * - Playing: video is playing (possibly buffering)
 * - Error: stream could not be loaded or playback failed
 */
@AndroidEntryPoint
class PlayerActivity : AppCompatActivity() {

    @Inject
    lateinit var viewModel: PlayerViewModel

    private lateinit var playerView: PlayerView
    private lateinit var loadingState: ProgressBar
    private lateinit var errorState: android.widget.LinearLayout
    private lateinit var errorMessage: TextView
    private lateinit var channelNameText: TextView
    private lateinit var channelNumberText: TextView

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContentView(R.layout.activity_player)

        // Bind views
        playerView = findViewById(R.id.player_view)
        loadingState = findViewById(R.id.player_loading_state)
        errorState = findViewById(R.id.player_error_state)
        errorMessage = findViewById(R.id.player_error_message)
        channelNameText = findViewById(R.id.player_channel_name)
        channelNumberText = findViewById(R.id.player_channel_number)

        // Setup retry button
        findViewById<android.widget.Button>(R.id.player_retry_button).setOnClickListener {
            viewModel.retryLoad()
        }

        // Collect UI state
        lifecycleScope.launch {
            lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collectLatest { state ->
                    renderState(state)
                }
            }
        }

        // Extract intent extras and start loading
        val tunerId = intent.getIntExtra(EXTRA_TUNER_ID, -1)
        val channelId = intent.getIntExtra(EXTRA_CHANNEL_ID, -1)
        val serverUrl = intent.getStringExtra(EXTRA_SERVER_URL) ?: ""

        // Set channel info overlay
        channelNumberText.text = intent.getStringExtra(EXTRA_CHANNEL_NUMBER) ?: ""
        channelNameText.text = intent.getStringExtra(EXTRA_CHANNEL_NAME) ?: ""

        if (tunerId > 0 && channelId > 0 && serverUrl.isNotBlank()) {
            viewModel.loadStream(serverUrl, tunerId, channelId)
        } else {
            viewModel.uiState // Will emit Error via ViewModel
        }
    }

    override fun onStart() {
        super.onStart()
        // Connect the ExoPlayer instance to the PlayerView for video output
        // and built-in playback controls
        playerView.player = viewModel.player
    }

    override fun onStop() {
        super.onStop()
        // Disconnect PlayerView while activity is not visible;
        // ExoPlayer continues to run in the background so playback
        // resumes immediately when returning to this activity
        playerView.player = null
    }

    override fun onDestroy() {
        super.onDestroy()
        viewModel.releasePlayer()
    }

    /**
     * Renders the current [PlayerUiState] by toggling view visibility.
     */
    private fun renderState(state: PlayerUiState) {
        when (state) {
            is PlayerUiState.Loading -> {
                playerView.visibility = android.view.View.GONE
                errorState.visibility = android.view.View.GONE
                loadingState.visibility = android.view.View.VISIBLE
            }

            is PlayerUiState.Buffering -> {
                loadingState.visibility = android.view.View.GONE
                errorState.visibility = android.view.View.GONE
                playerView.visibility = android.view.View.VISIBLE
                // PlayerView's own buffering indicator handles the visual
            }

            is PlayerUiState.Playing -> {
                loadingState.visibility = android.view.View.GONE
                errorState.visibility = android.view.View.GONE
                playerView.visibility = android.view.View.VISIBLE
            }

            is PlayerUiState.Error -> {
                loadingState.visibility = android.view.View.GONE
                playerView.visibility = android.view.View.GONE
                errorState.visibility = android.view.View.VISIBLE
                errorMessage.text = state.message
            }
        }
    }

    /**
     * Navigate back to the channel list.
     */
    override fun onBackPressed() {
        viewModel.releasePlayer()
        finish()
    }

    companion object {
        const val EXTRA_TUNER_ID = "tuner_id"
        const val EXTRA_CHANNEL_ID = "channel_id"
        const val EXTRA_SERVER_URL = "server_url"
        const val EXTRA_CHANNEL_NUMBER = "channel_number"
        const val EXTRA_CHANNEL_NAME = "channel_name"

        /**
         * Create an Intent for launching the PlayerActivity.
         *
         * @param context Caller context
         * @param tunerId ID of the tuner
         * @param channelId ID of the channel
         * @param serverUrl Base URL of the HD Homey server
         * @param channelNumber Display number of the channel (e.g., "2.1")
         * @param channelName Display name of the channel (e.g., "CBS")
         * @return Configured Intent
         */
        fun createIntent(
            context: Context,
            tunerId: Int,
            channelId: Int,
            serverUrl: String,
            channelNumber: String,
            channelName: String
        ): Intent {
            return Intent(context, PlayerActivity::class.java).apply {
                putExtra(EXTRA_TUNER_ID, tunerId)
                putExtra(EXTRA_CHANNEL_ID, channelId)
                putExtra(EXTRA_SERVER_URL, serverUrl)
                putExtra(EXTRA_CHANNEL_NUMBER, channelNumber)
                putExtra(EXTRA_CHANNEL_NAME, channelName)
            }
        }
    }
}
