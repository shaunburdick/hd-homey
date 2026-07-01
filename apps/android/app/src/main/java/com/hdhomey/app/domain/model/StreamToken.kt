package com.hdhomey.app.domain.model

import java.time.Instant

/**
 * Stream token domain entity for HLS video authentication.
 *
 * Represents an HMAC-SHA256 signed token that authorises playback of a specific
 * channel on a specific tuner. Tokens are valid for 15 minutes (900 seconds) as
 * configured on the backend via [Config.streamTokenExpiry].
 *
 * Token format: `base64url(tunerId:channelId:expiresAt:signature)`
 * where signature = `HMAC-SHA256(tunerId:channelId:expiresAt, streamSecret).slice(0, 32)`.
 *
 * Mapped from [com.hdhomey.app.api.models.StreamTokenResponse] via
 * [com.hdhomey.app.data.mapper.toDomain].
 *
 * @property token HMAC-SHA256 signature (base64url encoded)
 * @property expiresAt Instant when the token expires, derived from the Unix epoch
 *   seconds returned by the backend
 * @property tunerId ID of the tuner the token was generated for
 * @property channelId ID of the channel the token was generated for
 */
data class StreamToken(
    val token: String,
    val expiresAt: Instant,
    val tunerId: Int,
    val channelId: Int
) {
    /**
     * Whether the token is still usable for streaming.
     *
     * Applies a 60-second buffer so callers have time to initiate the stream
     * before the token is rejected by the backend.
     *
     * @return true if the token will not expire within the next 60 seconds
     */
    val isValid: Boolean
        get() = Instant.now().plusSeconds(60).isBefore(expiresAt)

    /**
     * Remaining lifetime of the token in whole seconds.
     *
     * Returns a negative value if the token is already expired.
     */
    val secondsUntilExpiry: Long
        get() = expiresAt.epochSecond - Instant.now().epochSecond
}
