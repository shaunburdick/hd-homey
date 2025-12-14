package com.hdhomey.app.ui.player

import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.activity.viewModels
import androidx.appcompat.app.AppCompatActivity
import androidx.constraintlayout.widget.Group
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.media3.common.MediaItem
import androidx.media3.common.Player
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.ui.PlayerView
import com.hdhomey.app.R
import dagger.hilt.android.AndroidEntryPoint
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.android.components.ActivityComponent
import dagger.hilt.EntryPoint
import kotlinx.coroutines.launch
import javax.inject.Inject

/**
 * Entry point for accessing Activity-scoped dependencies.
 */
@EntryPoint
@dagger.hilt.InstallIn(ActivityComponent::class)
interface PlayerEntryPoint {
    fun exoPlayer(): ExoPlayer
}

/**
 * Full-screen video player activity for HD Homey channel streaming.
 *
 * Features:
 * - HLS video playback with ExoPlayer
 * - Automatic token refresh every 10 minutes
 * - Loading, playing, and error states
 * - D-pad navigation for Android TV
 * - Fullscreen with auto-hiding controls
 *
 * ## Intent Extras
 *
 * Required extras:
 * - [EXTRA_TUNER_ID]: Tuner database ID (Int)
 * - [EXTRA_CHANNEL_ID]: Channel database ID (Int)
 * - [EXTRA_CHANNEL_NAME]: Channel display name (String)
 * - [EXTRA_SERVER_URL]: HD Homey server base URL (String)
 *
 * ## Example Usage
 *
 * ```kotlin
 * val intent = Intent(context, PlayerActivity::class.java).apply {
 *     putExtra(PlayerActivity.EXTRA_TUNER_ID, 1)
 *     putExtra(PlayerActivity.EXTRA_CHANNEL_ID, 5)
 *     putExtra(PlayerActivity.EXTRA_CHANNEL_NAME, "2.1 CBS")
 *     putExtra(PlayerActivity.EXTRA_SERVER_URL, "https://server.local")
 * }
 * startActivity(intent)
 * ```
 *
 * ## Architecture
 *
 * - Activity manages ExoPlayer lifecycle (Activity-scoped)
 * - ViewModel handles stream URL generation and token refresh
 * - ViewModel emits stream URLs via SharedFlow
 * - Activity collects URLs and sets them on player
 *
 * @see PlayerViewModel
 * @see PlayerUiState
 */
@AndroidEntryPoint
class PlayerActivity : AppCompatActivity() {

    private val viewModel: PlayerViewModel by viewModels()

    // Player is Activity-scoped and provided by MediaModule
    // We don't inject it as a field because of Kotlin metadata issues with Hilt 2.52
    // Instead, we get it via EntryPoint in setupPlayer()
    private lateinit var exoPlayer: ExoPlayer

    // View references
    private lateinit var playerView: PlayerView
    private lateinit var loadingStateGroup: Group
    private lateinit var loadingProgress: ProgressBar
    private lateinit var loadingText: TextView
    private lateinit var errorStateGroup: Group
    private lateinit var errorText: TextView
    private lateinit var errorRetryButton: Button

    // Intent extras
    private var tunerId: Int = 0
    private var channelId: Int = 0
    private var channelName: String = ""
    private var serverUrl: String = ""

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        // Set fullscreen mode (hide status bar)
        @Suppress("DEPRECATION")
        window.setFlags(
            WindowManager.LayoutParams.FLAG_FULLSCREEN,
            WindowManager.LayoutParams.FLAG_FULLSCREEN
        )
        
        setContentView(R.layout.activity_player)

        // Get intent extras
        tunerId = intent.getIntExtra(EXTRA_TUNER_ID, 0)
        channelId = intent.getIntExtra(EXTRA_CHANNEL_ID, 0)
        channelName = intent.getStringExtra(EXTRA_CHANNEL_NAME) ?: ""
        serverUrl = intent.getStringExtra(EXTRA_SERVER_URL) ?: ""

        // Validate extras
        if (tunerId == 0 || channelId == 0 || serverUrl.isEmpty()) {
            Toast.makeText(this, "Invalid player parameters", Toast.LENGTH_LONG).show()
            finish()
            return
        }

        // Initialize views
        initializeViews()

        // Set up ExoPlayer
        setupPlayer()

        // Collect ViewModel state and events
        collectViewModelState()

        // Load the stream
        viewModel.loadStream(tunerId, channelId, channelName, serverUrl)
    }

    /**
     * Initialize view references.
     */
    private fun initializeViews() {
        playerView = findViewById(R.id.player_view)
        loadingStateGroup = findViewById(R.id.loading_state_group)
        loadingProgress = findViewById(R.id.loading_progress)
        loadingText = findViewById(R.id.loading_text)
        errorStateGroup = findViewById(R.id.error_state_group)
        errorText = findViewById(R.id.error_text)
        errorRetryButton = findViewById(R.id.error_retry_button)

        // Set up retry button (manual retry resets the retry counter)
        errorRetryButton.setOnClickListener {
            viewModel.retryManual()
        }
    }

    /**
     * Set up ExoPlayer and attach to PlayerView.
     */
    private fun setupPlayer() {
        // Get ExoPlayer from Hilt
        // We use EntryPoint instead of field injection due to Kotlin metadata compatibility issues
        exoPlayer = EntryPointAccessors.fromActivity(
            this,
            PlayerEntryPoint::class.java
        ).exoPlayer()
        
        playerView.player = exoPlayer

        // Add player listener to update ViewModel state
        exoPlayer.addListener(object : Player.Listener {
            override fun onPlaybackStateChanged(playbackState: Int) {
                when (playbackState) {
                    Player.STATE_BUFFERING -> {
                        viewModel.onBuffering()
                    }
                    Player.STATE_READY -> {
                        viewModel.updatePlaybackState(exoPlayer.playWhenReady)
                    }
                    Player.STATE_ENDED -> {
                        // Live streams shouldn't end normally
                        viewModel.onBackPressed()
                    }
                    Player.STATE_IDLE -> {
                        // Player is idle
                    }
                }
            }

            override fun onPlayerError(error: androidx.media3.common.PlaybackException) {
                val errorMessage = mapPlaybackError(error)
                viewModel.onPlaybackError(errorMessage)
            }

            override fun onIsPlayingChanged(isPlaying: Boolean) {
                viewModel.updatePlaybackState(isPlaying)
            }
        })
    }

    /**
     * Collect ViewModel state and navigation events.
     */
    private fun collectViewModelState() {
        lifecycleScope.launch {
            repeatOnLifecycle(Lifecycle.State.STARTED) {
                // Collect UI state
                launch {
                    viewModel.uiState.collect { state ->
                        renderState(state)
                    }
                }

                // Collect stream URL events
                launch {
                    viewModel.streamUrlEvents.collect { streamUrl ->
                        setMediaSource(streamUrl)
                    }
                }

                // Collect navigation events
                launch {
                    viewModel.navigationEvents.collect { event ->
                        handleNavigationEvent(event)
                    }
                }
            }
        }
    }

    /**
     * Render UI state.
     *
     * @param state Current UI state
     */
    private fun renderState(state: PlayerUiState) {
        when (state) {
            is PlayerUiState.Preparing -> {
                showLoading(state.channelName)
            }
            is PlayerUiState.Buffering -> {
                showLoading(state.channelName)
            }
            is PlayerUiState.Playing -> {
                showPlaying()
            }
            is PlayerUiState.Paused -> {
                showPlaying()
            }
            is PlayerUiState.Error -> {
                showError(state.message, state.isRetryable)
            }
        }
    }

    /**
     * Show loading state.
     *
     * @param channel Channel name being loaded
     */
    private fun showLoading(channel: String) {
        playerView.visibility = View.VISIBLE
        loadingStateGroup.visibility = View.VISIBLE
        errorStateGroup.visibility = View.GONE
        loadingText.text = getString(R.string.player_loading_channel, channel)
    }

    /**
     * Show playing state (hide loading and error).
     */
    private fun showPlaying() {
        playerView.visibility = View.VISIBLE
        loadingStateGroup.visibility = View.GONE
        errorStateGroup.visibility = View.GONE
    }

    /**
     * Show error state.
     *
     * @param message Error message
     * @param isRetryable Whether retry button should be shown
     */
    private fun showError(message: String, isRetryable: Boolean) {
        playerView.visibility = View.VISIBLE
        loadingStateGroup.visibility = View.GONE
        errorStateGroup.visibility = View.VISIBLE
        errorText.text = message
        errorRetryButton.visibility = if (isRetryable) View.VISIBLE else View.GONE
        
        // Request focus on retry button if retryable
        if (isRetryable) {
            errorRetryButton.requestFocus()
        }
    }

    /**
     * Set media source on ExoPlayer.
     *
     * @param streamUrl HLS playlist URL
     */
    private fun setMediaSource(streamUrl: String) {
        val mediaItem = MediaItem.fromUri(streamUrl)
        exoPlayer.setMediaItem(mediaItem)
        exoPlayer.prepare()
        exoPlayer.playWhenReady = true
    }

    /**
     * Handle navigation events from ViewModel.
     *
     * @param event Navigation event
     */
    private fun handleNavigationEvent(event: PlayerNavigation) {
        when (event) {
            is PlayerNavigation.NavigateBack -> {
                finish()
            }
            is PlayerNavigation.ShowError -> {
                Toast.makeText(this, event.message, Toast.LENGTH_LONG).show()
            }
            is PlayerNavigation.SessionExpired -> {
                Toast.makeText(this, "Session expired. Please sign in again.", Toast.LENGTH_LONG).show()
                // TODO: Navigate to login (Phase 1 integration)
                finish()
            }
        }
    }

    /**
     * Map ExoPlayer errors to user-friendly messages.
     *
     * @param error Playback exception
     * @return User-friendly error message
     */
    private fun mapPlaybackError(error: androidx.media3.common.PlaybackException): String {
        return when (error.errorCode) {
            androidx.media3.common.PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_FAILED,
            androidx.media3.common.PlaybackException.ERROR_CODE_IO_NETWORK_CONNECTION_TIMEOUT -> {
                "Network connection failed. Check your connection and try again."
            }
            androidx.media3.common.PlaybackException.ERROR_CODE_IO_BAD_HTTP_STATUS -> {
                "Stream unavailable. The channel may be temporarily offline."
            }
            androidx.media3.common.PlaybackException.ERROR_CODE_PARSING_CONTAINER_MALFORMED,
            androidx.media3.common.PlaybackException.ERROR_CODE_PARSING_MANIFEST_MALFORMED -> {
                "Invalid stream format. Try another channel."
            }
            else -> {
                "Playback error: ${error.message ?: "Unknown error"}"
            }
        }
    }

    /**
     * Handle back button press.
     */
    @Deprecated("Deprecated in Java")
    override fun onBackPressed() {
        viewModel.onBackPressed()
        @Suppress("DEPRECATION")
        super.onBackPressed()
    }

    /**
     * Pause playback when activity goes to background.
     */
    override fun onPause() {
        super.onPause()
        exoPlayer.pause()
    }

    /**
     * Release player when activity is destroyed.
     */
    override fun onDestroy() {
        super.onDestroy()
        exoPlayer.release()
    }

    companion object {
        const val EXTRA_TUNER_ID = "tunerId"
        const val EXTRA_CHANNEL_ID = "channelId"
        const val EXTRA_CHANNEL_NAME = "channelName"
        const val EXTRA_SERVER_URL = "serverUrl"
    }
}
