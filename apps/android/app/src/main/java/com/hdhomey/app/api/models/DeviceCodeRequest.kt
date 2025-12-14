package com.hdhomey.app.api.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Request body for POST /api/auth/device/code
 *
 * Initiates the device code flow by requesting a pairing code.
 * Backend expects deviceType: "tv" | "tablet" | "phone"
 */
@Serializable
data class DeviceCodeRequest(
    @SerialName("deviceName")
    val deviceName: String,
    @SerialName("deviceType")
    val deviceType: String = "tv"
)
