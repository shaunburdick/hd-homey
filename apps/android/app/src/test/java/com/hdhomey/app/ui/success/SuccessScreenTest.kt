package com.hdhomey.app.ui.success

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createComposeRule
import androidx.compose.ui.test.onNodeWithContentDescription
import androidx.compose.ui.test.onNodeWithText
import androidx.compose.ui.test.performClick
import androidx.navigation.NavController
import com.hdhomey.app.ui.theme.HdHomeyTheme
import io.mockk.mockk
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

/**
 * Compose UI tests for [SuccessScreen].
 *
 * Verifies the checkmark icon, the "You're Connected!" title, and that both
 * action buttons ("View Channels", "Back to Servers") are rendered and clickable.
 *
 * Uses Compose 1.11 v2 test APIs ([createComposeRule]).
 */
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28])
class SuccessScreenTest {

    @get:Rule
    val composeTestRule = createComposeRule()

    private val mockNavController: NavController = mockk(relaxed = true)

    @Test
    fun checkmarkIconVisible() {
        composeTestRule.setContent {
            HdHomeyTheme {
                SuccessScreen(
                    serverName = "Test Server",
                    serverId = "test-id",
                    navController = mockNavController
                )
            }
        }

        composeTestRule.onNodeWithContentDescription("Authentication successful")
            .assertIsDisplayed()
    }

    @Test
    fun youreConnectedTitleVisible() {
        composeTestRule.setContent {
            HdHomeyTheme {
                SuccessScreen(
                    serverName = "Test Server",
                    serverId = "test-id",
                    navController = mockNavController
                )
            }
        }

        composeTestRule.onNodeWithText("You're Connected!").assertIsDisplayed()
    }

    @Test
    fun viewChannelsButtonClickable() {
        composeTestRule.setContent {
            HdHomeyTheme {
                SuccessScreen(
                    serverName = "Test Server",
                    serverId = "test-id",
                    navController = mockNavController
                )
            }
        }

        composeTestRule.onNodeWithText("View Channels").assertIsDisplayed()
        composeTestRule.onNodeWithText("View Channels").performClick()
    }

    @Test
    fun backToServersButtonClickable() {
        composeTestRule.setContent {
            HdHomeyTheme {
                SuccessScreen(
                    serverName = "Test Server",
                    serverId = "test-id",
                    navController = mockNavController
                )
            }
        }

        composeTestRule.onNodeWithText("Back to Servers").assertIsDisplayed()
        composeTestRule.onNodeWithText("Back to Servers").performClick()
    }
}
