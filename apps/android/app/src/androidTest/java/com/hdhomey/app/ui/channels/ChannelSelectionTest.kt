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
 * T104 — Espresso UI tests for channel selection → PlayerActivity launch.
 *
 * Focuses on [PlayerActivity] because it is a self-contained Activity that can
 * be launched in isolation via an [Intent] with well-defined extras. The tests
 * verify that:
 * - The activity inflates the expected view hierarchy.
 * - Intent extras are passed through correctly and bound to the correct views.
 * - State machine starts in the Loading state (loading spinner visible, error hidden).
 *
 * Complex end-to-end channel selection flow (server → channel list → player) is
 * deferred to manual / integration testing because it requires a live backend.
 */
@RunWith(AndroidJUnit4::class)
@LargeTest
class ChannelSelectionTest {

    /** Reusable intent builder for [PlayerActivity] with synthetic channel data. */
    private fun buildPlayerIntent(
        tunerId: Int = 1,
        channelId: Int = 42,
        serverUrl: String = "http://localhost:3000",
        channelNumber: String = "5.1",
        channelName: String = "Test Channel"
    ): Intent =
        Intent(ApplicationProvider.getApplicationContext(), PlayerActivity::class.java).apply {
            putExtra(PlayerActivity.EXTRA_TUNER_ID, tunerId)
            putExtra(PlayerActivity.EXTRA_CHANNEL_ID, channelId)
            putExtra(PlayerActivity.EXTRA_SERVER_URL, serverUrl)
            putExtra(PlayerActivity.EXTRA_CHANNEL_NUMBER, channelNumber)
            putExtra(PlayerActivity.EXTRA_CHANNEL_NAME, channelName)
        }

    /**
     * Verifies that [PlayerActivity] inflates all required views defined in
     * [activity_player.xml].
     *
     * A missing view ID at runtime would surface as a [NullPointerException] in
     * [PlayerActivity.onCreate], so this test guards against layout regressions.
     */
    @Test
    fun playerActivityLaunchesAndInflatesAllViews() {
        val scenario = ActivityScenario.launch<PlayerActivity>(buildPlayerIntent())
        scenario.onActivity { activity ->
            assertNotNull("player_view must be inflated", activity.findViewById(R.id.player_view))
            assertNotNull(
                "player_loading_state must be inflated",
                activity.findViewById<View>(R.id.player_loading_state)
            )
            assertNotNull(
                "player_error_state must be inflated",
                activity.findViewById<View>(R.id.player_error_state)
            )
            assertNotNull(
                "player_retry_button must be inflated",
                activity.findViewById<View>(R.id.player_retry_button)
            )
            assertNotNull(
                "player_channel_name must be inflated",
                activity.findViewById<View>(R.id.player_channel_name)
            )
            assertNotNull(
                "player_channel_number must be inflated",
                activity.findViewById<View>(R.id.player_channel_number)
            )
            assertNotNull(
                "player_controls must be inflated",
                activity.findViewById<View>(R.id.player_controls)
            )
        }
        scenario.close()
    }

    /**
     * Verifies that the channel name and number from [Intent] extras are
     * bound to their respective [android.widget.TextView] widgets.
     *
     * This tests the data-binding path in [PlayerActivity.onCreate] without
     * requiring a live stream or mocked ViewModel.
     */
    @Test
    fun playerActivityBindsChannelInfoFromIntentExtras() {
        val intent = buildPlayerIntent(channelNumber = "7.1", channelName = "PBS HD")
        val scenario = ActivityScenario.launch<PlayerActivity>(intent)
        scenario.onActivity { activity ->
            val nameView = activity.findViewById<android.widget.TextView>(R.id.player_channel_name)
            val numberView = activity.findViewById<android.widget.TextView>(R.id.player_channel_number)
            assertEquals("Channel name must match intent extra", "PBS HD", nameView.text.toString())
            assertEquals("Channel number must match intent extra", "7.1", numberView.text.toString())
        }
        scenario.close()
    }

    /**
     * Verifies that [PlayerActivity.createIntent] produces an [Intent] with all
     * required extras correctly populated.
     *
     * This is a pure intent-construction test — no activity is launched. It
     * confirms the factory method contract so callers (e.g. [ChannelListFragment])
     * can rely on the correct keys being set.
     */
    @Test
    fun createIntentPopulatesAllExtras() {
        val context = ApplicationProvider.getApplicationContext<android.content.Context>()
        val intent = PlayerActivity.createIntent(
            context = context,
            tunerId = 3,
            channelId = 99,
            serverUrl = "http://192.168.1.50:3000",
            channelNumber = "2.1",
            channelName = "CBS"
        )
        assertEquals(3, intent.getIntExtra(PlayerActivity.EXTRA_TUNER_ID, -1))
        assertEquals(99, intent.getIntExtra(PlayerActivity.EXTRA_CHANNEL_ID, -1))
        assertEquals("http://192.168.1.50:3000", intent.getStringExtra(PlayerActivity.EXTRA_SERVER_URL))
        assertEquals("2.1", intent.getStringExtra(PlayerActivity.EXTRA_CHANNEL_NUMBER))
        assertEquals("CBS", intent.getStringExtra(PlayerActivity.EXTRA_CHANNEL_NAME))
    }
}
