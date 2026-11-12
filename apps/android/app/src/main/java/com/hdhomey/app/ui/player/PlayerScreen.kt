package com.hdhomey.app.ui.player

import androidx.activity.compose.BackHandler
import androidx.compose.animation.AnimatedVisibility
import androidx.compose.animation.fadeIn
import androidx.compose.animation.fadeOut
import androidx.compose.foundation.background
import androidx.compose.foundation.gestures.detectTapGestures
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.filled.ArrowBack
import androidx.compose.material.icons.filled.Pause
import androidx.compose.material.icons.filled.PlayArrow
import androidx.compose.material3.AlertDialog
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.DisposableEffect
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.viewinterop.AndroidView
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import androidx.media3.ui.PlayerView
import com.hdhomey.app.data.provider.CurrentServerProvider
import com.hdhomey.app.data.repository.ChannelRepository
import com.hdhomey.app.ui.theme.HdHomeyBlue
import dagger.hilt.EntryPoint
import dagger.hilt.InstallIn
import dagger.hilt.android.EntryPointAccessors
import dagger.hilt.components.SingletonComponent
import kotlinx.coroutines.async
import kotlinx.coroutines.coroutineScope
import kotlinx.coroutines.delay

// ── Hilt Entry Point ──────────────────────────────────────────────────────────

/**
 * Hilt [EntryPoint] for resolving singleton dependencies needed by the player
 * screen from the [SingletonComponent].
 *
 * Used because the PlayerScreen composable cannot use constructor injection.
 * [EntryPointAccessors.fromApplication] bridges the Hilt component graph into
 * the composable layer.
 */
@EntryPoint
@InstallIn(SingletonComponent::class)
interface PlayerScreenEntryPoint {
    fun currentServerProvider(): CurrentServerProvider
    fun channelRepository(): ChannelRepository
}

// ── Constants ─────────────────────────────────────────────────────────────────

/** Duration (ms) before the controls overlay auto-hides after the last interaction. */
private const val CONTROLS_HIDE_DELAY_MS = 3_000L

// ── Player Screen Composable ──────────────────────────────────────────────────

/**
 * Full-screen video player composable for live TV stream playback.
 *
 * Uses the existing [PlayerViewModel] (injected via [hiltViewModel]) to
 * manage ExoPlayer lifecycle and stream loading. Delegates the resolution of
 * server URL and tuner ID to a [LaunchedEffect] that queries the
 * [CurrentServerProvider] and [ChannelRepository] through a Hilt [EntryPoint]
 * defined in this file.
 *
 * **Navigation contract**:
 * - Called from `NavGraph` with `channelId` and `channelName` from the [Player] route.
 * - All other playback parameters (`serverUrl`, `tunerId`) are resolved internally
 *   during the first composition.
 *
 * **States**:
 * - [PlayerUiState.Loading]: Centered [CircularProgressIndicator].
 * - [PlayerUiState.Error]: Error message with an optional "Retry" button.
 * - [PlayerUiState.Playing] / [PlayerUiState.Buffering]: Video surface via
 *   [AndroidView] wrapping [PlayerView] + a controls overlay with auto-hide.
 *
 * **Controls overlay**:
 * - Top bar: back/exit [IconButton] + channel name on a semi-transparent [Surface].
 * - Center: large play/pause toggle icon (80 % opacity).
 * - Auto-hides after [CONTROLS_HIDE_DELAY_MS] (3 s); tap to toggle visibility.
 *
 * **Exit confirmation**:
 * - [BackHandler] shows an [AlertDialog] ("Stop watching?") when playback is
 *   active. The dialog offers "Stop" (releases player and navigates back) or
 *   "Keep Watching" (dismisses the dialog).
 *
 * @param channelId The channel ID string from the navigation route.
 * @param channelName The display name of the channel for the controls overlay.
 * @param viewModel The [PlayerViewModel]; defaults to [hiltViewModel] injection.
 * @param onNavigateBack Callback invoked when the user confirms exit.
 */
@Composable
fun PlayerScreen(
    channelId: String,
    channelName: String,
    viewModel: PlayerViewModel = hiltViewModel(),
    onNavigateBack: () -> Unit = {}
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val context = LocalContext.current
    var showExitDialog by remember { mutableStateOf(false) }

    // State for manual error handling when parameter resolution fails.
    var resolutionError by remember { mutableStateOf<String?>(null) }

    // ── Data Resolution ───────────────────────────────────────────────────
    // Resolve serverUrl and tunerId from existing singletons, then kick off
    // stream loading. Runs only once per channelId via LaunchedEffect key.

    LaunchedEffect(channelId) {
        resolutionError = null
        val channelIdInt = channelId.toIntOrNull()
        if (channelIdInt == null) {
            resolutionError = "Invalid channel ID"
            return@LaunchedEffect
        }

        try {
            val appContext = context.applicationContext
            val entryPoint = EntryPointAccessors.fromApplication(
                appContext,
                PlayerScreenEntryPoint::class.java
            )
            val server = entryPoint.currentServerProvider().getActiveServer()
            if (server == null) {
                resolutionError = "No server configured"
                return@LaunchedEffect
            }

            val serverUrl = server.url

            // Locate the tunerId by scanning each tuner's channel list.
            val tuners = entryPoint.channelRepository().getTuners(server)
            if (tuners.isEmpty()) {
                resolutionError = "No tuners available"
                return@LaunchedEffect
            }

            // Search all tuners in parallel for efficiency.
            val foundTunerId = coroutineScope {
                tuners.map { (tunerId, _) ->
                    async {
                        val channels = entryPoint.channelRepository()
                            .getChannels(server, tunerId)
                        if (channels.any { it.id == channelIdInt }) tunerId else null
                    }
                }.firstOrNull { it.await() != null }?.await()
            }

            if (foundTunerId == null) {
                resolutionError = "Channel not found on any tuner"
                return@LaunchedEffect
            }

            // All parameters resolved — start playback.
            viewModel.loadStream(serverUrl, foundTunerId, channelIdInt)
        } catch (e: Exception) {
            resolutionError = e.message ?: "Failed to load stream"
        }
    }

    // ── Lifecycle ─────────────────────────────────────────────────────────
    // Release the player when this composable leaves the composition so the
    // singleton ExoPlayer is ready for the next playback session.

    DisposableEffect(Unit) {
        onDispose {
            viewModel.releasePlayer()
        }
    }

    // ── Back Press Handling ───────────────────────────────────────────────
    // Show a confirmation dialog when the user presses Back during active
    // playback. Loading and Error states exit immediately.

    val isActivePlayback = uiState is PlayerUiState.Playing ||
        uiState is PlayerUiState.Buffering

    BackHandler(enabled = isActivePlayback || showExitDialog) {
        showExitDialog = true
    }

    // ── Exit Dialog ───────────────────────────────────────────────────────

    if (showExitDialog) {
        AlertDialog(
            onDismissRequest = { showExitDialog = false },
            title = { Text("Stop watching?") },
            text = {
                Text("Are you sure you want to stop watching $channelName?")
            },
            confirmButton = {
                TextButton(
                    onClick = {
                        showExitDialog = false
                        viewModel.releasePlayer()
                        onNavigateBack()
                    }
                ) {
                    Text("Stop")
                }
            },
            dismissButton = {
                TextButton(onClick = { showExitDialog = false }) {
                    Text("Keep Watching")
                }
            }
        )
    }

    // ── Screen Content ────────────────────────────────────────────────────

    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        // Resolution error is shown at the composable level because the
        // ViewModel's Error state is only reached after loadStream completes.
        if (resolutionError != null) {
            ErrorContent(
                message = resolutionError!!,
                isRetryable = false,
                onRetry = {}
            )
        } else {
            when (val state = uiState) {
                is PlayerUiState.Loading -> {
                    LoadingContent()
                }

                is PlayerUiState.Error -> {
                    ErrorContent(
                        message = state.message,
                        isRetryable = state.isRetryable,
                        onRetry = { viewModel.retryLoad() }
                    )
                }

                is PlayerUiState.Playing, is PlayerUiState.Buffering -> {
                    val isPlaying = (state as? PlayerUiState.Playing)?.isPlaying ?: true
                    PlayerVideoContent(
                        viewModel = viewModel,
                        channelName = channelName,
                        isPlaying = isPlaying,
                        onPlayPause = {
                            viewModel.playPause(!isPlaying)
                        },
                        onBack = {
                            showExitDialog = true
                        }
                    )
                }
            }
        }
    }
}

// ── Loading Content ───────────────────────────────────────────────────────────

/**
 * Full-screen centred [CircularProgressIndicator] displayed while the stream
 * URL is being generated or ExoPlayer is preparing.
 */
@Composable
private fun LoadingContent() {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        CircularProgressIndicator(
            color = MaterialTheme.colorScheme.primary
        )
    }
}

// ── Error Content ─────────────────────────────────────────────────────────────

/**
 * Error state displayed when stream loading or playback fails.
 *
 * Shows the error message and, for retryable errors, a "Retry" button that
 * invokes [onRetry].
 *
 * @param message Human-readable error description.
 * @param isRetryable Whether a retry button should be shown.
 * @param onRetry Callback invoked when the retry button is tapped.
 */
@Composable
private fun ErrorContent(
    message: String,
    isRetryable: Boolean,
    onRetry: () -> Unit
) {
    Column(
        modifier = Modifier
            .fillMaxSize()
            .padding(48.dp),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        Text(
            text = message,
            style = MaterialTheme.typography.bodyLarge,
            color = MaterialTheme.colorScheme.error,
            textAlign = TextAlign.Center
        )

        if (isRetryable) {
            Spacer(modifier = Modifier.height(24.dp))

            Button(
                onClick = onRetry,
                colors = ButtonDefaults.buttonColors(
                    containerColor = HdHomeyBlue
                )
            ) {
                Text("Retry")
            }
        }
    }
}

// ── Player Video Content ──────────────────────────────────────────────────────

/**
 * Video playback surface with a controls overlay.
 *
 * Renders the ExoPlayer video via [PlayerView] wrapped in [androidx.compose.ui.viewinterop.AndroidView].
 * The controls overlay (top bar, centre play/pause) auto-hides after
 * [CONTROLS_HIDE_DELAY_MS] of inactivity and can be toggled by tapping the
 * video area.
 *
 * @param viewModel The [PlayerViewModel] whose [PlayerViewModel.player] is
 *   attached to the [PlayerView].
 * @param channelName Display name shown in the top controls bar.
 * @param isPlaying Whether the stream is currently playing (affects play/pause icon).
 * @param onPlayPause Called when the play/pause button is tapped.
 * @param onBack Called when the back/exit button is tapped.
 */
@Composable
private fun PlayerVideoContent(
    viewModel: PlayerViewModel,
    channelName: String,
    isPlaying: Boolean,
    onPlayPause: () -> Unit,
    onBack: () -> Unit
) {
    var controlsVisible by remember { mutableStateOf(true) }

    // Auto-hide controls after the inactivity timeout.
    LaunchedEffect(controlsVisible) {
        if (controlsVisible) {
            delay(CONTROLS_HIDE_DELAY_MS)
            controlsVisible = false
        }
    }

    Box(modifier = Modifier.fillMaxSize()) {
        // Layer 1: Video surface — ExoPlayer PlayerView via interop.
        AndroidView(
            factory = { ctx: android.content.Context ->
                PlayerView(ctx).apply {
                    player = viewModel.player
                    useController = false
                }
            },
            modifier = Modifier.fillMaxSize()
        )

        // Layer 2: Transparent tap detector to toggle control visibility.
        // Placed below the controls but above the video so taps on the video
        // area toggle the overlay, while taps on control buttons are consumed
        // by their own click handlers.
        Box(
            modifier = Modifier
                .fillMaxSize()
                .pointerInput(Unit) {
                    detectTapGestures {
                        controlsVisible = !controlsVisible
                    }
                }
        )

        // Layer 3: Controls overlay with animated show/hide.
        AnimatedVisibility(
            visible = controlsVisible,
            enter = fadeIn(),
            exit = fadeOut(),
            modifier = Modifier.fillMaxSize()
        ) {
            ControlsOverlayContent(
                channelName = channelName,
                isPlaying = isPlaying,
                onPlayPause = onPlayPause,
                onBack = onBack
            )
        }
    }
}

// ── Controls Overlay Content ──────────────────────────────────────────────────

/**
 * Semi-transparent overlay with player controls.
 *
 * Layout:
 * - **Top bar**: Back/exit [IconButton] + channel name on a semi-transparent
 *   background [Surface] with horizontal 16 dp padding.
 * - **Centre**: Large play/pause [IconButton] (64 dp icon size, 80 % opacity).
 *
 * The entire overlay is semi-transparent (30 % black) so the video remains
 * partially visible beneath it.
 *
 * @param channelName Display name shown in the top bar.
 * @param isPlaying Whether the stream is currently playing (determines icon).
 * @param onPlayPause Called when the play/pause button is tapped.
 * @param onBack Called when the back/exit button is tapped.
 */
@Composable
private fun ControlsOverlayContent(
    channelName: String,
    isPlaying: Boolean,
    onPlayPause: () -> Unit,
    onBack: () -> Unit
) {
    Box(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black.copy(alpha = 0.3f))
    ) {
        // ── Top Bar ───────────────────────────────────────────────────────
        Surface(
            modifier = Modifier
                .fillMaxWidth()
                .align(Alignment.TopCenter),
            color = MaterialTheme.colorScheme.surface.copy(alpha = 0.7f)
        ) {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .padding(start = 4.dp, end = 16.dp, top = 8.dp, bottom = 8.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                // Back / Exit button
                IconButton(onClick = onBack) {
                    Icon(
                        imageVector = Icons.AutoMirrored.Filled.ArrowBack,
                        contentDescription = "Exit player",
                        tint = MaterialTheme.colorScheme.onSurface
                    )
                }

                // Channel name
                Text(
                    text = channelName,
                    style = MaterialTheme.typography.titleMedium,
                    color = MaterialTheme.colorScheme.onSurface,
                    maxLines = 1,
                    overflow = TextOverflow.Ellipsis,
                    modifier = Modifier.weight(1f)
                )
            }
        }

        // ── Centre Play / Pause ───────────────────────────────────────────
        IconButton(
            onClick = onPlayPause,
            modifier = Modifier
                .align(Alignment.Center)
                .size(80.dp)
        ) {
            Icon(
                imageVector = if (isPlaying) Icons.Default.Pause
                    else Icons.Default.PlayArrow,
                contentDescription = if (isPlaying) "Pause playback"
                    else "Resume playback",
                tint = Color.White.copy(alpha = 0.8f),
                modifier = Modifier.size(64.dp)
            )
        }
    }
}
