package com.hdhomey.app.ui.player

import android.content.Context
import android.util.AttributeSet
import android.view.LayoutInflater
import android.widget.FrameLayout
import android.widget.ImageView
import android.widget.TextView
import com.hdhomey.app.R

/**
 * Custom overlay view that renders player controls on top of the video surface.
 *
 * Inflates [R.layout.player_controls] and exposes typed callbacks for the Play/Pause and
 * Back/Exit buttons so [PlayerActivity] can drive ViewModel state without the view needing
 * to reference any business logic.
 *
 * Designed for a **10-foot UI**:
 * - Large icon targets (64–80dp)
 * - D-pad focus chain wired in XML (back → play/pause → back)
 * - [updatePlayPauseIcon] swaps the icon in-place when playback state changes
 *
 * Typical usage:
 * ```xml
 * <com.hdhomey.app.ui.player.PlayerControlsView
 *     android:id="@+id/player_controls"
 *     android:layout_width="match_parent"
 *     android:layout_height="match_parent"
 *     android:visibility="gone" />
 * ```
 *
 * @constructor The [JvmOverloads] annotation generates all three Android View constructor
 *   variants (Context, Context+AttributeSet, Context+AttributeSet+defStyleAttr) so the
 *   view can be instantiated both programmatically and via XML inflation.
 */
class PlayerControlsView @JvmOverloads constructor(
    context: Context,
    attrs: AttributeSet? = null,
    defStyleAttr: Int = 0
) : FrameLayout(context, attrs, defStyleAttr) {

    /** Called when the user clicks (or D-pad selects) the Play/Pause button. */
    var onPlayPauseClick: (() -> Unit)? = null

    /** Called when the user clicks (or D-pad selects) the Back/Exit button. */
    var onBackClick: (() -> Unit)? = null

    private val playPauseButton: ImageView
    private val backButton: ImageView
    private val channelNameText: TextView
    private val channelNumberText: TextView

    init {
        LayoutInflater.from(context).inflate(R.layout.player_controls, this, true)

        playPauseButton = findViewById(R.id.player_controls_play_pause)
        backButton = findViewById(R.id.player_controls_back_button)
        channelNameText = findViewById(R.id.player_controls_channel_name)
        channelNumberText = findViewById(R.id.player_controls_channel_number)

        playPauseButton.setOnClickListener { onPlayPauseClick?.invoke() }
        backButton.setOnClickListener { onBackClick?.invoke() }
    }

    /**
     * Update the Play/Pause button icon to reflect the current playback state.
     *
     * Call this whenever [PlayerUiState.Playing.isPlaying] changes so the icon
     * stays in sync with ExoPlayer's actual state.
     *
     * @param isPlaying `true` to show the pause icon; `false` to show the play icon.
     */
    fun updatePlayPauseIcon(isPlaying: Boolean) {
        val iconRes = if (isPlaying) R.drawable.ic_player_pause else R.drawable.ic_player_play
        playPauseButton.setImageResource(iconRes)
        val descRes = if (isPlaying) {
            R.string.player_controls_play_pause_description
        } else {
            R.string.player_controls_play_pause_description
        }
        playPauseButton.contentDescription = context.getString(descRes)
    }

    /**
     * Populate the channel information labels in the controls bar.
     *
     * @param channelNumber Short channel number string, e.g. "7.1".
     * @param channelName   Human-readable channel name, e.g. "PBS HD".
     */
    fun setChannelInfo(channelNumber: String, channelName: String) {
        channelNumberText.text = channelNumber
        channelNameText.text = channelName
    }

    /**
     * Move D-pad focus to the Play/Pause button when controls become visible.
     *
     * Call this after [android.view.View.setVisibility] (VISIBLE) to ensure
     * D-pad focus lands inside the controls rather than on the hidden PlayerView.
     */
    fun requestPlayPauseFocus() {
        playPauseButton.requestFocus()
    }
}
