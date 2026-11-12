package com.hdhomey.app.api.models

import kotlinx.serialization.Serializable

/**
 * Channel preference data transfer object from the HD Homey backend API.
 *
 * Represents a user's preference (favorite/hidden) for a single channel.
 * Backend endpoint: GET /api/preferences/channels
 * Response format: { "data": [ ...ChannelPreferenceDto... ] }
 *
 * Only channels with explicit preferences are returned.
 * Channels not in this list should be treated as neutral (not favorite, not hidden).
 *
 * @property channelId ID of the channel
 * @property tunerId ID of the parent tuner
 * @property guideNumber Channel number (e.g., "2.1")
 * @property guideName Channel display name (e.g., "CBS")
 * @property isFavorite Whether the user has favorited this channel
 * @property isHidden Whether the user has hidden this channel
 * @property updatedAt ISO 8601 timestamp of when the preference was last updated
 */
@Serializable
data class ChannelPreferenceDto(
    val channelId: Int,
    val tunerId: Int,
    val guideNumber: String,
    val guideName: String,
    val isFavorite: Boolean,
    val isHidden: Boolean,
    val updatedAt: String
)
