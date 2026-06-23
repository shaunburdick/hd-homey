package com.hdhomey.app.data.repository

import com.hdhomey.app.api.HdHomeyApiService
import com.hdhomey.app.data.mapper.toDomainChannels
import com.hdhomey.app.data.mapper.withMetadata
import com.hdhomey.app.domain.model.Channel
import com.hdhomey.app.domain.model.ChannelPreferences
import com.hdhomey.app.domain.model.ChannelWithMetadata
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for channel and tuner data operations.
 *
 * Fetches channel listings from the backend API and merges with
 * user preferences to produce display-ready channel metadata.
 *
 * All methods are suspend functions for coroutine-based usage.
 */
@Singleton
class ChannelRepository @Inject constructor(
    private val apiService: HdHomeyApiService
) {

    /**
     * Fetch all channels for a given tuner.
     *
     * @param tunerId ID of the tuner
     * @return List of [Channel] domain entities
     */
    suspend fun getChannels(tunerId: Int): List<Channel> {
        val response = apiService.getChannels(tunerId)
        return response.data.toDomainChannels()
    }

    /**
     * Fetch channels merged with user preferences for display.
     *
     * Channels are sorted favorites-first, then by natural channel number order.
     *
     * @param tunerId ID of the tuner
     * @param preferences User's channel preferences; defaults to [ChannelPreferences.EMPTY]
     * @return List of [ChannelWithMetadata] sorted: favorites first, then by channel number
     */
    suspend fun getChannelsWithMetadata(
        tunerId: Int,
        preferences: ChannelPreferences = ChannelPreferences.EMPTY
    ): List<ChannelWithMetadata> {
        val channels = getChannels(tunerId)
        return channels
            .map { it.withMetadata(preferences) }
            .sortedWith(
                compareByDescending<ChannelWithMetadata> { it.isFavorite }
                    .thenBy { it.channel.sortKey }
            )
    }

    /**
     * Fetch all active tuners.
     *
     * @return List of (id, name) pairs for each active tuner
     */
    suspend fun getTuners(): List<Pair<Int, String>> {
        val response = apiService.getTuners()
        return response.data.map { it.id to it.name }
    }
}
