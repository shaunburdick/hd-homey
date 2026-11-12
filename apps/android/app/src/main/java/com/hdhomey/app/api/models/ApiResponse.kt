package com.hdhomey.app.api.models

import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonElement

/**
 * Generic wrapper for backend list/object responses.
 *
 * Most GET endpoints return `{ "data": [...] }` or `{ "data": {...} }`.
 * Use this with a concrete type parameter in Retrofit service interfaces:
 *
 * ```kotlin
 * suspend fun getTuners(): DataResponse<List<TunerDto>>
 * suspend fun getChannels(@Path("id") tunerId: Int): DataResponse<List<ChannelDto>>
 * ```
 *
 * @param T The type of the data payload (e.g., `List<ChannelDto>`, `TunerDto`)
 */
@Serializable
data class DataResponse<T>(
    val data: T
)

/**
 * Standard error response from the HD Homey backend API.
 *
 * Backend returns this shape for all 4xx and 5xx status codes.
 *
 * Example payloads:
 * - 401: `{ "error": "Unauthorized", "message": "Valid authentication token required" }`
 * - 404: `{ "error": "Not Found", "message": "Tuner 1 not found" }`
 * - 400: `{ "error": "Bad Request", "message": "...", "details": [...] }`
 * - 500: `{ "error": "Internal Server Error", "message": "Failed to generate stream token" }`
 *
 * @property error Short error code/type (e.g., "Unauthorized", "Not Found")
 * @property message Human-readable description of the error
 * @property details Optional additional context. May be a JSON array (validation issues)
 *   or a JSON string, so typed as [JsonElement] to handle both shapes without losing data.
 */
@Serializable
data class ErrorResponse(
    val error: String,
    val message: String,
    val details: JsonElement? = null
)
