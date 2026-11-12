package com.hdhomey.app.ui.channels

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.navigation.NavController
import com.hdhomey.app.domain.model.Channel
import com.hdhomey.app.domain.model.ChannelWithMetadata
import com.hdhomey.app.ui.theme.HdHomeyTheme
import io.mockk.every
import io.mockk.mockk
import io.mockk.verify
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.asStateFlow
import org.junit.Before
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * Compose UI tests for [ChannelListScreen].
 *
 * Tests each UI state (Loading, Error, Success, Empty) by providing a mock
 * [ChannelListViewModel] whose [ChannelListViewModel.uiState] property is
 * backed by a real [MutableStateFlow] so that
 * [androidx.lifecycle.compose.collectAsStateWithLifecycle] inside the screen
 * works correctly.
 *
 * Uses Compose 1.11 v2 test APIs ([createComposeRule]).
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class ChannelListScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    /**
     * Shared mock [ChannelListViewModel]. The `uiState` property is backed by
     * a real [MutableStateFlow] so that
     * [androidx.lifecycle.compose.collectAsStateWithLifecycle] inside
     * [ChannelListScreen] receives updates synchronously.
     */
    private val uiState = MutableStateFlow<ChannelListUiState>(ChannelListUiState.Loading)

    private val mockViewModel: ChannelListViewModel = mockk<ChannelListViewModel>(relaxed = true).apply {
        every { this@apply.uiState } returns this@ChannelListScreenTest.uiState.asStateFlow()
    }

    private val mockNavController: NavController = mockk(relaxed = true)

    @Before
    fun setUp() {
        // Reset the UI state to Loading before each test.
        uiState.value = ChannelListUiState.Loading
    }

    // ── Loading state tests ─────────────────────────────────────────────────

    @Test
    fun loadingSkeletonRenders() {
        composeTestRule.setContent {
            HdHomeyTheme {
                ChannelListScreen(
                    viewModel = mockViewModel,
                    navController = mockNavController
                )
            }
        }

        // The loading skeleton (shimmer cards) is identified via a dedicated
        // test tag applied in the production composable's Loading branch.
        composeTestRule.onNodeWithTag("channel_list_loading").assertIsDisplayed()
    }

    // ── Error state tests ───────────────────────────────────────────────────

    @Test
    fun errorStateShowsMessageAndRetryButton() {
        uiState.value = ChannelListUiState.Error(
            message = "Failed to load channels",
            isRetryable = true
        )

        composeTestRule.setContent {
            HdHomeyTheme {
                ChannelListScreen(
                    viewModel = mockViewModel,
                    navController = mockNavController
                )
            }
        }

        // The error message text is rendered by ChannelListErrorContent.
        composeTestRule.onNodeWithText("Failed to load channels").assertIsDisplayed()
        // The retry button is shown when isRetryable is true.
        composeTestRule.onNodeWithText("Try Again").assertIsDisplayed()
    }

    @Test
    fun errorRetryButtonCallsRetryLoad() {
        uiState.value = ChannelListUiState.Error(
            message = "Network error",
            isRetryable = true
        )

        composeTestRule.setContent {
            HdHomeyTheme {
                ChannelListScreen(
                    viewModel = mockViewModel,
                    navController = mockNavController
                )
            }
        }

        // Clicking "Try Again" should invoke retryLoad() on the ViewModel.
        composeTestRule.onNodeWithText("Try Again").performClick()
        verify { mockViewModel.retryLoad() }
    }

    // ── Success state tests ─────────────────────────────────────────────────

    @Test
    fun channelCardsRenderWithNames() {
        val channels = listOf(
            ChannelWithMetadata(
                channel = Channel(id = 1, tunerId = 1, number = "2.1", name = "CBS", isHd = true),
                isFavorite = false,
                isHidden = false
            ),
            ChannelWithMetadata(
                channel = Channel(id = 2, tunerId = 1, number = "4.1", name = "NBC", isHd = false),
                isFavorite = true,
                isHidden = false
            )
        )
        uiState.value = ChannelListUiState.Success(
            channels = channels,
            tunerName = "Living Room"
        )

        composeTestRule.setContent {
            HdHomeyTheme {
                ChannelListScreen(
                    viewModel = mockViewModel,
                    navController = mockNavController
                )
            }
        }

        // Both channel names should be rendered as Text inside ChannelCard.
        composeTestRule.onNodeWithText("CBS").assertIsDisplayed()
        composeTestRule.onNodeWithText("NBC").assertIsDisplayed()
    }

    // ── Empty state tests ───────────────────────────────────────────────────

    @Test
    fun emptyStateShowsNoChannelsMessage() {
        uiState.value = ChannelListUiState.Empty

        composeTestRule.setContent {
            HdHomeyTheme {
                ChannelListScreen(
                    viewModel = mockViewModel,
                    navController = mockNavController
                )
            }
        }

        // The empty state composable renders the headline and explanation text.
        composeTestRule.onNodeWithText("No channels found").assertIsDisplayed()
        composeTestRule.onNodeWithText(
            "This tuner has no available channels."
        ).assertIsDisplayed()
    }
}
