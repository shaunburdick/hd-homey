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
 * Top-level DataStore delegate for app preferences.
 *
 * Must be declared at file scope — the [preferencesDataStore] delegate only works as a
 * top-level Kotlin property extension on [Context], not as a class member.
 */
private val Context.appDataStore by preferencesDataStore(name = "hd_homey_prefs")

/**
 * Hilt DI module that provides DataStore and preferences-related singletons.
 *
 * Binds the [SingletonComponent] so every injected consumer shares the same instance
 * across the entire app lifetime.
 *
 * **Auto-wired classes** (via `@Singleton @Inject constructor` — no explicit binding needed):
 * - [com.hdhomey.app.data.repository.ChannelRepository]
 * - [com.hdhomey.app.data.repository.PreferencesRepository]
 * - [com.hdhomey.app.data.repository.ServerRepository]
 * - [com.hdhomey.app.data.repository.TokenRepository]
 * - [com.hdhomey.app.data.provider.CurrentServerProvider]
 * - [com.hdhomey.app.api.HdHomeyApiServiceProvider]
 * - [com.hdhomey.app.domain.usecase.GetChannelsUseCase]
 * - [com.hdhomey.app.domain.usecase.GetChannelPreferencesUseCase]
 * - [com.hdhomey.app.domain.usecase.GenerateStreamUrlUseCase]
 *
 * These are automatically resolved by Hilt from the [SingletonComponent] graph because
 * each carries an [@Inject] constructor with dependencies provided by [NetworkModule] or
 * by [DataModule] itself.
 */
@Module
@InstallIn(SingletonComponent::class)
object DataModule {

    /**
     * Provides the app-wide [DataStore]<[Preferences]> singleton.
     *
     * Uses the [appDataStore] file-level extension to ensure only one DataStore
     * instance is ever created for the "hd_homey_prefs" file.
     *
     * @param context Application-scoped context supplied by Hilt.
     * @return The singleton [DataStore] instance.
     */
    @Provides
    @Singleton
    fun provideDataStore(@ApplicationContext context: Context): DataStore<Preferences> {
        return context.appDataStore
    }

    /**
     * Provides the [AppPreferences] singleton.
     *
     * Delegates to [AppPreferences.getInstance] to preserve the existing
     * double-checked-locking singleton contract and ensure compatibility with
     * any code that still calls [AppPreferences.getInstance] directly.
     *
     * @param context Application-scoped context supplied by Hilt.
     * @return The singleton [AppPreferences] instance.
     */
    @Provides
    @Singleton
    fun provideAppPreferences(@ApplicationContext context: Context): AppPreferences {
        return AppPreferences.getInstance(context)
    }
}
