package com.hdhomey.app.api.interceptors

import android.util.Log
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * OkHttp interceptor that handles HTTP errors globally.
 *
 * Responsibilities:
 * - Logs all non-2xx responses for debugging
 * - Detects 401/403 responses and triggers re-authentication signal
 * - Provides error context for downstream error handling
 *
 * This interceptor runs after AuthInterceptor (adds token) but before
 * the response is delivered to the caller.
 *
 * Phase 2 behavior:
 * - 401/403: Sets a flag for re-auth (callers should check and redirect to
 *   sign-in screen)
 * - 5xx: Logs server errors for diagnostics
 * - Network errors: Let pass through for caller to handle
 */
@Singleton
class ErrorInterceptor @Inject constructor() : Interceptor {

    companion object {
        private const val TAG = "ErrorInterceptor"

        /**
         * Thread-local flag indicating a 401/403 was detected.
         * Callers should check this after API calls and trigger re-auth if true.
         */
        val authFailureDetected = ThreadLocal<Boolean>()
    }

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()

        val response: Response
        try {
            response = chain.proceed(request)
        } catch (e: Exception) {
            Log.e(TAG, "Network error for ${request.url}", e)
            throw e // Re-throw for caller to handle
        }

        when (response.code) {
            in 401..403 -> {
                Log.w(TAG, "Auth failure (${response.code}) for ${request.url}")
                authFailureDetected.set(true)
            }
            in 500..599 -> {
                Log.e(TAG, "Server error (${response.code}) for ${request.url}")
            }
        }

        return response
    }
}
