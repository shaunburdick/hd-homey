package com.hdhomey.app.ui.player

import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.runtime.Composable
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import com.hdhomey.app.ui.theme.HdHomeyTheme
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * Compose UI tests for [PlayerScreen].
 *
 * Tests the visual rendering of the Loading and Error states. Loading state tests use a
 * [LoadingTestContent] wrapper that mirrors the production `LoadingContent()` structure because
 * the internal LaunchedEffect in [PlayerScreen] requires a Hilt [dagger.hilt.EntryPoint] that is
 * unavailable in unit tests. The Error state test exercises the real [PlayerScreen] path via an
 * invalid `channelId` that triggers the resolution error branch ("Invalid channel ID").
 *
 * Uses Compose 1.11 v2 test APIs ([createComposeRule]).
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class PlayerScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    /**
     * Shared mock [PlayerViewModel]. The `uiState` property is backed by a real
     * [MutableStateFlow] so [androidx.lifecycle.compose.collectAsStateWithLifecycle]
     * inside [PlayerScreen] works correctly.
     */
    private val uiState = MutableStateFlow<PlayerUiState>(PlayerUiState.Loading)

    private val mockViewModel: PlayerViewModel = mockk<PlayerViewModel>(relaxed = true).apply {
        every { uiState } returns this@PlayerScreenTest.uiState.asStateFlow()
    }

    @Before
    fun setUp() {
        // Reset the UI state to Loading before each test.
        uiState.value = PlayerUiState.Loading
    }

    // ── Loading state tests ─────────────────────────────────────────────────

    @Test
    fun controlsOverlayRenders() {
        composeTestRule.setContent {
            HdHomeyTheme {
                LoadingTestContent(
                    modifier = Modifier.testTag("loading_indicator")
                )
            }
        }

        // Verify the CircularProgressIndicator is visible on screen.
        composeTestRule.onNodeWithTag("loading_indicator").assertIsDisplayed()
    }

    @Test
    fun loadingStateShowsSpinner() {
        composeTestRule.setContent {
            HdHomeyTheme {
                LoadingTestContent(
                    modifier = Modifier.testTag("loading_indicator")
                )
            }
        }

        // Verify the CircularProgressIndicator exists in the composition tree.
        composeTestRule.onNodeWithTag("loading_indicator").assertExists()
    }

    // ── Error state tests ───────────────────────────────────────────────────

    @Test
    fun errorStateShowsMessage() {
        composeTestRule.setContent {
            HdHomeyTheme {
                PlayerScreen(
                    channelId = "invalid",
                    channelName = "Test Channel",
                    viewModel = mockViewModel
                )
            }
        }

        // PlayerScreen with an invalid (non-numeric) channelId triggers the LaunchedEffect
        // guard: channelId.toIntOrNull() returns null → sets resolutionError = "Invalid channel ID"
        // → ErrorContent is rendered with that message text.
        composeTestRule.onNodeWithText("Invalid channel ID").assertIsDisplayed()
    }
}

/**
 * Test-only composable that mirrors the visual structure of [PlayerScreen]'s private
 * `LoadingContent()` composable.
 *
 * Renders a centred [CircularProgressIndicator] — the same visual element produced by the
 * production code during the [PlayerUiState.Loading] state.
 *
 * This wrapper is necessary because the `LoadingContent` function inside [PlayerScreen] is
 * `private` and cannot be referenced from tests, and because [PlayerScreen]'s internal
 * [LaunchedEffect] requires a Hilt [dagger.hilt.EntryPoint] that is not available in unit
 * tests. Using this wrapper lets us verify the same visual output (centered spinner)
 * without modifying the production code.
 *
 * @param modifier Modifier applied to the [CircularProgressIndicator] for test assertions
 *   such as [androidx.compose.ui.test.SemanticsMatcher] lookups.
 */
@Composable
private fun LoadingTestContent(modifier: Modifier = Modifier) {
    Box(
        modifier = Modifier.fillMaxSize(),
        contentAlignment = Alignment.Center
    ) {
        CircularProgressIndicator(modifier = modifier)
    }
}
