package com.hdhomey.app.di

import android.content.Context
import androidx.media3.exoplayer.ExoPlayer
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt DI module providing singleton media playback dependencies.
 *
 * Installed in [SingletonComponent] so the [ExoPlayer] instance is shared across the entire
 * application lifetime. A single player is appropriate here because HD Homey streams one
 * channel at a time; sharing the instance avoids the cost of creating and releasing the player
 * on every navigation event.
 *
 * **Important**: Consumers are responsible for calling [ExoPlayer.release] when the application
 * is destroyed (e.g., in [android.app.Application.onTerminate] or a lifecycle-aware wrapper).
 */
@Module
@InstallIn(SingletonComponent::class)
object MediaModule {

    /**
     * Provides the application-scoped [ExoPlayer] instance.
     *
     * Uses [ApplicationContext] rather than an Activity context to prevent memory leaks —
     * the player outlives any individual screen.
     *
     * @param context Application context injected by Hilt
     * @return A fully initialised [ExoPlayer] ready for playback
     */
    @Provides
    @Singleton
    fun provideExoPlayer(@ApplicationContext context: Context): ExoPlayer {
        return ExoPlayer.Builder(context).build()
    }
}
