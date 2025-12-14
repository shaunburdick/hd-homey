package com.hdhomey.app.api.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Tuner data transfer object from HD Homey backend.
 *
 * Represents an HDHomeRun tuner device proxied by HD Homey.
 * Backend returns this format from GET /api/tuners.
 *
 * **Note**: Phase 1 uses the `Server` model from `data.model.Server`.
 * This DTO exists for future API expansion but Phase 2 continues using
 * the existing Server model. May consolidate in Phase 3.
 *
 * Example response:
 * ```json
 * {
 *   "data": [
 *     {
 *       "id": 1,
 *       "name": "Living Room HDHomeRun",
 *       "model_number": "HDHR5-4K",
 *       "local_ip": "192.168.1.100",
 *       "tuner_count": 4,
 *       "is_active": true,
 *       "created_at": 1702512345,
 *       "modified_at": 1702512345
 *     }
 *   ]
 * }
 * ```
 *
 * @property id Tuner primary key
 * @property name User-friendly tuner name
 * @property modelNumber HDHomeRun model identifier
 * @property localIp Tuner's local network IP address
 * @property tunerCount Number of available tuners in device
 * @property isActive Whether tuner is currently active/reachable
 * @property createdAt Unix timestamp (seconds) when tuner was created
 * @property modifiedAt Unix timestamp (seconds) when tuner was last modified
 */
@Serializable
data class Tuner(
    @SerialName("id")
    val id: Int,

    @SerialName("name")
    val name: String,

    @SerialName("model_number")
    val modelNumber: String?,

    @SerialName("local_ip")
    val localIp: String,

    @SerialName("tuner_count")
    val tunerCount: Int,

    @SerialName("is_active")
    val isActive: Boolean,

    @SerialName("created_at")
    val createdAt: Long,

    @SerialName("modified_at")
    val modifiedAt: Long
)

/**
 * Wrapper for tuner list response.
 *
 * Backend wraps tuner arrays in a `data` property.
 */
@Serializable
data class TunerListResponse(
    @SerialName("data")
    val data: List<Tuner>
)
