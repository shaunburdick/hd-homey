package com.hdhomey.app.api.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Tuner data transfer object from the HD Homey backend API.
 *
 * Maps to the `tuners` SQLite table from the backend.
 *
 * This DTO is used by two endpoints with different field availability:
 * - `GET /api/tuners` — returns a list; `path` is **included**.
 * - `GET /api/tuners/{id}` — returns a single tuner; `path` is **intentionally omitted**
 *   by the backend for security (prevents leaking device IPs to authenticated viewers).
 *
 * Response format (list): `{ "data": [ ...TunerDto... ] }`
 *
 * @property id Primary key (auto-increment)
 * @property name User-friendly tuner name
 * @property path Device URL (e.g., "http://192.168.1.100").
 *   INTENTIONALLY OMITTED by GET /api/tuners/{id} for security —
 *   only returned by GET /api/tuners (list endpoint). Always null
 *   when fetched via [com.hdhomey.app.api.HdHomeyApiService.getTuner].
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
    @SerialName("path")
    val path: String? = null,
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
