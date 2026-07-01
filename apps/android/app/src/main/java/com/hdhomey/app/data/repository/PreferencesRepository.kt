package com.hdhomey.app.data.repository

import android.util.Log
import com.hdhomey.app.api.HdHomeyApiServiceProvider
import com.hdhomey.app.data.mapper.toDomainPreferences
import com.hdhomey.app.data.model.Server
import com.hdhomey.app.domain.model.ChannelPreferences
import java.util.concurrent.ConcurrentHashMap
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for user channel preference operations.
 *
 * Fetches favorite and hidden channel preferences from the backend API and
 * caches them in memory for up to [CACHE_TTL_MS] milliseconds.  On any
 * network or API error the repository falls back to [ChannelPreferences.EMPTY]
 * so that the channel list remains usable without user-visible failures.
 *
 * All methods take a [Server] parameter to target the correct server,
 * and use [HdHomeyApiServiceProvider] to obtain a per-server API client.
 *
 * All methods are suspend functions for coroutine-based usage.
 *
 * ## Cache keying
 *
 * The cache is keyed by `"$serverUrl|$tunerId"` so that different servers (or the same
 * server with different tuners) each maintain an independent, TTL-limited cache entry.
 * Call [invalidateCache] to clear all entries, or [invalidateCacheForServer] to clear
 * entries for a specific server.
 */
@Singleton
class PreferencesRepository @Inject constructor(
    private val apiServiceProvider: HdHomeyApiServiceProvider
) {
    // In-memory cache keyed by "$serverUrl|$tunerId"
    private data class CachedPreferences(
        val preferences: ChannelPreferences,
        val timestampMs: Long
    )

    private val preferenceCache = ConcurrentHashMap<String, CachedPreferences>()

    companion object {
        /** Cache TTL of 5 minutes (300,000 ms). */
        private const val CACHE_TTL_MS = 300_000L
    }

    /**
     * Fetch channel preferences, using a 5-minute in-memory cache keyed by
     * `"$serverUrl|$tunerId"`.  Different servers / tuners never share cache entries.
     *
     * On cache hit (stored ≤ 5 min ago), returns cached data immediately.
     * On cache miss or API failure, falls back to [ChannelPreferences.EMPTY]
     * so the UI never blocks on a preference-load failure.
     *
     * @param server The server to query (provides URL and JWT).
     * @param tunerId Optional tuner ID to filter preferences for a specific tuner;
     *   pass null (the default) to retrieve preferences across all tuners.
     * @return [ChannelPreferences] with sets of favorite and hidden channel IDs,
     *   or [ChannelPreferences.EMPTY] on error.
     */
    suspend fun getPreferences(server: Server, tunerId: Int? = null): ChannelPreferences {
        val cacheKey = "${server.url.trimEnd('/')}|$tunerId"
        val now = System.currentTimeMillis()

        // Check cache for this specific (server, tunerId) pair
        preferenceCache[cacheKey]?.let { cached ->
            if ((now - cached.timestampMs) < CACHE_TTL_MS) {
                return cached.preferences
            }
        }

        return try {
            val apiService = apiServiceProvider.getService(server.url, server.jwt)
            val response = apiService.getChannelPreferences(tunerId)
            val preferences = response.data.toDomainPreferences()
            preferenceCache[cacheKey] = CachedPreferences(preferences, now)
            preferences
        } catch (e: Exception) {
            Log.w("PreferencesRepository", "Failed to fetch preferences, using empty", e)
            // Return empty preferences on error — the channel list still works, just without favorites
            ChannelPreferences.EMPTY
        }
    }

    /**
     * Clear all in-memory cache entries, forcing the next [getPreferences] call
     * to fetch fresh data from the server.
     */
    fun invalidateCache() {
        preferenceCache.clear()
    }

    /**
     * Clear cache entries for a specific server, regardless of tuner.
     *
     * @param server The server whose cache entries should be evicted.
     */
    fun invalidateCacheForServer(server: Server) {
        val prefix = "${server.url.trimEnd('/')}|"
        val keysToRemove = preferenceCache.keys.filter { it.startsWith(prefix) }
        keysToRemove.forEach { preferenceCache.remove(it) }
    }
}
