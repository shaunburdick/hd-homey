package com.hdhomey.app.api.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Stream token request body.
 *
 * Used to request a short-lived HMAC token for HLS streaming.
 * POST /api/stream-token
 *
 * @property tunerId Tuner ID (database primary key)
 * @property channelId Channel ID (database primary key, NOT guideNumber)
 */
@Serializable
data class StreamTokenRequest(
    @SerialName("tunerId")
    val tunerId: Int,

    @SerialName("channelId")
    val channelId: Int
)

/**
 * Stream token response.
 *
 * Contains HMAC-signed token for authenticating HLS stream requests.
 * Token is valid for 15 minutes and grants access to:
 * - HLS playlist: `/api/transcode/{tunerId}/{channelId}/playlist.m3u8?token={token}`
 * - HLS segments: `/api/transcode/{tunerId}/{channelId}/{segment}?token={token}`
 *
 * Example response:
 * ```json
 * {
 *   "token": "MToxOjE3MzQyMDQ4MDA6YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXow",
 *   "expiresAt": 1734204800,
 *   "tunerId": 1,
 *   "channelId": 5
 * }
 * ```
 *
 * @property token Base64url-encoded HMAC token to append as query parameter
 * @property expiresAt Unix timestamp (seconds) when token expires
 * @property tunerId Tuner ID (echoed from request)
 * @property channelId Channel ID (echoed from request)
 */
@Serializable
data class StreamTokenResponse(
    @SerialName("token")
    val token: String,

    @SerialName("expiresAt")
    val expiresAt: Long,

    @SerialName("tunerId")
    val tunerId: Int,

    @SerialName("channelId")
    val channelId: Int
)
