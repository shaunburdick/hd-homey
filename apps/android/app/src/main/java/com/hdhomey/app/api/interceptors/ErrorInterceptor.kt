package com.hdhomey.app.api.interceptors

import android.util.Log
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * OkHttp interceptor that handles authentication errors (401/403).
 *
 * Phase 2: Channel Browsing & Streaming
 * - Detects 401 Unauthorized and 403 Forbidden responses
 * - Logs authentication errors for debugging
 * - Future: Trigger token refresh or re-authentication flow
 *
 * How it works:
 * 1. Intercepts HTTP response after request completes
 * 2. Checks response code for authentication errors
 * 3. If 401/403, logs error and optionally triggers re-auth
 * 4. Returns response for caller to handle
 *
 * Integration:
 * - Added to OkHttpClient in NetworkModule
 * - Runs after AuthInterceptor (so it sees auth header was added)
 * - Runs after LoggingInterceptor (so errors are logged)
 *
 * Future Enhancement (Phase 3+):
 * - Automatically refresh token on 401 (if refresh token available)
 * - Broadcast authentication failure event to UI
 * - Navigate to login/pairing screen
 * - Clear invalid token from storage
 *
 * @see com.hdhomey.app.api.interceptors.AuthInterceptor
 * @see com.hdhomey.app.di.NetworkModule
 * @see com.hdhomey.app.data.repository.TokenRepository
 */
@Singleton
class ErrorInterceptor @Inject constructor(
    // Future: Inject TokenRepository for token clearing
    // Future: Inject event bus or navigator for re-auth trigger
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()
        val response = chain.proceed(request)

        // Check for authentication errors
        when (response.code) {
            401 -> {
                // Unauthorized - token invalid, expired, or missing
                Log.w(TAG, "401 Unauthorized: ${request.url}")
                // TODO Phase 3: Attempt token refresh
                // TODO Phase 3: If refresh fails, clear token and navigate to login
            }
            403 -> {
                // Forbidden - token valid but insufficient permissions
                Log.w(TAG, "403 Forbidden: ${request.url}")
                // TODO Phase 3: Show permission error to user
                // TODO Phase 3: Don't clear token (it's valid, just lacks permission)
            }
            404 -> {
                // Not Found - log for debugging API issues
                Log.d(TAG, "404 Not Found: ${request.url}")
            }
            500, 502, 503, 504 -> {
                // Server errors - log for debugging backend issues
                Log.w(TAG, "${response.code} Server Error: ${request.url}")
            }
        }

        return response
    }

    companion object {
        private const val TAG = "ErrorInterceptor"
    }
}
