package com.hdhomey.app.di

import com.hdhomey.app.BuildConfig
import dagger.Module
import dagger.Provides
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.TimeUnit
import javax.inject.Singleton

/**
 * Hilt module for network-related dependencies.
 *
 * Provides:
 * - OkHttpClient configured with interceptors (auth, logging, error handling)
 * - Retrofit instance configured with Kotlinx Serialization
 * - API service interfaces
 *
 * Phase 2: Channel Browsing & Streaming
 * - Singleton scope ensures one HTTP client for connection pooling
 * - Auth interceptor adds JWT tokens to requests
 * - Error interceptor handles 401/403 for re-authentication
 * - Logging interceptor for debugging (debug builds only)
 *
 * @see com.hdhomey.app.api.interceptors.AuthInterceptor
 * @see com.hdhomey.app.api.interceptors.ErrorInterceptor
 */
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {

    /**
     * Provides configured OkHttpClient with interceptors.
     *
     * Interceptor order matters:
     * 1. AuthInterceptor - adds JWT token to requests
     * 2. LoggingInterceptor - logs requests/responses (debug only)
     * 3. ErrorInterceptor - handles auth errors and triggers re-auth
     *
     * Connection pooling and timeouts configured for video streaming:
     * - 30s connect timeout (backend health check)
     * - 60s read timeout (HLS manifest/segment downloads)
     * - 30s write timeout (POST requests)
     *
     * Note: AuthInterceptor and ErrorInterceptor will be added in T016-T017
     *
     * @return Configured OkHttpClient singleton
     */
    @Provides
    @Singleton
    fun provideOkHttpClient(): OkHttpClient {
        return OkHttpClient.Builder()
            // TODO T016: Add AuthInterceptor here
            // TODO T017: Add ErrorInterceptor here
            .addInterceptor(
                HttpLoggingInterceptor().apply {
                    level = if (BuildConfig.DEBUG) {
                        HttpLoggingInterceptor.Level.BODY
                    } else {
                        HttpLoggingInterceptor.Level.NONE
                    }
                }
            )
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(60, TimeUnit.SECONDS)
            .writeTimeout(30, TimeUnit.SECONDS)
            .build()
    }

    /**
     * Provides configured JSON serializer for Retrofit.
     *
     * Configuration:
     * - ignoreUnknownKeys = true (forward compatibility with backend)
     * - isLenient = false (strict JSON parsing)
     * - prettyPrint = false (production mode)
     *
     * @return Configured Json instance
     */
    @Provides
    @Singleton
    fun provideJson(): Json {
        return Json {
            ignoreUnknownKeys = true
            isLenient = false
            prettyPrint = false
        }
    }

    /**
     * Provides configured Retrofit instance.
     *
     * Base URL comes from BuildConfig.BACKEND_URL (set in local.properties).
     * Uses Kotlinx Serialization for JSON conversion (not Gson/Moshi).
     *
     * Note: API service interfaces will be provided in T024
     *
     * @param okHttpClient Configured OkHttpClient with interceptors
     * @param json Configured Json serializer
     * @return Configured Retrofit singleton
     */
    @Provides
    @Singleton
    fun provideRetrofit(
        okHttpClient: OkHttpClient,
        json: Json
    ): Retrofit {
        return Retrofit.Builder()
            .baseUrl(BuildConfig.BACKEND_URL)
            .client(okHttpClient)
            .addConverterFactory(json.asConverterFactory("application/json".toMediaType()))
            .build()
    }

    // TODO T024: Add HdHomeyApiService provider here
}
