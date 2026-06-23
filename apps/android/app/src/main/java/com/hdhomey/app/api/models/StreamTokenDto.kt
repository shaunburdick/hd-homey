package com.hdhomey.app.api.models

import kotlinx.serialization.Serializable

/**
 * Request body for POST /api/stream-token.
 *
 * Both fields are camelCase in JSON, matching the backend Zod schema which validates
 * them as positive integers.
 *
 * @property tunerId ID of the tuner to stream from (positive integer)
 * @property channelId ID of the channel to stream (positive integer)
 */
@Serializable
data class StreamTokenRequest(
    val tunerId: Int,
    val channelId: Int
)

/**
 * Response from POST /api/stream-token.
 *
 * Contains the HMAC-signed streaming token with expiry.
 * Token is valid for 15 minutes (900 seconds) as configured via [Config.streamTokenExpiry]
 * on the backend.
 *
 * Token format: base64url(tunerId:channelId:expiresAt:signature)
 * Signature: HMAC-SHA256(tunerId:channelId:expiresAt, streamSecret).slice(0, 32)
 *
 * NOTE: [expiresAt] is a **Unix timestamp in seconds** (e.g., 1734204800), NOT milliseconds
 * and NOT an ISO string. This is intentional — the backend computes it as
 * `Math.floor(Date.now() / 1000) + Config.streamTokenExpiry`. Use [Long] here because
 * Unix epoch seconds in 2025+ exceed [Int] range.
 *
 * @property token HMAC-SHA256 signature (base64url encoded)
 * @property expiresAt Unix timestamp in **seconds** when the token expires
 * @property tunerId ID of the tuner the token was generated for
 * @property channelId ID of the channel the token was generated for
 */
@Serializable
data class StreamTokenResponse(
    val token: String,
    val expiresAt: Long,
    val tunerId: Int,
    val channelId: Int
)
