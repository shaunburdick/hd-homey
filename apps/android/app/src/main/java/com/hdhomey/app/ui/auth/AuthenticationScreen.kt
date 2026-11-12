package com.hdhomey.app.ui.auth

import androidx.activity.compose.BackHandler
import androidx.compose.foundation.Image
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.OutlinedButton
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.graphics.painter.BitmapPainter
import androidx.compose.ui.text.TextStyle
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.hilt.navigation.compose.hiltViewModel
import androidx.lifecycle.compose.collectAsStateWithLifecycle
import kotlinx.coroutines.delay
import com.hdhomey.app.ui.components.adaptiveValues
import com.hdhomey.app.ui.theme.HdHomeyBlue

/**
 * Authentication (device code pairing) screen composable.
 *
 * Implements the OAuth 2.0 Device Authorization Flow:
 * 1. Calls [AuthenticationViewModel.startPairing] on first composition to
 *    fetch a device code and QR code from the remote server.
 * 2. Displays the 6-character device code prominently (96 sp monospace) on a
 *    [Surface] chip so the user can enter it on another device.
 * 3. Renders the QR code bitmap (when available) via [Image] + [BitmapPainter].
 * 4. Shows a live countdown timer ("Expires in X:XX") that ticks every second
 *    based on [AuthenticationUiState.expiresAt].
 * 5. Shows a subtle "Waiting for authorization..." text while [isPolling] is
 *    true.
 * 6. Reacts to state changes:
 *    - [isExpired]: Displays "Code expired" + a "Try Again" button.
 *    - [errorMessage]: Shows the error text with "Try Again" and "Cancel" buttons.
 *    - [isAuthorized]: Invokes [onAuthorized] callback with (serverId, serverName).
 * 7. [BackHandler] calls [AuthenticationViewModel.cancelPolling] and then
 *    [onBack] so the caller can navigate away cleanly.
 *
 * Adapts layout to TV vs phone form factors using [adaptiveValues] — TV screens
 * receive wider horizontal margins (48 dp) and larger content spacing.
 *
 * @param serverId The server ID to authenticate against (from the navigation route).
 * @param serverName The human-readable server name displayed in the title.
 * @param viewModel The [AuthenticationViewModel]; defaults to [hiltViewModel] injection.
 * @param onBack Callback invoked when the user presses back or cancels pairing.
 * @param onAuthorized Callback invoked with (serverId, serverName) when authorization
 *   succeeds, so the caller can navigate to the [com.hdhomey.app.ui.success.SuccessScreen].
 */
@Composable
fun AuthenticationScreen(
    serverId: String,
    serverName: String,
    viewModel: AuthenticationViewModel = hiltViewModel(),
    onBack: () -> Unit = {},
    onAuthorized: (serverId: String, serverName: String) -> Unit = { _, _ -> }
) {
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()
    val adaptive = adaptiveValues()

    // ── Countdown state ──────────────────────────────────────────────────────
    var remainingMillis by remember { mutableStateOf(0L) }

    // ── Kick off pairing on first composition ────────────────────────────────
    LaunchedEffect(serverId) {
        viewModel.startPairing(serverId)
    }

    // ── Countdown ticker ─────────────────────────────────────────────────────
    // Restarts whenever expiresAt changes (e.g. on retry).
    LaunchedEffect(uiState.expiresAt) {
        if (uiState.expiresAt > 0L) {
            while (true) {
                val now = System.currentTimeMillis()
                val remaining = uiState.expiresAt - now
                if (remaining <= 0L) {
                    remainingMillis = 0L
                    break
                }
                remainingMillis = remaining
                delay(1000L)
            }
        }
    }

    // ── Navigate on authorization success ────────────────────────────────────
    LaunchedEffect(uiState.isAuthorized) {
        if (uiState.isAuthorized) {
            viewModel.cancelPolling()
            onAuthorized(serverId, serverName)
        }
    }

    // ── Back press handling ──────────────────────────────────────────────────
    BackHandler {
        viewModel.cancelPolling()
        onBack()
    }

    // ── Screen content ───────────────────────────────────────────────────────
    Column(
        modifier = Modifier
            .fillMaxSize()
            .verticalScroll(rememberScrollState())
            .padding(horizontal = adaptive.screenPadding),
        horizontalAlignment = Alignment.CenterHorizontally,
        verticalArrangement = Arrangement.Center
    ) {
        // ── Title ────────────────────────────────────────────────────────────
        Text(
            text = "Pair with $serverName",
            style = MaterialTheme.typography.headlineMedium,
            fontWeight = FontWeight.Bold,
            color = MaterialTheme.colorScheme.primary,
            textAlign = TextAlign.Center,
            maxLines = 2,
            overflow = TextOverflow.Ellipsis
        )

        Spacer(modifier = Modifier.height(adaptive.contentSpacing))

        // ── Loading indicator (initial fetch) ────────────────────────────────
        if (uiState.deviceCode.isEmpty() && uiState.errorMessage == null && !uiState.isExpired) {
            CircularProgressIndicator(
                color = MaterialTheme.colorScheme.primary,
                modifier = Modifier.size(48.dp)
            )
        }

        // ── Device code chip ─────────────────────────────────────────────────
        if (uiState.deviceCode.isNotEmpty()) {
            Surface(
                shape = RoundedCornerShape(16.dp),
                color = MaterialTheme.colorScheme.surfaceVariant
            ) {
                Text(
                    text = uiState.deviceCode,
                    style = TextStyle(
                        fontSize = 96.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold
                    ),
                    color = MaterialTheme.colorScheme.onSurface,
                    textAlign = TextAlign.Center,
                    modifier = Modifier.padding(horizontal = 32.dp, vertical = 16.dp)
                )
            }

            Spacer(modifier = Modifier.height(adaptive.contentSpacing))
        }

        // ── QR code ──────────────────────────────────────────────────────────
        uiState.qrCodeBitmap?.let { bitmap ->
            Image(
                painter = BitmapPainter(bitmap.asImageBitmap()),
                contentDescription = "Pairing QR code",
                modifier = Modifier.size(250.dp)
            )

            Spacer(modifier = Modifier.height(adaptive.contentSpacing))
        }

        // ── Expired state ────────────────────────────────────────────────────
        if (uiState.isExpired) {
            Text(
                text = "Code expired",
                style = MaterialTheme.typography.bodyLarge,
                fontWeight = FontWeight.Bold,
                color = MaterialTheme.colorScheme.error,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(16.dp))
        }

        // ── Error message ────────────────────────────────────────────────────
        val errorMessage = uiState.errorMessage
        if (errorMessage != null && !uiState.isExpired) {
            Text(
                text = errorMessage,
                style = MaterialTheme.typography.bodyMedium,
                color = MaterialTheme.colorScheme.error,
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(16.dp))
        }

        // ── Countdown timer ──────────────────────────────────────────────────
        if (uiState.expiresAt > 0L && !uiState.isExpired && !uiState.isAuthorized) {
            val minutes = (remainingMillis / 60000).toInt().coerceAtLeast(0)
            val seconds = ((remainingMillis % 60000) / 1000).toInt().coerceAtLeast(0)
            Text(
                text = "Expires in $minutes:${seconds.toString().padStart(2, '0')}",
                style = MaterialTheme.typography.bodyMedium,
                color = if (remainingMillis < 60_000L) {
                    MaterialTheme.colorScheme.error
                } else {
                    MaterialTheme.colorScheme.onSurfaceVariant
                },
                textAlign = TextAlign.Center
            )

            Spacer(modifier = Modifier.height(8.dp))
        }

        // ── Polling status ───────────────────────────────────────────────────
        if (uiState.isPolling && !uiState.isExpired && uiState.errorMessage == null) {
            Text(
                text = "Waiting for authorization...",
                style = MaterialTheme.typography.bodySmall,
                color = MaterialTheme.colorScheme.onSurfaceVariant,
                textAlign = TextAlign.Center
            )
        }

        // ── Action buttons (error / expired states) ──────────────────────────
        if (uiState.errorMessage != null || uiState.isExpired) {
            Spacer(modifier = Modifier.height(8.dp))

            Row(
                horizontalArrangement = Arrangement.spacedBy(12.dp),
                verticalAlignment = Alignment.CenterVertically
            ) {
                OutlinedButton(onClick = {
                    viewModel.cancelPolling()
                    onBack()
                }) {
                    Text("Cancel")
                }

                Button(
                    onClick = { viewModel.retryPairing() },
                    colors = ButtonDefaults.buttonColors(
                        containerColor = HdHomeyBlue
                    )
                ) {
                    Text("Try Again")
                }
            }
        }
    }
}
