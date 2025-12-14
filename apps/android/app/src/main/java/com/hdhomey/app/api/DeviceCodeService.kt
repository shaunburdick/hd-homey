package com.hdhomey.app.api

import android.util.Log
import com.hdhomey.app.api.models.DeviceCodeRequest
import com.hdhomey.app.api.models.DeviceCodeResponse
import com.hdhomey.app.api.models.PollResponse
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.json.Json
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody

/**
 * Service for interacting with HD Homey device code pairing API.
 *
 * Implements OAuth 2.0 Device Authorization Flow:
 * 1. Request device code from server
 * 2. Display code to user
 * 3. Poll for authorization
 * 4. Receive JWT token when authorized
 */
class DeviceCodeService(
    private val serverUrl: String,
    private val httpClient: OkHttpClient
) {
    private val json = Json {
        ignoreUnknownKeys = true
        prettyPrint = false
        encodeDefaults = true
    }

    companion object {
        private const val TAG = "DeviceCodeService"
        private const val ENDPOINT_DEVICE_CODE = "/api/auth/device/code"
        private const val ENDPOINT_DEVICE_POLL = "/api/auth/device/poll"
        private val JSON_MEDIA_TYPE = "application/json; charset=utf-8".toMediaType()
    }

    /**
     * Generates a new device code by calling POST /api/auth/device/code
     *
     * @param deviceName User-friendly device name (e.g., "Living Room TV")
     * @return DeviceCodeResponse containing the code and pairing URL
     * @throws Exception if the request fails or response is invalid
     */
    suspend fun generateCode(deviceName: String): DeviceCodeResponse = withContext(Dispatchers.IO) {
        try {
            val url = "$serverUrl$ENDPOINT_DEVICE_CODE"
            Log.d(TAG, "Requesting device code from: $url")

            val requestBody = DeviceCodeRequest(
                deviceName = deviceName,
                deviceType = "tv"
            )

            val requestJson = json.encodeToString(DeviceCodeRequest.serializer(), requestBody)
            Log.d(TAG, "Request JSON: $requestJson")
            val body = requestJson.toRequestBody(JSON_MEDIA_TYPE)

            val request = Request.Builder()
                .url(url)
                .post(body)
                .build()

            val response = httpClient.newCall(request).execute()
            val responseBody = response.body?.string() ?: throw Exception("Empty response body")

            if (!response.isSuccessful) {
                Log.e(TAG, "Device code request failed: ${response.code} - $responseBody")
                throw Exception("Failed to generate device code: HTTP ${response.code}")
            }

            Log.d(TAG, "Device code response: $responseBody")
            json.decodeFromString(DeviceCodeResponse.serializer(), responseBody)
        } catch (e: Exception) {
            Log.e(TAG, "Error generating device code", e)
            throw e
        }
    }

    /**
     * Polls the server for authorization status.
     *
     * Should be called repeatedly (every 3 seconds) until status changes from "pending".
     *
     * @param deviceCode The code returned from generateCode()
     * @return PollResponse indicating current authorization status
     * @throws Exception if the request fails
     */
    suspend fun pollAuthorization(deviceCode: String): PollResponse = withContext(Dispatchers.IO) {
        try {
            val url = "$serverUrl$ENDPOINT_DEVICE_POLL?code=$deviceCode"
            Log.d(TAG, "Polling authorization: $url")

            val request = Request.Builder()
                .url(url)
                .get()
                .build()

            val response = httpClient.newCall(request).execute()
            val responseBody = response.body?.string() ?: throw Exception("Empty response body")

            if (!response.isSuccessful) {
                Log.e(TAG, "Poll request failed: ${response.code} - $responseBody")
                throw Exception("Failed to poll authorization: HTTP ${response.code}")
            }

            Log.d(TAG, "Poll response: $responseBody")
            json.decodeFromString(PollResponse.serializer(), responseBody)
        } catch (e: Exception) {
            Log.e(TAG, "Error polling authorization", e)
            throw e
        }
    }
}
