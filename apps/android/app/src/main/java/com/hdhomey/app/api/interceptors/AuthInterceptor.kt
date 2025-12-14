package com.hdhomey.app.api.interceptors

import com.hdhomey.app.data.repository.TokenRepository
import kotlinx.coroutines.runBlocking
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * OkHttp interceptor that adds JWT authentication tokens to API requests.
 *
 * Phase 2: Channel Browsing & Streaming
 * - Automatically adds "Authorization: Bearer <token>" header to all requests
 * - Retrieves token from TokenRepository
 * - Runs synchronously in OkHttp interceptor chain (runBlocking required)
 *
 * How it works:
 * 1. Intercepts outgoing HTTP request
 * 2. Fetches current JWT token from TokenRepository
 * 3. If token exists, adds "Authorization: Bearer <token>" header
 * 4. If no token, passes request unchanged (for public endpoints)
 * 5. Proceeds with modified request
 *
 * Integration:
 * - Added to OkHttpClient in NetworkModule
 * - Runs before LoggingInterceptor (so auth headers are logged)
 * - Runs before ErrorInterceptor (so 401/403 errors trigger after auth attempt)
 *
 * Note: Uses runBlocking because OkHttp interceptors are synchronous.
 * Token retrieval from DataStore is fast (<1ms) so blocking is acceptable.
 *
 * @see com.hdhomey.app.data.repository.TokenRepository
 * @see com.hdhomey.app.di.NetworkModule
 * @see com.hdhomey.app.api.interceptors.ErrorInterceptor
 */
@Singleton
class AuthInterceptor @Inject constructor(
    private val tokenRepository: TokenRepository
) : Interceptor {

    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        // Get token from repository (blocking call)
        val token = runBlocking {
            tokenRepository.getToken()
        }

        // If token exists, add Authorization header
        val requestWithAuth = if (token != null) {
            originalRequest.newBuilder()
                .header("Authorization", "Bearer $token")
                .build()
        } else {
            // No token - pass request unchanged (for public endpoints)
            originalRequest
        }

        return chain.proceed(requestWithAuth)
    }
}
