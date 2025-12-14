package com.hdhomey.app.api.interceptors

import com.hdhomey.app.data.repository.ServerRepository
import kotlinx.coroutines.runBlocking
import okhttp3.HttpUrl.Companion.toHttpUrl
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * OkHttp interceptor that dynamically sets the base URL based on the active server.
 *
 * Phase 2 Fix: Dynamic Server URL
 * - Retrieves active server from ServerRepository
 * - Rewrites request URL to use active server's base URL
 * - Enables multi-server support without recompiling app
 *
 * Why this is needed:
 * - BuildConfig.BACKEND_URL is hardcoded at compile time
 * - Users can add multiple servers with different URLs
 * - Need to use the active server's URL dynamically at runtime
 *
 * How it works:
 * 1. Intercepts outgoing HTTP request
 * 2. Fetches active server from ServerRepository
 * 3. Rewrites request URL to use server's base URL
 * 4. Falls back to BuildConfig.BACKEND_URL if no active server
 * 5. Proceeds with modified request
 *
 * Example:
 * - User adds server: http://10.0.0.50:3000
 * - Original request: http://192.168.1.100:3000/api/tuners/1/channels
 * - Rewritten request: http://10.0.0.50:3000/api/tuners/1/channels
 *
 * Integration:
 * - Added to OkHttpClient in NetworkModule
 * - Runs BEFORE AuthInterceptor (so URL is correct before auth token added)
 * - Runs BEFORE LoggingInterceptor (so correct URL is logged)
 *
 * @see com.hdhomey.app.data.repository.ServerRepository
 * @see com.hdhomey.app.di.NetworkModule
 */
@Singleton
class BaseUrlInterceptor @Inject constructor(
    private val serverRepository: ServerRepository
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        
        // Get active server URL from repository (blocking call)
        val activeServerUrl = runBlocking {
            serverRepository.getActiveServer()?.url
        }

        // If active server exists, rewrite URL to use its base
        val newRequest = if (activeServerUrl != null) {
            try {
                // Parse active server URL (e.g., "http://10.0.0.50:3000")
                val newBaseUrl = activeServerUrl.toHttpUrl()
                
                // Rewrite request URL to use new base
                val newUrl = originalRequest.url.newBuilder()
                    .scheme(newBaseUrl.scheme)
                    .host(newBaseUrl.host)
                    .port(newBaseUrl.port)
                    .build()
                
                originalRequest.newBuilder()
                    .url(newUrl)
                    .build()
            } catch (e: Exception) {
                // Invalid URL - pass original request unchanged
                originalRequest
            }
        } else {
            // No active server - pass original request unchanged (uses BuildConfig.BACKEND_URL)
            originalRequest
        }

        return chain.proceed(newRequest)
    }
}
