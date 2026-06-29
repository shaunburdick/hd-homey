package com.hdhomey.app.api.interceptors

import android.util.Log
import okhttp3.Interceptor
import okhttp3.Response

/**
 * OkHttp interceptor that adds a per-server Better-Auth session cookie to requests.
 *
 * Unlike the old [AuthInterceptor] which read a global token from [TokenRepository]
 * via `runBlocking`, this interceptor is constructed with a single [jwt] value that
 * is baked in at creation time. Each [HdHomeyApiServiceProvider]-created Retrofit
 * instance gets its own interceptor with the correct JWT for that server, eliminating
 * blocking reads from the interceptor hot path.
 *
 * The interceptor is stateless after construction — [jwt] is a constructor parameter
 * and never changes.
 *
 * @param jwt The per-server Better-Auth JWT session token, or `null` for
 *   unauthenticated requests (e.g., during device-code authentication flow).
 */
class AuthCookieInterceptor(
    private val jwt: String?
) : Interceptor {

    companion object {
        private const val TAG = "AuthCookieInterceptor"
        private const val COOKIE_HEADER = "Cookie"
        private const val SESSION_COOKIE_NAME = "better-auth.session_token"
    }

    /**
     * Attaches the `Cookie: better-auth.session_token=<JWT>` header when [jwt]
     * is non-null and non-blank. Otherwise passes the request through unchanged.
     *
     * @param chain The OkHttp interceptor chain.
     * @return The HTTP response.
     */
    override fun intercept(chain: Interceptor.Chain): Response {
        val originalRequest = chain.request()

        if (jwt.isNullOrBlank()) {
            Log.w(TAG, "No JWT available — cookie NOT added for ${debugUrl(originalRequest.url)}")
            return chain.proceed(originalRequest)
        }

        Log.d(TAG, "Adding auth cookie for ${debugUrl(originalRequest.url)} (jwt length=${jwt.length})")

        val authenticatedRequest = originalRequest.newBuilder()
            .header(COOKIE_HEADER, "$SESSION_COOKIE_NAME=$jwt")
            .build()

        return chain.proceed(authenticatedRequest)
    }

    /**
     * Returns a sanitised URL string for logging (scheme + host + path only).
     */
    private fun debugUrl(url: okhttp3.HttpUrl): String {
        return url.newBuilder().query(null).build().toString()
    }
}
