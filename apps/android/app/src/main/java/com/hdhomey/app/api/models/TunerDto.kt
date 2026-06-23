package com.hdhomey.app.api.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Tuner data transfer object from the HD Homey backend API.
 *
 * Maps to the `tuners` SQLite table from the backend.
 * Backend endpoint: GET /api/tuners
 * Response format: { "data": [ ...TunerDto... ] }
 *
 * @property id Primary key (auto-increment)
 * @property name User-friendly tuner name
 * @property path HDHomeRun device URL/path
 * @property lastScanned ISO 8601 timestamp of last channel scan, null if never scanned
 * @property isActive Whether the tuner is active
 * @property createdAt ISO 8601 timestamp of creation
 * @property modifiedAt ISO 8601 timestamp of last modification
 * @property deletedAt ISO 8601 timestamp of soft deletion, null if active
 */
@Serializable
data class TunerDto(
    val id: Int,
    val name: String,
    val path: String,
    @SerialName("last_scanned")
    val lastScanned: String? = null,
    @SerialName("is_active")
    val isActive: Boolean,
    @SerialName("created_at")
    val createdAt: String,
    @SerialName("modified_at")
    val modifiedAt: String,
    @SerialName("deleted_at")
    val deletedAt: String? = null
)
