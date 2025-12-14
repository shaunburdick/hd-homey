package com.hdhomey.app.api.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Standard error response from HD Homey backend.
 *
 * All API errors return this format with appropriate HTTP status codes.
 *
 * Common error codes:
 * - 400 Bad Request: Invalid parameters
 * - 401 Unauthorized: Missing/invalid JWT token
 * - 403 Forbidden: Insufficient permissions
 * - 404 Not Found: Resource doesn't exist
 * - 429 Too Many Requests: Rate limited
 * - 500 Internal Server Error: Server error
 *
 * Example error response:
 * ```json
 * {
 *   "error": "Unauthorized",
 *   "message": "Valid authentication token required"
 * }
 * ```
 *
 * @property error Error type (e.g., "Unauthorized", "Not Found")
 * @property message Detailed error description for debugging
 */
@Serializable
data class ErrorResponse(
    @SerialName("error")
    val error: String,

    @SerialName("message")
    val message: String
)
