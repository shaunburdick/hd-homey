package com.hdhomey.app.di

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.preferencesDataStore
import com.hdhomey.app.storage.AppPreferences
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.android.qualifiers.ApplicationContext
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

/**
 * Hilt module for data layer dependencies.
 *
 * Provides:
 * - DataStore instances for preferences and token storage
 * - Repository implementations
 *
 * Phase 2: Channel Browsing & Streaming
 * - DataStore replaces SharedPreferences for async storage
 * - Singleton repositories for data access layer
 * - Token storage with encryption support
 *
 * DataStore instances:
 * - "hd_homey_prefs" - App preferences (server list, settings)
 * - "hd_homey_tokens" - JWT tokens (encrypted)
 *
 * @see com.hdhomey.app.storage.AppPreferences
 * @see com.hdhomey.app.storage.TokenDataStore
 * @see com.hdhomey.app.data.repository.TokenRepository
 * @see com.hdhomey.app.data.repository.ChannelRepository
 * @see com.hdhomey.app.data.repository.PreferencesRepository
 */
@Module
@InstallIn(SingletonComponent::class)
object DataModule {

    /**
     * Provides DataStore for app preferences.
     *
     * Used for:
     * - Server list storage
     * - App settings
     * - UI state preferences
     *
     * Migration from SharedPreferences happens automatically on first access.
     *
     * @param context Application context
     * @return DataStore singleton for preferences
     */
    @Provides
    @Singleton
    fun providePreferencesDataStore(
        @ApplicationContext context: Context
    ): DataStore<Preferences> {
        return context.preferencesDataStore
    }

    /**
     * Provides AppPreferences with DataStore backend.
     *
     * Replaces Phase 1 SharedPreferences implementation.
     * Provides both sync (backward compatible) and async (Flow) APIs.
     *
     * @param dataStore DataStore for preferences
     * @return AppPreferences singleton
     */
    @Provides
    @Singleton
    fun provideAppPreferences(
        dataStore: DataStore<Preferences>
    ): AppPreferences {
        return AppPreferences(dataStore)
    }

    /**
     * Provides TokenDataStore for JWT token storage.
     *
     * Separate DataStore instance from app preferences for security.
     * Used by TokenRepository for authentication operations.
     *
     * @param context Application context
     * @return TokenDataStore singleton
     */
    @Provides
    @Singleton
    fun provideTokenDataStore(
        @ApplicationContext context: Context
    ): com.hdhomey.app.storage.TokenDataStore {
        return com.hdhomey.app.storage.TokenDataStore(context)
    }

    /**
     * Provides TokenRepository for JWT token operations.
     *
     * Used by AuthInterceptor and authentication-related use cases.
     *
     * @param tokenDataStore TokenDataStore for token storage
     * @return TokenRepository singleton
     */
    @Provides
    @Singleton
    fun provideTokenRepository(
        tokenDataStore: com.hdhomey.app.storage.TokenDataStore
    ): com.hdhomey.app.data.repository.TokenRepository {
        return com.hdhomey.app.data.repository.TokenRepository(tokenDataStore)
    }

    /**
     * Provides ChannelRepository for channel data operations.
     *
     * Handles:
     * - Fetching channel lineups from tuners
     * - Generating stream tokens for HLS playback
     *
     * Used by:
     * - GetChannelsUseCase
     * - GenerateStreamUrlUseCase
     *
     * @param apiService HD Homey API service for HTTP requests
     * @return ChannelRepository singleton
     */
    @Provides
    @Singleton
    fun provideChannelRepository(
        apiService: com.hdhomey.app.api.HdHomeyApiService
    ): com.hdhomey.app.data.repository.ChannelRepository {
        return com.hdhomey.app.data.repository.ChannelRepository(apiService)
    }

    /**
     * Provides PreferencesRepository for user preferences operations.
     *
     * Handles:
     * - Fetching user's channel favorites and hidden channels
     * - Graceful degradation when backend endpoint not implemented
     *
     * Used by:
     * - GetChannelPreferencesUseCase
     *
     * Note: Different from AppPreferences (app-level settings).
     * This repository handles user-specific channel preferences from backend.
     *
     * @param apiService HD Homey API service for HTTP requests
     * @return PreferencesRepository singleton
     */
    @Provides
    @Singleton
    fun providePreferencesRepository(
        apiService: com.hdhomey.app.api.HdHomeyApiService
    ): com.hdhomey.app.data.repository.PreferencesRepository {
        return com.hdhomey.app.data.repository.PreferencesRepository(apiService)
    }
}

/**
 * Extension property for accessing the preferences DataStore.
 *
 * Creates a DataStore named "hd_homey_prefs" using delegation.
 * This ensures only one DataStore instance is created per name.
 *
 * Usage:
 * ```kotlin
 * val dataStore = context.preferencesDataStore
 * dataStore.edit { prefs -> prefs[KEY] = value }
 * ```
 */
private val Context.preferencesDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "hd_homey_prefs"
)
