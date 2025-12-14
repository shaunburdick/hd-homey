package com.hdhomey.app.api.models

import kotlinx.serialization.Serializable

/**
 * Response from POST /api/auth/device/code
 *
 * Contains the device code to display to the user and the pairing URL.
 * Backend returns: { "code": "R8DAQU", "expiresAt": "2025-12-14T01:56:09.070Z", "pairingUrl": "..." }
 */
@Serializable
data class DeviceCodeResponse(
    val code: String,              // e.g., "R8DAQU" - 6-character code to display
    val expiresAt: String,         // ISO 8601 timestamp when code expires
    val pairingUrl: String         // Full pairing URL: "http://10.0.2.2:3000/pair?code=R8DAQU"
)
