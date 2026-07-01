package com.hdhomey.app.ui.auth

import android.graphics.Bitmap
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import com.hdhomey.app.ui.theme.HdHomeyTheme
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * Compose UI tests for [AuthenticationScreen].
 *
 * Verifies that the device code is prominently displayed, the QR code bitmap is
 * rendered when available, the live countdown expiry message is shown, and the
 * retry button appears when the code has expired.
 *
 * Uses Compose 1.11 v2 test APIs ([createComposeRule]).
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class AuthenticationScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    /**
     * Shared mock [AuthenticationViewModel]. The `uiState` property is backed by a
     * real [MutableStateFlow] so that the screen's
     * [androidx.lifecycle.compose.collectAsStateWithLifecycle] call works correctly.
     */
    private val uiState = MutableStateFlow(AuthenticationUiState())

    private val mockViewModel: AuthenticationViewModel = mockk<AuthenticationViewModel>(relaxed = true).apply {
        every { uiState } returns this@AuthenticationScreenTest.uiState.asStateFlow()
    }

    // ── Device code ────────────────────────────────────────────────────────────

    @Test
    fun deviceCodeDisplaysProminently() {
        uiState.value = AuthenticationUiState(
            deviceCode = "ABC123",
            isPolling = true
        )

        composeTestRule.setContent {
            HdHomeyTheme {
                AuthenticationScreen(
                    serverId = "test-server",
                    serverName = "Test Server",
                    viewModel = mockViewModel
                )
            }
        }

        composeTestRule.onNodeWithText("ABC123").assertIsDisplayed()
    }

    // ── QR code ────────────────────────────────────────────────────────────────

    @Test
    fun qrCodeRendersWhenBitmapAvailable() {
        val qrBitmap = Bitmap.createBitmap(100, 100, Bitmap.Config.ARGB_8888)
        uiState.value = AuthenticationUiState(
            deviceCode = "ABC123",
            qrCodeBitmap = qrBitmap,
            isPolling = true
        )

        composeTestRule.setContent {
            HdHomeyTheme {
                AuthenticationScreen(
                    serverId = "test-server",
                    serverName = "Test Server",
                    viewModel = mockViewModel
                )
            }
        }

        composeTestRule.onNodeWithContentDescription("Pairing QR code")
            .assertIsDisplayed()
    }

    // ── Expiry message ─────────────────────────────────────────────────────────

    @Test
    fun expiryMessageShownWhenExpiresAtSet() {
        // Set expiresAt far enough in the future that the initial LaunchedEffect
        // tick computes a positive remainingMillis before the delay fires.
        uiState.value = AuthenticationUiState(
            deviceCode = "ABC123",
            expiresAt = System.currentTimeMillis() + 300_000L,
            isPolling = true
        )

        composeTestRule.setContent {
            HdHomeyTheme {
                AuthenticationScreen(
                    serverId = "test-server",
                    serverName = "Test Server",
                    viewModel = mockViewModel
                )
            }
        }

        composeTestRule.waitForIdle()

        // The countdown text is "Expires in M:SS" — match as a substring since the
        // exact seconds value depends on timing granularity.
        composeTestRule.onNodeWithText("Expires in", substring = true).assertIsDisplayed()
    }

    // ── Expired state / retry button ───────────────────────────────────────────

    @Test
    fun retryButtonVisibleWhenExpired() {
        uiState.value = AuthenticationUiState(
            deviceCode = "ABC123",
            isExpired = true
        )

        composeTestRule.setContent {
            HdHomeyTheme {
                AuthenticationScreen(
                    serverId = "test-server",
                    serverName = "Test Server",
                    viewModel = mockViewModel
                )
            }
        }

        composeTestRule.onNodeWithText("Code expired").assertIsDisplayed()
        composeTestRule.onNodeWithText("Try Again").assertIsDisplayed()
    }
}
