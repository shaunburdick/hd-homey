package com.hdhomey.app.api

import com.hdhomey.app.api.interceptors.AuthCookieInterceptor
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.kotlinx.serialization.asConverterFactory
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Provider that builds and caches per-server [Retrofit] / [HdHomeyApiService] instances.
 *
 * Each server gets its own [OkHttpClient] (via [OkHttpClient.newBuilder] from the shared
 * root client — sharing connection pools and thread pools) and its own [AuthCookieInterceptor]
 * with that server's JWT baked in at construction time. This eliminates the need for URL-rewriting
 * interceptors and blocking auth reads:
 *
 * - **No [ServerUrlInterceptor]** — the base URL is correct from the start.
 * - **No blocking [AuthInterceptor]** — the JWT is captured at construction time, not read
 *   synchronously from DataStore on every request.
 * - **No `runBlocking`** in the interceptor hot path.
 * - **Shared connection pooling** — each per-server client uses [OkHttpClient.newBuilder] which
 *   inherits the root client's connection pool, dispatcher, and timeouts.
 *
 * ## Cache invalidation
 *
 * The cache maps server URL → Retrofit instance. When a server's JWT changes (e.g., after
 * re-authentication), call [invalidate] with that server's URL so the next request creates a
 * fresh instance with the new JWT. Call [invalidateAll] on server switch or logout.
 *
 * @property okHttpClient The root [OkHttpClient] (shared connection pool, timeouts, error interceptor).
 * @property json Shared [Json] serializer instance for Retrofit's converter factory.
 */
@Singleton
class HdHomeyApiServiceProvider @Inject constructor(
    private val okHttpClient: OkHttpClient,
    private val json: Json
) {

    /** Content type for JSON serialisation. */
    private val contentType = "application/json".toMediaType()

    /** Per-server-base-URL cache of [HdHomeyApiService] instances. */
    private val cache = ConcurrentHashMap<String, HdHomeyApiService>()

    /**
     * Returns a [HdHomeyApiService] for the given server URL and JWT.
     *
     * The instance is cached by [serverUrl] (normalised, with trailing slash removed).
     * If the cache already holds an instance for this URL, it is returned directly.
     * Otherwise a new Retrofit instance is created with:
     * 1. The [okHttpClient] base (shared pool, error interceptor).
     * 2. An [AuthCookieInterceptor] with [jwt] baked in.
     * 3. A [Json] converter factory.
     *
     * @param serverUrl The server's base URL (e.g., `"https://tv.example.com"`).
     * @param jwt The per-server Better-Auth JWT, or `null` for unauthenticated requests.
     * @return A Retrofit-generated [HdHomeyApiService] implementation.
     */
    fun getService(serverUrl: String, jwt: String?): HdHomeyApiService {
        val normalizedUrl = serverUrl.trimEnd('/')
        return cache.getOrPut(normalizedUrl) {
            val client = okHttpClient.newBuilder()
                .addInterceptor(AuthCookieInterceptor(jwt))
                .build()

            Retrofit.Builder()
                .baseUrl("$normalizedUrl/")
                .client(client)
                .addConverterFactory(json.asConverterFactory(contentType))
                .build()
                .create(HdHomeyApiService::class.java)
        }
    }

    /**
     * Invalidates the cached [HdHomeyApiService] for the given server URL.
     *
     * Call this after re-authentication for a server (new JWT) so that
     * [getService] creates a fresh instance with the updated auth cookie.
     *
     * @param serverUrl The server URL whose cached service should be evicted.
     */
    fun invalidate(serverUrl: String) {
        cache.remove(serverUrl.trimEnd('/'))
    }

    /**
     * Invalidates ALL cached [HdHomeyApiService] instances.
     *
     * Call this on server switch, logout, or when clearing app data.
     */
    fun invalidateAll() {
        cache.clear()
    }
}
