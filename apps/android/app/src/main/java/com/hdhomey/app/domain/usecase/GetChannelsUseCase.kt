package com.hdhomey.app.domain.usecase

import com.hdhomey.app.data.model.Server
import com.hdhomey.app.data.repository.ChannelRepository
import com.hdhomey.app.data.repository.PreferencesRepository
import com.hdhomey.app.domain.model.ChannelWithMetadata
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Use case for fetching channels merged with user preferences.
 *
 * Orchestrates channel data and user preferences into a single
 * display-ready list sorted by favorites then channel number.
 *
 * All methods take a [Server] parameter to target the correct server.
 */
@Singleton
class GetChannelsUseCase @Inject constructor(
    private val channelRepository: ChannelRepository,
    private val preferencesRepository: PreferencesRepository
) {

    /**
     * Fetch channels for a tuner with user preference metadata.
     *
     * Preference errors are handled gracefully by [PreferencesRepository]
     * (returns empty preferences). Channel fetch errors propagate to the
     * ViewModel for user-facing error display.
     *
     * @param server The server to query (provides URL and JWT).
     * @param tunerId ID of the tuner.
     * @return List of [ChannelWithMetadata], or empty list on preference failure.
     */
    suspend operator fun invoke(server: Server, tunerId: Int): List<ChannelWithMetadata> {
        val preferences = preferencesRepository.getPreferences(server, tunerId)
        return channelRepository.getChannelsWithMetadata(server, tunerId, preferences)
    }
}
