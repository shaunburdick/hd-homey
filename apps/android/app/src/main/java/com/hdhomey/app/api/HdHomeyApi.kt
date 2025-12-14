package com.hdhomey.app.api

import com.hdhomey.app.util.Constants
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import java.util.concurrent.TimeUnit

/**
 * Factory for creating OkHttp clients configured for HD Homey API.
 *
 * Provides a configured HTTP client with proper timeouts, logging, and error handling.
 * Each server instance should use a client created with its specific base URL.
 */
object HdHomeyApi {
    
    /**
     * Creates an OkHttp client configured for the specified server URL.
     *
     * Features:
     * - Connection timeout: 10 seconds
     * - Read timeout: 30 seconds (device code polling may take time)
     * - Write timeout: 15 seconds
     * - HTTP logging in debug builds
     *
     * @param baseUrl The base URL of the HD Homey server (e.g., "http://192.168.1.100:3000")
     * @return Configured OkHttpClient instance
     */
    fun createClient(baseUrl: String): OkHttpClient {
        return OkHttpClient.Builder()
            .connectTimeout(Constants.Timeouts.CONNECTION, TimeUnit.MILLISECONDS)
            .readTimeout(Constants.Timeouts.READ, TimeUnit.MILLISECONDS)
            .writeTimeout(Constants.Timeouts.WRITE, TimeUnit.MILLISECONDS)
            .addInterceptor(createLoggingInterceptor())
            .build()
    }
    
    /**
     * Creates a logging interceptor for debugging HTTP requests.
     *
     * Logs request/response details in debug builds.
     *
     * @return HttpLoggingInterceptor configured appropriately
     */
    private fun createLoggingInterceptor(): HttpLoggingInterceptor {
        return HttpLoggingInterceptor().apply {
            level = if (com.hdhomey.app.BuildConfig.DEBUG) {
                HttpLoggingInterceptor.Level.BODY
            } else {
                HttpLoggingInterceptor.Level.NONE
            }
        }
    }
}
