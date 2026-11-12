package com.hdhomey.app.api.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Channel data transfer object from the HD Homey backend API.
 *
 * Maps to the `channels` SQLite table from the backend.
 * Backend endpoint: GET /api/tuners/{tunerId}/channels
 * Response format: { "data": [ ...ChannelDto... ] }
 *
 * @property id Primary key (auto-increment)
 * @property fkTuner Foreign key to the parent tuner
 * @property guideNumber Channel number string (e.g., "2.1", "4.2")
 * @property guideName Channel display name (e.g., "CBS", "NBC")
 * @property videoCodec Video codec (e.g., "H264", "MPEG2")
 * @property audioCodec Audio codec (e.g., "AC3", "AAC")
 * @property hd HD flag (1 = HD, 0 = SD)
 * @property url HDHomeRun native stream URL (not used directly in Phase 2)
 * @property isActive Whether the channel is active
 * @property createdAt ISO 8601 timestamp of creation
 * @property modifiedAt ISO 8601 timestamp of last modification
 * @property deletedAt ISO 8601 timestamp of soft deletion, null if active
 */
@Serializable
data class ChannelDto(
    val id: Int,
    @SerialName("fk_tuner")
    val fkTuner: Int,
    val guideNumber: String,
    val guideName: String,
    val videoCodec: String,
    val audioCodec: String,
    val hd: Int,
    val url: String,
    @SerialName("is_active")
    val isActive: Boolean,
    @SerialName("created_at")
    val createdAt: String,
    @SerialName("modified_at")
    val modifiedAt: String,
    @SerialName("deleted_at")
    val deletedAt: String? = null
)
