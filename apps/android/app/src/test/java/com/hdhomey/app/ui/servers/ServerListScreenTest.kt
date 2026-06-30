package com.hdhomey.app.ui.servers

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.navigation.NavController
import com.hdhomey.app.data.model.Server
import com.hdhomey.app.ui.components.AsyncState
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
 * Compose UI tests for [ServerListScreen].
 *
 * Tests the four visual states rendered by [AsyncStateContent]: Loading (shimmer),
 * Error (message + retry), Success (server cards), and Empty (welcome message).
 *
 * Uses a mock [ServerListViewModel] whose [ServerListViewModel.asyncState] flow is
 * backed by a real [MutableStateFlow] so each test can independently set the state
 * before composing the screen. Navigation is handled by a relaxed mock [NavController].
 *
 * Uses Compose 1.11 v2 test APIs ([createComposeRule]).
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class ServerListScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    /**
     * Shared mutable async state flow. Each test sets the desired state before
     * invoking [composeTestRule.setContent], and the [ServerListScreen] composable
     * picks it up via [androidx.lifecycle.compose.collectAsStateWithLifecycle].
     */
    private val asyncState = MutableStateFlow<AsyncState<List<Server>>>(AsyncState.Loading)

    /**
     * Mock [ServerListViewModel] with [asyncState] wired to the shared flow above
     * and [ServerListViewModel.getActiveServer] returning null (no active server).
     */
    private val mockViewModel: ServerListViewModel = mockk<ServerListViewModel>(relaxed = true).apply {
        every { asyncState } returns this@ServerListScreenTest.asyncState.asStateFlow()
        every { getActiveServer() } returns null
    }

    /**
     * Relaxed mock [NavController] — navigation actions are not invoked in these
     * tests (no click interactions).
     */
    private val mockNavController: NavController = mockk<NavController>(relaxed = true)

    @Before
    fun setUp() {
        // Reset to Loading before each test so state from a previous test doesn't leak.
        asyncState.value = AsyncState.Loading
    }

    // ── Loading state ─────────────────────────────────────────────────

    @Test
    fun shimmerLoadingStateRenders() {
        asyncState.value = AsyncState.Loading

        composeTestRule.setContent {
            HdHomeyTheme {
                ServerListScreen(
                    viewModel = mockViewModel,
                    navController = mockNavController
                )
            }
        }

        // The shimmer skeleton container is tagged with "server_list_loading".
        composeTestRule.onNodeWithTag("server_list_loading").assertExists()
    }

    // ── Error state ───────────────────────────────────────────────────

    @Test
    fun errorStateShowsMessageAndRetryButton() {
        val errorMessage = "Something went wrong"
        asyncState.value = AsyncState.Error(message = errorMessage)

        composeTestRule.setContent {
            HdHomeyTheme {
                ServerListScreen(
                    viewModel = mockViewModel,
                    navController = mockNavController
                )
            }
        }

        // Verify the error message and retry button are both displayed.
        composeTestRule.onNodeWithText(errorMessage).assertIsDisplayed()
        composeTestRule.onNodeWithText("Try Again").assertIsDisplayed()
    }

    // ── Success state ─────────────────────────────────────────────────

    @Test
    fun successStateShowsServerCards() {
        val servers = listOf(
            Server(id = "1", name = "Home Server", url = "http://192.168.1.100"),
            Server(id = "2", name = "Office Server", url = "http://192.168.1.200")
        )
        asyncState.value = AsyncState.Success(servers)

        composeTestRule.setContent {
            HdHomeyTheme {
                ServerListScreen(
                    viewModel = mockViewModel,
                    navController = mockNavController
                )
            }
        }

        // Each server card renders the server name as a Text composable.
        composeTestRule.onNodeWithText("Home Server").assertIsDisplayed()
        composeTestRule.onNodeWithText("Office Server").assertIsDisplayed()
    }

    // ── Empty state ───────────────────────────────────────────────────

    @Test
    fun emptyStateShowsWelcomeMessage() {
        asyncState.value = AsyncState.Success(emptyList())

        composeTestRule.setContent {
            HdHomeyTheme {
                ServerListScreen(
                    viewModel = mockViewModel,
                    navController = mockNavController
                )
            }
        }

        // The empty content renders "Welcome to HD Homey" as the heading.
        composeTestRule.onNodeWithText("Welcome to HD Homey").assertIsDisplayed()
    }
}
