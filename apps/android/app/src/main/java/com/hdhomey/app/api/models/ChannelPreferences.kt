package com.hdhomey.app.api.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Channel preference data transfer object.
 *
 * User's favorite and hidden channels from the backend.
 * GET /api/preferences/channels
 *
 * **STATUS**: Backend endpoint NOT YET IMPLEMENTED.
 * This model documents the expected API format. Backend implementation
 * is required before Phase 2 channel preferences can work.
 *
 * Example response:
 * ```json
 * {
 *   "data": [
 *     {
 *       "channelId": 1,
 *       "tunerId": 1,
 *       "guideNumber": "2.1",
 *       "guideName": "CBS",
 *       "isFavorite": true,
 *       "isHidden": false,
 *       "updatedAt": 1734200000000
 *     },
 *     {
 *       "channelId": 12,
 *       "tunerId": 1,
 *       "guideNumber": "45.1",
 *       "guideName": "Shopping Network",
 *       "isFavorite": false,
 *       "isHidden": true,
 *       "updatedAt": 1734202000000
 *     }
 *   ]
 * }
 * ```
 *
 * @property channelId Channel primary key (from channels.id)
 * @property tunerId Tuner ID (from channels.fk_tuner)
 * @property guideNumber Channel number (e.g., "2.1")
 * @property guideName Channel name
 * @property isFavorite Whether channel is marked as favorite
 * @property isHidden Whether channel is marked as hidden
 * @property updatedAt Unix timestamp (milliseconds) when preference was last updated
 */
@Serializable
data class ChannelPreference(
    @SerialName("channelId")
    val channelId: Int,

    @SerialName("tunerId")
    val tunerId: Int,

    @SerialName("guideNumber")
    val guideNumber: String,

    @SerialName("guideName")
    val guideName: String,

    @SerialName("isFavorite")
    val isFavorite: Boolean,

    @SerialName("isHidden")
    val isHidden: Boolean,

    @SerialName("updatedAt")
    val updatedAt: Long
)

/**
 * Wrapper for channel preferences list response.
 *
 * Backend wraps preference arrays in a `data` property.
 */
@Serializable
data class ChannelPreferenceListResponse(
    @SerialName("data")
    val data: List<ChannelPreference>
)
