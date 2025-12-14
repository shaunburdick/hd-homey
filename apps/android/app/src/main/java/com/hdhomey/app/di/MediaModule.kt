package com.hdhomey.app.di

import android.content.Context
import androidx.media3.common.util.UnstableApi
import androidx.media3.exoplayer.ExoPlayer
import androidx.media3.exoplayer.DefaultLoadControl
import androidx.media3.exoplayer.trackselection.DefaultTrackSelector
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.components.ActivityComponent
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.android.scopes.ActivityScoped

/**
 * Hilt module for media playback dependencies.
 *
 * Provides:
 * - ExoPlayer instances for HLS video streaming
 * - Track selector for adaptive bitrate selection
 * - Load control for buffering strategy
 *
 * Phase 2: Channel Browsing & Streaming
 * - ExoPlayer configured for Android TV D-pad controls
 * - Optimized buffering for live TV streaming
 * - Activity-scoped to tie player lifecycle to video activity
 *
 * Buffering Strategy (Tuned for Live TV):
 * - Min buffer: 15s (start playback quickly)
 * - Max buffer: 50s (prevent excessive memory use)
 * - Playback buffer: 2.5s (smooth playback start)
 * - Rebuffer: 5s (recover from underruns)
 *
 * Note: Activity scope ensures player is released when activity is destroyed,
 * preventing memory leaks and resource exhaustion.
 *
 * @see androidx.media3.exoplayer.ExoPlayer
 * @see androidx.media3.exoplayer.DefaultLoadControl
 * @see androidx.media3.exoplayer.trackselection.DefaultTrackSelector
 */
@Module
@InstallIn(ActivityComponent::class)
@UnstableApi
object MediaModule {

    /**
     * Provides configured ExoPlayer instance.
     *
     * Configuration:
     * - DefaultTrackSelector for adaptive bitrate streaming
     * - Custom LoadControl for live TV buffering strategy
     * - Activity-scoped lifecycle management
     *
     * The player must be released by the activity:
     * ```kotlin
     * override fun onDestroy() {
     *     super.onDestroy()
     *     player.release()
     * }
     * ```
     *
     * @param context Application context for player initialization
     * @param trackSelector Track selector for quality selection
     * @param loadControl Load control for buffering behavior
     * @return Configured ExoPlayer instance scoped to activity
     */
    @Provides
    @ActivityScoped
    fun provideExoPlayer(
        @ApplicationContext context: Context,
        trackSelector: DefaultTrackSelector,
        loadControl: DefaultLoadControl
    ): ExoPlayer {
        return ExoPlayer.Builder(context)
            .setTrackSelector(trackSelector)
            .setLoadControl(loadControl)
            .build()
    }

    /**
     * Provides track selector for adaptive bitrate streaming.
     *
     * DefaultTrackSelector automatically selects optimal video/audio tracks
     * based on network conditions and device capabilities.
     *
     * For Android TV:
     * - Prefers higher resolution (1080p/4K)
     * - Auto-switches quality based on bandwidth
     * - Handles audio track selection (stereo/surround)
     *
     * @param context Application context
     * @return Configured DefaultTrackSelector
     */
    @Provides
    @ActivityScoped
    fun provideTrackSelector(
        @ApplicationContext context: Context
    ): DefaultTrackSelector {
        return DefaultTrackSelector(context)
    }

    /**
     * Provides load control for buffering strategy.
     *
     * Tuned for live TV streaming:
     * - 15s min buffer: Start playback quickly after channel selection
     * - 50s max buffer: Prevent excessive memory use on TV devices
     * - 2.5s playback buffer: Smooth playback start threshold
     * - 5s rebuffer: Quick recovery from network hiccups
     *
     * These values balance responsiveness (fast channel changes) with
     * stability (smooth playback without stuttering).
     *
     * @return Configured DefaultLoadControl
     */
    @Provides
    @ActivityScoped
    fun provideLoadControl(): DefaultLoadControl {
        return DefaultLoadControl.Builder()
            .setBufferDurationsMs(
                15000, // minBufferMs - min buffer before playback starts
                50000, // maxBufferMs - max buffer to prevent memory issues
                2500,  // bufferForPlaybackMs - buffer to start playback
                5000   // bufferForPlaybackAfterRebufferMs - buffer after rebuffer
            )
            .build()
    }
}
