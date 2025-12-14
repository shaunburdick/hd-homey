package com.hdhomey.app.api.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Channel data transfer object from HD Homey backend.
 *
 * Represents the full channel entity from the SQLite database.
 * Backend returns this format from GET /api/tuners/{tunerId}/channels
 * wrapped in a `data` array.
 *
 * Example response:
 * ```json
 * {
 *   "data": [
 *     {
 *       "id": 1,
 *       "fk_tuner": 1,
 *       "guideNumber": "2.1",
 *       "guideName": "CBS",
 *       "videoCodec": "H264",
 *       "audioCodec": "AAC",
 *       "hd": 1,
 *       "url": "http://192.168.1.100:5004/auto/v2.1",
 *       "is_active": true,
 *       "created_at": 1702512345,
 *       "modified_at": 1702512345,
 *       "deleted_at": null
 *     }
 *   ]
 * }
 * ```
 *
 * @property id Channel primary key (auto-increment)
 * @property fkTuner Foreign key to tuners table
 * @property guideNumber Channel number in TV guide format (e.g., "2.1", "13.1")
 * @property guideName Channel name (station call letters or network name)
 * @property videoCodec Video codec (H264, MPEG2, HEVC, etc.)
 * @property audioCodec Audio codec (AAC, AC3, MP3, etc.)
 * @property hd HD flag (1 = HD, 0 = SD)
 * @property url Direct stream URL from HDHomeRun device
 * @property isActive Whether channel is currently active
 * @property createdAt Unix timestamp (seconds) when channel was created
 * @property modifiedAt Unix timestamp (seconds) when channel was last modified
 * @property deletedAt Unix timestamp (seconds) when channel was soft-deleted (null if active)
 */
@Serializable
data class Channel(
    @SerialName("id")
    val id: Int,

    @SerialName("fk_tuner")
    val fkTuner: Int,

    @SerialName("guideNumber")
    val guideNumber: String,

    @SerialName("guideName")
    val guideName: String,

    @SerialName("videoCodec")
    val videoCodec: String,

    @SerialName("audioCodec")
    val audioCodec: String,

    @SerialName("hd")
    val hd: Int,

    @SerialName("url")
    val url: String,

    @SerialName("is_active")
    val isActive: Boolean,

    @SerialName("created_at")
    val createdAt: Long,

    @SerialName("modified_at")
    val modifiedAt: Long,

    @SerialName("deleted_at")
    val deletedAt: Long? = null
)

/**
 * Wrapper for channel list response.
 *
 * Backend wraps channel arrays in a `data` property.
 */
@Serializable
data class ChannelListResponse(
    @SerialName("data")
    val data: List<Channel>
)
