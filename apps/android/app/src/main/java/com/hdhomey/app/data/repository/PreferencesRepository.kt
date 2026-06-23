package com.hdhomey.app.data.repository

import com.hdhomey.app.api.HdHomeyApiService
import com.hdhomey.app.data.mapper.toDomainPreferences
import com.hdhomey.app.domain.model.ChannelPreferences
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for user channel preference operations.
 *
 * Fetches favorite and hidden channel preferences from the backend API.
 * All methods are suspend functions for coroutine-based usage.
 */
@Singleton
class PreferencesRepository @Inject constructor(
    private val apiService: HdHomeyApiService
) {

    /**
     * Fetch channel preferences for the authenticated user.
     *
     * Only channels with explicit preference records are returned by the API;
     * channels absent from the response are neutral (not favorite, not hidden).
     *
     * @param tunerId Optional tuner ID to filter preferences for a specific tuner;
     *   pass null (the default) to retrieve preferences across all tuners
     * @return [ChannelPreferences] with sets of favorite and hidden channel IDs
     */
    suspend fun getPreferences(tunerId: Int? = null): ChannelPreferences {
        val response = apiService.getChannelPreferences(tunerId)
        return response.data.toDomainPreferences()
    }
}
