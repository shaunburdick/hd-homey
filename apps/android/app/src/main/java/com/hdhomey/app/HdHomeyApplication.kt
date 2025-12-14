package com.hdhomey.app

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

/**
 * HD Homey Application class with Hilt dependency injection.
 *
 * This class initializes the Hilt dependency graph for the entire application.
 * All dependency injection modules are automatically discovered and configured
 * through Hilt's annotation processing.
 *
 * Phase 2: Channel Browsing & Streaming
 * - Hilt manages ViewModels, Repositories, API services, and ExoPlayer instances
 * - Singleton scope for shared resources (OkHttpClient, Retrofit, DataStore)
 * - Activity scope for lifecycle-aware components
 *
 * @see dagger.hilt.android.HiltAndroidApp
 */
@HiltAndroidApp
class HdHomeyApplication : Application() {

    override fun onCreate() {
        super.onCreate()
        // Hilt initializes the dependency graph automatically
        // Additional app-wide initialization can be added here
    }
}
