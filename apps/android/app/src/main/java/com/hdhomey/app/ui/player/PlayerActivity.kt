package com.hdhomey.app.ui.player

import android.app.PictureInPictureParams
import android.content.Context
import android.content.Intent
import android.content.res.Configuration
import android.graphics.Rect
import android.os.Build
import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.util.Rational
import android.view.KeyEvent
import android.view.MotionEvent
import android.view.View
import android.widget.ProgressBar
import android.widget.TextView
import androidx.activity.OnBackPressedCallback
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.appcompat.app.AlertDialog
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.lifecycleScope
import androidx.lifecycle.repeatOnLifecycle
import androidx.media3.ui.PlayerView
import com.hdhomey.app.R
import dagger.hilt.android.AndroidEntryPoint
import kotlinx.coroutines.flow.collectLatest
import kotlinx.coroutines.launch

/**
 * Full-screen video player activity for live TV stream playback.
 *
 * Uses Media3 ExoPlayer (provided via Hilt) to play HLS streams from the
 * HD Homey backend. Receives tuner ID, channel ID, and server URL via Intent extras.
 *
 * ### Features
 * - **Player controls overlay** ([PlayerControlsView]) with auto-hide after
 *   [CONTROLS_HIDE_DELAY_MS] (3 seconds) of inactivity. Shown on touch or D-pad press.
 * - **"Are you sure?" dialog** when the user presses Back while playback is active.
 * - **Picture-in-Picture (PiP)** via [onUserLeaveHint] — automatically enters PiP when
 *   the user navigates Home or switches apps during active playback.
 *
 * ### States
 * - Loading: generating token and preparing ExoPlayer
 * - Buffering: ExoPlayer buffering before first frame
 * - Playing: video is playing
 * - Error: stream could not be loaded or playback failed
 */
@AndroidEntryPoint
class PlayerActivity : AppCompatActivity() {

    private val viewModel: PlayerViewModel by viewModels()

    private lateinit var playerView: PlayerView
    private lateinit var loadingState: ProgressBar
    private lateinit var errorState: android.widget.LinearLayout
    private lateinit var errorMessage: TextView
    private lateinit var channelNameText: TextView
    private lateinit var channelNumberText: TextView
    private lateinit var playerControls: PlayerControlsView

    /** Handler used to post the auto-hide runnable for the controls overlay. */
    private val controlsHandler = Handler(Looper.getMainLooper())

    /**
     * Runnable that hides the controls overlay after the inactivity timeout.
     * Cancelled and re-posted whenever user interaction is detected.
     */
    private val hideControlsRunnable = Runnable { hideControls() }

    /** Stored channel number and name for populating the controls overlay. */
    private var channelNumber: String = ""
    private var channelName: String = ""

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
        playerControls = findViewById(R.id.player_controls)

        // Render the initial Loading state synchronously so the spinner is visible
        // immediately, before the lifecycle coroutine (which starts collecting in
        // onStart()) has had a chance to observe the UI state.
        // Without this, if the ViewModel transitions to Error before onStart(),
        // the collector would skip Loading entirely and the test expecting the
        // loading spinner to be VISIBLE on launch would fail.
        renderState(PlayerUiState.Loading)

        // Wire the controls callbacks
        playerControls.onPlayPauseClick = ::onPlayPauseToggle
        playerControls.onBackClick = ::handleBackNavigation

        // Register a back-press callback that shows a confirmation dialog when playing.
        // Using OnBackPressedDispatcher is the modern (API 33+) replacement for
        // overriding onBackPressed(); it also works on all API levels via AndroidX.
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                handleBackNavigation()
            }
        })

        // Setup retry button
        findViewById<android.widget.Button>(R.id.player_retry_button).setOnClickListener {
            viewModel.retryLoad()
        }

        // Set up touch listener on the root so any tap shows controls
        val rootView: View = findViewById(R.id.player_root)
        rootView.setOnTouchListener { v, event ->
            if (event.action == MotionEvent.ACTION_UP) {
                showControlsTemporarily()
                v.performClick()  // Required for accessibility: signals a completed click
            }
            false // Pass the event through to PlayerView's built-in gesture handler
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

        channelNumber = intent.getStringExtra(EXTRA_CHANNEL_NUMBER) ?: ""
        channelName = intent.getStringExtra(EXTRA_CHANNEL_NAME) ?: ""

        // Populate both the legacy channel-info OSD and the new controls overlay
        channelNumberText.text = channelNumber
        channelNameText.text = channelName
        playerControls.setChannelInfo(channelNumber, channelName)

        if (tunerId > 0 && channelId > 0 && serverUrl.isNotBlank()) {
            viewModel.loadStream(serverUrl, tunerId, channelId)
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
        // Only disconnect PlayerView if we are NOT in PiP mode.
        // In PiP mode the activity is stopped (background) but the player should
        // continue rendering into the PiP window.
        if (!isInPictureInPictureMode) {
            playerView.player = null
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        controlsHandler.removeCallbacks(hideControlsRunnable)
        viewModel.releasePlayer()
    }

    // ── Player controls ──────────────────────────────────────────────────────

    /**
     * Show the controls overlay and schedule it to auto-hide after
     * [CONTROLS_HIDE_DELAY_MS] milliseconds of inactivity.
     *
     * Safe to call multiple times — each call resets the hide timer.
     */
    private fun showControlsTemporarily() {
        playerControls.visibility = View.VISIBLE
        playerControls.requestPlayPauseFocus()
        controlsHandler.removeCallbacks(hideControlsRunnable)
        controlsHandler.postDelayed(hideControlsRunnable, CONTROLS_HIDE_DELAY_MS)
    }

    /**
     * Hide the controls overlay immediately.
     * Called by [hideControlsRunnable] after the inactivity timeout.
     */
    private fun hideControls() {
        playerControls.visibility = View.GONE
    }

    /**
     * Toggle play/pause state when the user activates the Play/Pause button
     * in the controls overlay, and reset the auto-hide timer.
     */
    private fun onPlayPauseToggle() {
        val state = viewModel.uiState.value
        val currentlyPlaying = state is PlayerUiState.Playing && state.isPlaying
        viewModel.playPause(!currentlyPlaying)
        // Reset the auto-hide timer so the controls stay visible briefly after toggle
        showControlsTemporarily()
    }

    /**
     * Intercept D-pad key events to show the controls overlay whenever
     * navigation keys are pressed during playback.
     */
    override fun dispatchKeyEvent(event: KeyEvent): Boolean {
        if (event.action == KeyEvent.ACTION_DOWN) {
            val isNavKey = event.keyCode in NAVIGATION_KEYS
            val isPlaybackKey = event.keyCode == KeyEvent.KEYCODE_MEDIA_PLAY_PAUSE ||
                event.keyCode == KeyEvent.KEYCODE_MEDIA_PLAY ||
                event.keyCode == KeyEvent.KEYCODE_MEDIA_PAUSE
            if ((isNavKey || isPlaybackKey) && viewModel.uiState.value is PlayerUiState.Playing) {
                showControlsTemporarily()
            }
        }
        return super.dispatchKeyEvent(event)
    }

    // ── Rendering ────────────────────────────────────────────────────────────

    /**
     * Renders the current [PlayerUiState] by toggling view visibility and
     * keeping the controls overlay play/pause icon in sync.
     */
    private fun renderState(state: PlayerUiState) {
        when (state) {
            is PlayerUiState.Loading -> {
                playerView.visibility = View.GONE
                errorState.visibility = View.GONE
                loadingState.visibility = View.VISIBLE
                hideControls()
            }

            is PlayerUiState.Buffering -> {
                loadingState.visibility = View.GONE
                errorState.visibility = View.GONE
                playerView.visibility = View.VISIBLE
                // PlayerView's own buffering indicator handles the visual.
                // Controls icon: treat buffering as "playing" since play was already requested.
                playerControls.updatePlayPauseIcon(isPlaying = true)
            }

            is PlayerUiState.Playing -> {
                loadingState.visibility = View.GONE
                errorState.visibility = View.GONE
                playerView.visibility = View.VISIBLE
                playerControls.updatePlayPauseIcon(state.isPlaying)
            }

            is PlayerUiState.Error -> {
                loadingState.visibility = View.GONE
                playerView.visibility = View.GONE
                errorState.visibility = View.VISIBLE
                errorMessage.text = state.message
                hideControls()
            }
        }
    }

    // ── Back / exit handling ─────────────────────────────────────────────────

    /**
     * Navigate back with an optional confirmation dialog when playback is active.
     *
     * Called from both the controls overlay Back button and [onBackPressed].
     * - If the player is **playing or buffering**: shows an [AlertDialog] asking the user
     *   to confirm they want to stop watching before releasing the player and finishing.
     *   Buffering is included because a stream in mid-buffer has already acquired tuner
     *   resources; the user should still be asked before abandoning it.
     * - Otherwise (Loading, Error): releases the player and finishes immediately.
     */
    private fun handleBackNavigation() {
        val state = viewModel.uiState.value
        if (state is PlayerUiState.Playing || state is PlayerUiState.Buffering) {
            AlertDialog.Builder(this)
                .setTitle(R.string.player_exit_dialog_title)
                .setMessage(R.string.player_exit_dialog_message)
                .setPositiveButton(R.string.player_exit_dialog_yes) { _, _ ->
                    viewModel.releasePlayer()
                    finish()
                }
                .setNegativeButton(R.string.player_exit_dialog_no) { dialog, _ ->
                    dialog.dismiss()
                    // Resume showing controls briefly so the user can see where they are
                    showControlsTemporarily()
                }
                .show()
        } else {
            viewModel.releasePlayer()
            finish()
        }
    }

    // ── Picture-in-Picture ───────────────────────────────────────────────────

    /**
     * Called by Android when the user navigates Home or switches apps.
     *
     * If the player is currently playing or buffering, automatically enter PiP mode
     * so the stream continues in the corner of the screen (16:9 aspect ratio).
     * This matches the user expectation for video apps: pressing Home should minimise,
     * not stop, the video.
     *
     * [PictureInPictureParams.Builder.setAutoEnterEnabled] (API 31+) tells Android to
     * animate the transition using the player view's bounds, giving a smooth zoom-into-PiP
     * effect. [setSourceRectHint] provides the on-screen bounds of the video surface so
     * the system can calculate the correct animation start rect.
     *
     * On API 28–30, `setAutoEnterEnabled` is not available so the builder omits it; the
     * transition is still correct, just without the animated auto-enter shortcut.
     */
    override fun onUserLeaveHint() {
        super.onUserLeaveHint()
        val state = viewModel.uiState.value
        if (state is PlayerUiState.Playing || state is PlayerUiState.Buffering) {
            val sourceRect = Rect()
            playerView.getGlobalVisibleRect(sourceRect)
            val builder = PictureInPictureParams.Builder()
                .setAspectRatio(Rational(PIP_ASPECT_RATIO_WIDTH, PIP_ASPECT_RATIO_HEIGHT))
                .setSourceRectHint(sourceRect)
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                builder.setAutoEnterEnabled(true)
            }
            enterPictureInPictureMode(builder.build())
        }
    }

    /**
     * Called whenever PiP mode is entered or exited.
     *
     * - **Entering PiP**: hide all overlay UI (controls, loading bar, error panel) so
     *   only the raw video surface is visible in the small PiP window.
     * - **Leaving PiP**: restore the correct UI for the current playback state so the
     *   activity looks right when it re-expands to full screen.
     *
     * Note: the player itself continues running in both cases — this method only
     * manages overlay visibility.
     *
     * @param isInPictureInPictureMode `true` when entering PiP, `false` when leaving.
     * @param newConfig The [Configuration] after the mode change.
     */
    override fun onPictureInPictureModeChanged(
        isInPictureInPictureMode: Boolean,
        newConfig: Configuration
    ) {
        super.onPictureInPictureModeChanged(isInPictureInPictureMode, newConfig)
        if (isInPictureInPictureMode) {
            // PiP window is tiny — hide every overlay so only raw video is shown
            playerControls.visibility = View.GONE
            loadingState.visibility = View.GONE
            errorState.visibility = View.GONE
            controlsHandler.removeCallbacks(hideControlsRunnable)
        } else {
            // Re-entering full-screen: re-render the current state so overlays are correct
            renderState(viewModel.uiState.value)
        }
    }

    companion object {
        const val EXTRA_TUNER_ID = "tuner_id"
        const val EXTRA_CHANNEL_ID = "channel_id"
        const val EXTRA_SERVER_URL = "server_url"
        const val EXTRA_CHANNEL_NUMBER = "channel_number"
        const val EXTRA_CHANNEL_NAME = "channel_name"

        /** Duration (ms) before the controls overlay auto-hides after the last interaction. */
        private const val CONTROLS_HIDE_DELAY_MS = 3_000L

        /** 16:9 PiP aspect ratio numerator. */
        private const val PIP_ASPECT_RATIO_WIDTH = 16

        /** 16:9 PiP aspect ratio denominator. */
        private const val PIP_ASPECT_RATIO_HEIGHT = 9

        /** D-pad key codes that should trigger the controls overlay. */
        private val NAVIGATION_KEYS = setOf(
            KeyEvent.KEYCODE_DPAD_UP,
            KeyEvent.KEYCODE_DPAD_DOWN,
            KeyEvent.KEYCODE_DPAD_LEFT,
            KeyEvent.KEYCODE_DPAD_RIGHT,
            KeyEvent.KEYCODE_DPAD_CENTER
        )

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
