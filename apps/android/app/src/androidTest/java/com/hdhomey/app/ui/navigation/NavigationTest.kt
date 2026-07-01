package com.hdhomey.app.ui.navigation

import androidx.compose.ui.test.assertIsDisplayed
import androidx.compose.ui.test.junit4.v2.createAndroidComposeRule
import androidx.compose.ui.test.onNodeWithText
import androidx.test.ext.junit.runners.AndroidJUnit4
import com.hdhomey.app.MainActivity
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith

/**
 * Smoke test verifying the Compose navigation setup in [MainActivity].
 *
 * Launches the main activity and asserts that the initial screen (ServerList)
 * displays its top-bar title so that navigation, theming, and basic Compose
 * rendering are all wired correctly.
 */
@RunWith(AndroidJUnit4::class)
class NavigationTest {

    @get:Rule
    val composeTestRule = createAndroidComposeRule<MainActivity>()

    /**
     * Verifies that the app launches and the ServerList screen is shown.
     *
     * The top app bar must display "Your Servers" as its title, confirming that:
     * - [MainActivity] inflates the Compose content without crashing.
     * - [AppNavHost] navigates to the [ServerList] start destination.
     * - The ServerList composable renders its [TopAppBar] with the expected title.
     */
    @Test
    fun appLaunchesShowsServerList() {
        composeTestRule.onNodeWithText("Your Servers").assertIsDisplayed()
    }
}
