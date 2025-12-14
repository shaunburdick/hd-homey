package com.hdhomey.app.api.models

import kotlinx.serialization.Serializable

/**
 * Response from GET /api/auth/device/poll?code=XXX
 *
 * Indicates the current authorization status and provides token on success.
 */
@Serializable
data class PollResponse(
    val status: String,             // "pending" | "authorized" | "expired" | "denied"
    val token: String? = null,      // JWT token (only present when status is "authorized")
    val expiresAt: Long? = null,    // Token expiration timestamp in milliseconds (when authorized)
    val user: UserInfo? = null      // User information (when authorized)
)

/**
 * User information included in successful authorization response.
 */
@Serializable
data class UserInfo(
    val username: String,
    val role: String                // "admin" | "viewer"
)
