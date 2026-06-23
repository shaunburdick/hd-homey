package com.hdhomey.app.domain.usecase

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
 */
@Singleton
class GetChannelsUseCase @Inject constructor(
    private val channelRepository: ChannelRepository,
    private val preferencesRepository: PreferencesRepository
) {

    /**
     * Fetch channels for a tuner with user preference metadata.
     *
     * @param tunerId ID of the tuner
     * @return List of [ChannelWithMetadata] sorted by favorites then channel number
     */
    suspend operator fun invoke(tunerId: Int): List<ChannelWithMetadata> {
        val preferences = preferencesRepository.getPreferences(tunerId)
        return channelRepository.getChannelsWithMetadata(tunerId, preferences)
    }
}
