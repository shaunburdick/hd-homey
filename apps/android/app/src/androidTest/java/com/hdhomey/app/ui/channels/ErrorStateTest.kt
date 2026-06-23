package com.hdhomey.app.ui.channels

import android.content.Intent
import android.view.View
import androidx.test.core.app.ActivityScenario
import androidx.test.core.app.ApplicationProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.filters.LargeTest
import com.hdhomey.app.R
import com.hdhomey.app.ui.player.PlayerActivity
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotNull
import org.junit.Test
import org.junit.runner.RunWith

/**
 * T105 — Espresso UI tests for error state and retry button in [PlayerActivity].
 *
 * Verifies that:
 * - The error state container is present in the view hierarchy.
 * - The retry button is inflated, focusable, and enabled (D-pad accessible on TV).
 * - The loading state is the initial visible state (before any stream load completes).
 * - The error state is hidden on launch (correct initial visibility).
 *
 * These tests do not trigger an actual error; they validate the structural
 * readiness of the error-state UI so that [PlayerActivity.renderState] can safely
 * switch to it at runtime without a view-not-found crash.
 */
@RunWith(AndroidJUnit4::class)
@LargeTest
class ErrorStateTest {

    /** Convenience builder for a [PlayerActivity] intent with placeholder values. */
    private fun buildPlayerIntent(): Intent =
        Intent(ApplicationProvider.getApplicationContext(), PlayerActivity::class.java).apply {
            putExtra(PlayerActivity.EXTRA_TUNER_ID, 1)
            putExtra(PlayerActivity.EXTRA_CHANNEL_ID, 1)
            putExtra(PlayerActivity.EXTRA_SERVER_URL, "http://localhost:3000")
            putExtra(PlayerActivity.EXTRA_CHANNEL_NUMBER, "5.1")
            putExtra(PlayerActivity.EXTRA_CHANNEL_NAME, "Test Channel")
        }

    /**
     * Verifies that the error state container and all its child views are
     * present in the inflated layout.
     *
     * Guards against accidental removal of error-state views from
     * [activity_player.xml] that would cause a silent [NullPointerException]
     * when [PlayerActivity] tries to render an error.
     */
    @Test
    fun errorStateViewsAreInflated() {
        val scenario = ActivityScenario.launch<PlayerActivity>(buildPlayerIntent())
        scenario.onActivity { activity ->
            assertNotNull(
                "player_error_state container must be inflated",
                activity.findViewById<View>(R.id.player_error_state)
            )
            assertNotNull(
                "player_error_message TextView must be inflated",
                activity.findViewById<View>(R.id.player_error_message)
            )
            assertNotNull(
                "player_retry_button must be inflated",
                activity.findViewById<View>(R.id.player_retry_button)
            )
        }
        scenario.close()
    }

    /**
     * Verifies that the retry button is focusable and enabled on initial launch.
     *
     * On Android TV, D-pad navigation requires [View.isFocusable] to be `true`.
     * A non-focusable retry button would be unreachable without a touchscreen,
     * which is not guaranteed on TV hardware.
     */
    @Test
    fun retryButtonIsFocusableAndEnabled() {
        val scenario = ActivityScenario.launch<PlayerActivity>(buildPlayerIntent())
        scenario.onActivity { activity ->
            val retryButton = activity.findViewById<android.widget.Button>(R.id.player_retry_button)
            assertNotNull("player_retry_button must exist", retryButton)
            assertEquals("retry button must be focusable for D-pad nav", true, retryButton.isFocusable)
            assertEquals("retry button must be enabled", true, retryButton.isEnabled)
        }
        scenario.close()
    }

    /**
     * Verifies that the loading state is VISIBLE and the error state is GONE
     * on initial activity launch.
     *
     * PlayerViewModel starts in [com.hdhomey.app.ui.player.PlayerUiState.Loading],
     * so the loading spinner should be visible immediately after creation.
     * The error state must remain hidden until an actual error occurs — showing it
     * prematurely would confuse users who see a red error screen on stream startup.
     *
     * Note: The loading state initial visibility in the XML is `gone`, but
     * [PlayerActivity.renderState] is called synchronously on the first
     * [PlayerUiState.Loading] emission, which makes the loading state visible
     * and the error state gone before this assertion runs.
     */
    @Test
    fun loadingStateIsVisibleAndErrorStateIsGoneOnLaunch() {
        val scenario = ActivityScenario.launch<PlayerActivity>(buildPlayerIntent())
        scenario.onActivity { activity ->
            val loadingState = activity.findViewById<View>(R.id.player_loading_state)
            val errorState = activity.findViewById<View>(R.id.player_error_state)
            assertEquals(
                "loading state must be VISIBLE on launch",
                View.VISIBLE,
                loadingState.visibility
            )
            assertEquals(
                "error state must be GONE on launch",
                View.GONE,
                errorState.visibility
            )
        }
        scenario.close()
    }
}
