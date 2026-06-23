package com.hdhomey.app.api.interceptors

import android.util.Log
import okhttp3.HttpUrl
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
 *
 * **Security**: All URLs logged via [sanitizeUrl] to strip query parameters.
 * Stream endpoints carry HMAC tokens in the `token` query param; logging the
 * full URL would persist those tokens in device logcat, which is accessible
 * to any app with READ_LOGS permission on older Android versions.
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

    /**
     * Returns a sanitized URL string with all query parameters removed.
     *
     * Stream URLs contain HMAC tokens in query parameters that must not appear
     * in logs. Stripping query params before logging prevents token leakage into
     * logcat while still providing actionable path information for debugging.
     *
     * @param url The original request URL
     * @return URL string with scheme, host, port, and path only — no query or fragment
     */
    private fun sanitizeUrl(url: HttpUrl): String {
        return url.newBuilder().query(null).build().toString()
    }

    override fun intercept(chain: Interceptor.Chain): Response {
        val request = chain.request()

        val response: Response
        try {
            response = chain.proceed(request)
        } catch (e: Exception) {
            Log.e(TAG, "Network error for ${sanitizeUrl(request.url)}", e)
            throw e // Re-throw for caller to handle
        }

        when (response.code) {
            in 401..403 -> {
                Log.w(TAG, "Auth failure (${response.code}) for ${sanitizeUrl(response.request.url)}")
                authFailureDetected.set(true)
            }
            in 500..599 -> {
                Log.e(TAG, "Server error (${response.code}) for ${sanitizeUrl(response.request.url)}")
            }
        }

        return response
    }
}
