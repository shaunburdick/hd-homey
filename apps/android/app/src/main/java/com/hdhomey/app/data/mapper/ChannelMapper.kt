package com.hdhomey.app.data.mapper

import com.hdhomey.app.api.models.Channel as ChannelDto
import com.hdhomey.app.api.models.ChannelPreference as ChannelPreferenceDto
import com.hdhomey.app.api.models.StreamTokenResponse
import com.hdhomey.app.domain.model.Channel
import com.hdhomey.app.domain.model.ChannelPreferences
import com.hdhomey.app.domain.model.StreamToken

/**
 * Mapper functions for converting API DTOs to domain models.
 *
 * Maps network responses to business logic entities, decoupling
 * the API layer from the domain layer.
 *
 * ## Naming Convention
 *
 * - API DTOs: `com.hdhomey.app.api.models.*`
 * - Domain models: `com.hdhomey.app.domain.model.*`
 * - Mapper functions: `toDomain()` extension functions
 *
 * ## Usage Example
 *
 * ```kotlin
 * val apiResponse: ChannelListResponse = apiService.getChannels(tunerId)
 * val domainChannels: List<Channel> = apiResponse.data.toDomain()
 * ```
 */

/**
 * Map Channel API DTO to domain model.
 *
 * Converts backend channel entity to domain representation.
 * Simplifies API model to only fields needed for business logic.
 *
 * @receiver Channel DTO from API
 * @return Channel domain model
 */
fun ChannelDto.toDomain(): Channel = Channel(
    id = id,
    tunerId = fkTuner,
    number = guideNumber,
    name = guideName,
    isHd = (hd == 1),
    videoCodec = videoCodec,
    audioCodec = audioCodec,
    streamUrl = url
)

/**
 * Map list of Channel API DTOs to domain models.
 *
 * @receiver List of Channel DTOs from API
 * @return List of Channel domain models
 */
fun List<ChannelDto>.toDomain(): List<Channel> =
    map { it.toDomain() }

/**
 * Map ChannelPreference API DTOs to ChannelPreferences domain model.
 *
 * Converts list of preference DTOs to a single domain model with
 * separate sets for favorites and hidden channels.
 *
 * Backend returns one DTO per preference, but domain model groups
 * them into sets for fast lookup.
 *
 * @receiver List of ChannelPreference DTOs from API
 * @return ChannelPreferences domain model with favorites and hidden sets
 */
fun List<ChannelPreferenceDto>.toChannelPreferences(): ChannelPreferences {
    val favorites = mutableSetOf<String>()
    val hidden = mutableSetOf<String>()

    forEach { pref ->
        if (pref.isFavorite) {
            favorites.add(pref.guideNumber)
        }
        if (pref.isHidden) {
            hidden.add(pref.guideNumber)
        }
    }

    return ChannelPreferences(
        favorites = favorites,
        hidden = hidden
    )
}

/**
 * Map StreamTokenResponse API DTO to StreamToken domain model.
 *
 * @receiver StreamTokenResponse DTO from API
 * @return StreamToken domain model
 */
fun StreamTokenResponse.toDomain(): StreamToken = StreamToken(
    token = token,
    expiresAt = expiresAt,
    tunerId = tunerId,
    channelId = channelId
)
