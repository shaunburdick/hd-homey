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
     * @param authInterceptor Injects JWT tokens into requests
     * @param errorInterceptor Handles 401/403 authentication errors
     * @return Configured OkHttpClient singleton
     */
    @Provides
    @Singleton
    fun provideOkHttpClient(
        authInterceptor: com.hdhomey.app.api.interceptors.AuthInterceptor,
        errorInterceptor: com.hdhomey.app.api.interceptors.ErrorInterceptor
    ): OkHttpClient {
        return OkHttpClient.Builder()
            .addInterceptor(authInterceptor)
            .addInterceptor(
                HttpLoggingInterceptor().apply {
                    level = if (BuildConfig.DEBUG) {
                        HttpLoggingInterceptor.Level.BODY
                    } else {
                        HttpLoggingInterceptor.Level.NONE
                    }
                }
            )
            .addInterceptor(errorInterceptor)
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

    /**
     * Provides HdHomeyApiService implementation.
     *
     * Retrofit creates the implementation automatically from the interface.
     * All API endpoints are defined in HdHomeyApiService.
     *
     * Endpoints:
     * - GET /api/tuners/{tunerId}/channels - Fetch channel lineup
     * - POST /api/stream-token - Generate HLS stream token
     * - GET /api/preferences/channels - Fetch user channel preferences
     *
     * @param retrofit Configured Retrofit instance with base URL and converters
     * @return HdHomeyApiService implementation
     */
    @Provides
    @Singleton
    fun provideHdHomeyApiService(retrofit: Retrofit): com.hdhomey.app.api.HdHomeyApiService {
        return retrofit.create(com.hdhomey.app.api.HdHomeyApiService::class.java)
    }
}
