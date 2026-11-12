package com.hdhomey.app.ui.servers

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.assertIsEnabled
import androidx.compose.ui.test.assertIsNotEnabled
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithTag
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.compose.ui.test.performTextInput
import androidx.navigation.NavController
import com.hdhomey.app.ui.components.AsyncState
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
 * Compose UI tests for [AddServerScreen].
 *
 * Verifies form rendering, URL validation feedback, and the Connect button's
 * enabled/disabled state transitions during connection testing.
 *
 * Uses Compose 1.11 v2 test APIs ([createComposeRule]).
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class AddServerScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    /**
     * Shared mock [AddServerViewModel]. The `connectionState` property is backed by a
     * real [MutableStateFlow] so that the screen's
     * [androidx.lifecycle.compose.collectAsStateWithLifecycle] call works correctly.
     */
    private val connectionState = MutableStateFlow<AsyncState<Boolean>>(AsyncState.Success(false))

    private val mockViewModel: AddServerViewModel = mockk<AddServerViewModel>(relaxed = true).apply {
        every { connectionState } returns this@AddServerScreenTest.connectionState.asStateFlow()
        every { validateUrl(any()) } returns null
    }

    private val mockNavController: NavController = mockk(relaxed = true)

    // ── Form rendering ─────────────────────────────────────────────────────────

    @Test
    fun formRendersWithTitleFieldsAndButtons() {
        composeTestRule.setContent {
            HdHomeyTheme {
                AddServerScreen(
                    viewModel = mockViewModel,
                    navController = mockNavController
                )
            }
        }

        // Title
        composeTestRule.onNodeWithText("Add Server").assertIsDisplayed()

        // Text fields (findable via label text)
        composeTestRule.onNodeWithText("Server Name").assertIsDisplayed()
        composeTestRule.onNodeWithText("Server URL").assertIsDisplayed()

        // Buttons
        composeTestRule.onNodeWithText("Connect").assertIsDisplayed()
        composeTestRule.onNodeWithText("Cancel").assertIsDisplayed()
    }

    // ── URL validation ─────────────────────────────────────────────────────────

    @Test
    fun urlValidationErrorShownForInvalidUrl() {
        // Make validateUrl return an error for any URL
        every { mockViewModel.validateUrl(any()) } returns "Invalid URL format"

        composeTestRule.setContent {
            HdHomeyTheme {
                AddServerScreen(
                    viewModel = mockViewModel,
                    navController = mockNavController
                )
            }
        }

        // Type a server name to pass the name-required check
        composeTestRule.onNodeWithTag("server_name_field").performTextInput("My Server")

        // Click Connect to trigger validation
        composeTestRule.onNodeWithText("Connect").performClick()

        // Verify the URL validation error is displayed
        composeTestRule.onNodeWithText("Invalid URL format").assertIsDisplayed()
    }

    // ── Connect button states ──────────────────────────────────────────────────

    @Test
    fun connectButtonEnabledWhenIdleAndDisabledWhenLoading() {
        composeTestRule.setContent {
            HdHomeyTheme {
                AddServerScreen(
                    viewModel = mockViewModel,
                    navController = mockNavController
                )
            }
        }

        // Initially idle — button is enabled
        composeTestRule.onNodeWithText("Connect").assertIsEnabled()

        // Set connection state to Loading — button becomes disabled
        connectionState.value = AsyncState.Loading
        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithText("Testing connection\u2026").assertIsDisplayed()
        composeTestRule.onNodeWithText("Testing connection\u2026").assertIsNotEnabled()

        // Restore idle — button re-enables
        connectionState.value = AsyncState.Success(false)
        composeTestRule.waitForIdle()

        composeTestRule.onNodeWithText("Connect").assertIsEnabled()
    }
}
