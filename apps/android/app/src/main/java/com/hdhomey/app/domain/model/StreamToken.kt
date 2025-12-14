package com.hdhomey.app.domain.model

/**
 * Stream token domain entity.
 *
 * Represents an authenticated HLS stream session with a short-lived HMAC token.
 * Tokens are valid for 15 minutes and grant access to HLS playlists and segments.
 *
 * ## Token Generation
 *
 * Tokens are generated via: `POST /api/stream-token`
 * with request body: `{ "tunerId": 1, "channelId": 5 }`
 *
 * ## Token Usage
 *
 * Append token to HLS URLs as query parameter:
 * - Playlist: `/api/transcode/{tunerId}/{channelId}/playlist.m3u8?token={token}`
 * - Segments: `/api/transcode/{tunerId}/{channelId}/{segment}.ts?token={token}`
 *
 * ## Token Lifecycle
 *
 * 1. Generate token before starting playback
 * 2. Check [isValid] before each use (1-minute buffer)
 * 3. Refresh if [needsRefresh] returns true (< 1 minute remaining)
 * 4. Token expires after [expiresAt] timestamp
 *
 * ## Usage Example
 *
 * ```kotlin
 * val token = StreamToken(
 *     token = "MToxOjE3MzQyMDQ4MDA6YWJj...",
 *     expiresAt = 1734204800L, // Unix seconds
 *     tunerId = 1,
 *     channelId = 5
 * )
 *
 * if (token.isValid) {
 *     val url = generateStreamUrl(serverUrl, token)
 *     player.setMediaSource(url)
 * }
 *
 * if (token.needsRefresh) {
 *     // Fetch new token from API
 * }
 * ```
 *
 * @property token Base64url-encoded HMAC-SHA256 signature
 * @property expiresAt Unix timestamp (seconds) when token expires
 * @property tunerId Tuner ID (database primary key)
 * @property channelId Channel ID (database primary key)
 */
data class StreamToken(
    val token: String,
    val expiresAt: Long,
    val tunerId: Int,
    val channelId: Int
) {
    /**
     * Check if token is still valid.
     *
     * Uses a 1-minute buffer to avoid race conditions:
     * - Token expires at 15:00:00
     * - isValid returns false at 14:59:00 (60 seconds before expiry)
     *
     * This ensures we refresh tokens before they expire during playback.
     *
     * @return True if current time + 60 seconds < expiry time
     */
    val isValid: Boolean
        get() {
            val currentTimeSeconds = System.currentTimeMillis() / 1000
            val bufferSeconds = 60L
            return currentTimeSeconds + bufferSeconds < expiresAt
        }

    /**
     * Check if token needs refresh.
     *
     * Returns true when less than 1 minute remaining until expiry.
     * Use this to proactively refresh tokens during long playback sessions.
     *
     * @return True if [secondsUntilExpiry] < 60
     */
    val needsRefresh: Boolean
        get() = secondsUntilExpiry < 60

    /**
     * Calculate seconds until expiry.
     *
     * Positive values indicate time remaining.
     * Negative values indicate token has expired.
     *
     * @return Seconds until expiry (can be negative if expired)
     */
    val secondsUntilExpiry: Long
        get() {
            val currentTimeSeconds = System.currentTimeMillis() / 1000
            return expiresAt - currentTimeSeconds
        }

    /**
     * Get human-readable time remaining.
     *
     * Examples:
     * - "14 minutes 30 seconds"
     * - "45 seconds"
     * - "Expired"
     *
     * @return Formatted time remaining string
     */
    val timeRemainingFormatted: String
        get() {
            val seconds = secondsUntilExpiry
            return when {
                seconds < 0 -> "Expired"
                seconds < 60 -> "$seconds seconds"
                else -> {
                    val minutes = seconds / 60
                    val remainingSeconds = seconds % 60
                    "$minutes minutes $remainingSeconds seconds"
                }
            }
        }
}
