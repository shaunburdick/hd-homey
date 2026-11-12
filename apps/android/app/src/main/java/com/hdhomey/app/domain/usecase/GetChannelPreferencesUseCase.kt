package com.hdhomey.app.domain.usecase

import com.hdhomey.app.data.model.Server
import com.hdhomey.app.data.repository.PreferencesRepository
import com.hdhomey.app.domain.model.ChannelPreferences
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Use case for fetching user channel preferences.
 *
 * Provides a clean boundary between UI layer and preference data.
 * Takes a [Server] parameter to target the correct server.
 */
@Singleton
class GetChannelPreferencesUseCase @Inject constructor(
    private val preferencesRepository: PreferencesRepository
) {

    /**
     * Fetch channel preferences, optionally filtered by tuner.
     *
     * @param server The server to query (provides URL and JWT).
     * @param tunerId Optional tuner filter.
     * @return [ChannelPreferences] with favorite and hidden channel IDs.
     */
    suspend operator fun invoke(server: Server, tunerId: Int? = null): ChannelPreferences {
        return preferencesRepository.getPreferences(server, tunerId)
    }
}
