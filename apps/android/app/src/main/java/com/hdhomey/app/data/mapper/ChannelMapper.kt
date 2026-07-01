package com.hdhomey.app.data.mapper

import com.hdhomey.app.api.models.ChannelDto
import com.hdhomey.app.api.models.ChannelPreferenceDto
import com.hdhomey.app.domain.model.Channel
import com.hdhomey.app.domain.model.ChannelPreferences
import com.hdhomey.app.domain.model.ChannelWithMetadata

/**
 * Maps a single [ChannelDto] (API layer) to a [Channel] domain entity.
 *
 * The `hd` field uses an integer flag (1 = HD, 0 = SD) in the backend response,
 * which is normalised to a Boolean here so callers never need to remember the
 * convention.
 */
fun ChannelDto.toDomain(): Channel = Channel(
    id = id,
    tunerId = fkTuner,
    number = guideNumber,
    name = guideName,
    isHd = hd == 1
)

/**
 * Convenience extension to map a list of [ChannelDto] objects to domain [Channel] entities.
 *
 * Equivalent to calling [toDomain] on each element.
 */
fun List<ChannelDto>.toDomainChannels(): List<Channel> = map { it.toDomain() }

/**
 * Builds a [ChannelPreferences] domain entity from a list of [ChannelPreferenceDto] items.
 *
 * Groups channel IDs by their preference flags. Channels absent from the list are
 * treated as neutral (neither favourite nor hidden) by [ChannelPreferences].
 *
 * Note: A channel can technically have both `isFavorite` and `isHidden` set by a
 * misbehaving client. In that case it appears in both sets; callers should treat
 * hidden as the stronger signal.
 */
fun List<ChannelPreferenceDto>.toDomainPreferences(): ChannelPreferences {
    val favorites = filter { it.isFavorite }.map { it.channelId }.toSet()
    val hidden = filter { it.isHidden }.map { it.channelId }.toSet()
    return ChannelPreferences(favorites = favorites, hidden = hidden)
}

/**
 * Merges a [Channel] with a [ChannelPreferences] snapshot to produce a
 * [ChannelWithMetadata] view object.
 *
 * Intended to be called inside a use-case or repository after both the channel list
 * and the preferences have been fetched.
 *
 * @param preferences The user's current channel preferences
 */
fun Channel.withMetadata(preferences: ChannelPreferences): ChannelWithMetadata =
    ChannelWithMetadata(
        channel = this,
        isFavorite = preferences.isFavorite(id),
        isHidden = preferences.isHidden(id)
    )
