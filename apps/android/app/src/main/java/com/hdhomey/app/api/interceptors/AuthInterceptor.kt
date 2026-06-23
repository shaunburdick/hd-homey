package com.hdhomey.app.api.interceptors

import com.hdhomey.app.data.repository.TokenRepository
import okhttp3.Interceptor
import okhttp3.Response
import javax.inject.Inject
import javax.inject.Singleton

/**
 * OkHttp interceptor that adds Better-Auth session token to all API requests.
 *
 * HD Homey uses cookie-based authentication (Better-Auth JWT sessions).
 * The session token is sent as an HTTP-only cookie:
 *   Cookie: better-auth.session_token=<TOKEN>
 *
 * This interceptor runs on every request and adds the auth cookie
 * if a session token is available. Requests to auth endpoints
 * (sign-in, device code) are intentionally NOT intercepted — if there is
 * no token, the request proceeds unauthenticated and it is the caller's
 * responsibility to handle any resulting 401.
 *
 * The interceptor is registered with OkHttpClient in NetworkModule (T023/T024).
 *
 * @see TokenRepository
 * @see ErrorInterceptor
 */
@Singleton
class AuthInterceptor @Inject constructor(
    private val tokenRepository: TokenRepository
) : Interceptor {

    companion object {
        private const val COOKIE_HEADER = "Cookie"
        private const val SESSION_COOKIE_NAME = "better-auth.session_token"
    }

    /**
     * Intercepts the outgoing request and attaches the session cookie when a token
     * is available.
     *
     * Uses [TokenRepository.getTokenSync] so that the synchronous OkHttp interceptor
     * chain is not interrupted — DataStore reads are bridged to a blocking call inside
     * the repository. Do **not** call this from the main thread.
     *
     * @param chain The OkHttp interceptor chain.
     * @return The HTTP response, with the auth cookie injected if a token was present.
     */
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()
        val token = tokenRepository.getTokenSync()

        // Skip auth if no token is available — proceed unauthenticated.
        if (token.isNullOrBlank()) {
            return chain.proceed(originalRequest)
        }

        // Add the auth cookie to the request headers.
        val authenticatedRequest = originalRequest.newBuilder()
            .header(COOKIE_HEADER, "$SESSION_COOKIE_NAME=$token")
            .build()

        return chain.proceed(authenticatedRequest)
    }
}
