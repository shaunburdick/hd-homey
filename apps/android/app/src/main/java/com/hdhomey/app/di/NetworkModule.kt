package com.hdhomey.app.di

import com.hdhomey.app.api.HdHomeyApiServiceProvider
import com.hdhomey.app.api.interceptors.ErrorInterceptor
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import okhttp3.OkHttpClient
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

/**
 * Hilt DI module providing singleton network dependencies.
 *
 * Installed in [SingletonComponent] so all provided objects are scoped to the application
 * lifetime.
 *
 * ## What this module provides
 * - [Json] — shared JSON serializer (no-unsafe-ignores, ignore unknown keys).
 * - [OkHttpClient] — root HTTP client with shared connection pool, timeouts, and
 *   [ErrorInterceptor]. **No** URL-rewriting or auth interceptors — those are added
 *   per-server by [HdHomeyApiServiceProvider].
 *
 * ## What this module does NOT provide
 * - Singleton [Retrofit] — each server gets its own Retrofit instance via
 *   [HdHomeyApiServiceProvider].
 * - Singleton [HdHomeyApiService] — provided per-server by [HdHomeyApiServiceProvider].
 * - [AuthInterceptor] — replaced by per-server [AuthCookieInterceptor].
 * - [ServerUrlInterceptor] — eliminated; each Retrofit instance already has the correct
 *   base URL.
 */
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    /**
     * Provides the [Json] serializer used by Retrofit's converter factory.
     *
     * Configuration:
     * - [Json.ignoreUnknownKeys]: tolerates new server-side fields without crashing
     * - [Json.encodeDefaults]: serialises default-value properties (needed for request bodies)
     * - [Json.prettyPrint] = false: compact wire format
     */
    @Provides
    @Singleton
    fun provideJson(): Json = Json {
        ignoreUnknownKeys = true
        encodeDefaults = true
        prettyPrint = false
    }

    /**
     * Provides the root [OkHttpClient] with shared connection pool, timeouts,
     * and error handling — **no** auth or URL-rewriting interceptors.
     *
     * Per-server clients are derived from this root via [OkHttpClient.newBuilder]
     * inside [HdHomeyApiServiceProvider], inheriting the connection pool, thread
     * pool dispatcher, and timeouts while adding a per-server [AuthCookieInterceptor].
     *
     * Timeouts are intentionally generous (30 s) to accommodate HDHomeRun devices on
     * slower home networks.
     *
     * @param errorInterceptor Handles 401/403/5xx responses; provided by Hilt.
     */
    @Provides
    @Singleton
    fun provideOkHttpClient(
        errorInterceptor: ErrorInterceptor,
    ): OkHttpClient {
        return OkHttpClient.Builder()
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .addInterceptor(errorInterceptor)
            .build()
    }
}
