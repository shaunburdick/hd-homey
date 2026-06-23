package com.hdhomey.app.data.repository

import android.util.Log
import com.hdhomey.app.api.HdHomeyApiService
import com.hdhomey.app.data.mapper.toDomainPreferences
import com.hdhomey.app.domain.model.ChannelPreferences
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
 * All methods are suspend functions for coroutine-based usage.
 */
@Singleton
class PreferencesRepository @Inject constructor(
    private val apiService: HdHomeyApiService
) {
    // In-memory cache: maps tunerId (or -1 for all) to a cached result with timestamp
    private data class CachedPreferences(
        val preferences: ChannelPreferences,
        val timestampMs: Long
    )

    @Volatile
    private var cache: CachedPreferences? = null

    companion object {
        /** Cache TTL of 5 minutes (300,000 ms). */
        private const val CACHE_TTL_MS = 300_000L
    }

    /**
     * Fetch channel preferences, using a 5-minute in-memory cache.
     *
     * On cache hit (stored ≤ 5 min ago), returns cached data immediately.
     * On cache miss or API failure, falls back to [ChannelPreferences.EMPTY]
     * so the UI never blocks on a preference-load failure.
     *
     * @param tunerId Optional tuner ID to filter preferences for a specific tuner;
     *   pass null (the default) to retrieve preferences across all tuners
     * @return [ChannelPreferences] with sets of favorite and hidden channel IDs,
     *   or [ChannelPreferences.EMPTY] on error
     */
    suspend fun getPreferences(tunerId: Int? = null): ChannelPreferences {
        // Check cache
        val now = System.currentTimeMillis()
        val cached = cache
        if (cached != null && (now - cached.timestampMs) < CACHE_TTL_MS) {
            return cached.preferences
        }

        return try {
            val response = apiService.getChannelPreferences(tunerId)
            val preferences = response.data.toDomainPreferences()
            cache = CachedPreferences(preferences, now)
            preferences
        } catch (e: Exception) {
            Log.w("PreferencesRepository", "Failed to fetch preferences, using empty", e)
            // Return empty preferences on error — the channel list still works, just without favorites
            ChannelPreferences.EMPTY
        }
    }

    /**
     * Clear the in-memory cache, forcing the next [getPreferences] call
     * to fetch fresh data from the server.
     */
    fun invalidateCache() {
        cache = null
    }
}
