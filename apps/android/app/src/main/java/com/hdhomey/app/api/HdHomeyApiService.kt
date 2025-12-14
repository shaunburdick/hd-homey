package com.hdhomey.app.api

import com.hdhomey.app.api.models.ChannelListResponse
import com.hdhomey.app.api.models.ChannelPreferenceListResponse
import com.hdhomey.app.api.models.StreamTokenRequest
import com.hdhomey.app.api.models.StreamTokenResponse
import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Retrofit service interface for HD Homey API.
 *
 * All endpoints require JWT authentication via Authorization header.
 * AuthInterceptor automatically adds the Bearer token to requests.
 *
 * Base URL is configured in NetworkModule (e.g., "https://server.local/api")
 *
 * ## Endpoints
 *
 * ### Channel Operations
 * - [getChannels]: Fetch channel lineup for a tuner
 *
 * ### Streaming Operations
 * - [generateStreamToken]: Generate HMAC token for HLS playback
 *
 * ### User Preferences
 * - [getChannelPreferences]: Fetch user's channel favorites and hidden channels
 *
 * ## Error Handling
 *
 * All endpoints return `Response<T>` for manual error handling:
 * - 200-299: Success - use `response.body()`
 * - 401: Unauthorized - JWT expired, re-authenticate
 * - 403: Forbidden - Insufficient permissions
 * - 404: Not Found - Resource doesn't exist
 * - 429: Rate Limited - Retry with exponential backoff
 * - 500: Internal Server Error - Server issue, retry
 *
 * ErrorInterceptor logs errors automatically.
 *
 * ## Example Usage
 *
 * ```kotlin
 * @Inject
 * lateinit var apiService: HdHomeyApiService
 *
 * suspend fun loadChannels(tunerId: Int): Result<List<Channel>> {
 *   val response = apiService.getChannels(tunerId)
 *   return if (response.isSuccessful && response.body() != null) {
 *     Result.success(response.body()!!.data)
 *   } else {
 *     Result.failure(ApiException(response.code(), response.message()))
 *   }
 * }
 * ```
 */
interface HdHomeyApiService {

    /**
     * Get channel lineup for a tuner.
     *
     * Fetches all active channels discovered on the specified tuner.
     * Channels are returned in database order (by ID).
     * Client should sort by guideNumber for display.
     *
     * **Endpoint**: `GET /api/tuners/{tunerId}/channels`
     *
     * **Authentication**: Required (JWT via Authorization header)
     *
     * **Response**: 200 OK with channel list wrapped in `data` property
     *
     * Example response:
     * ```json
     * {
     *   "data": [
     *     {
     *       "id": 1,
     *       "fk_tuner": 1,
     *       "guideNumber": "2.1",
     *       "guideName": "CBS",
     *       "videoCodec": "H264",
     *       "audioCodec": "AAC",
     *       "hd": 1,
     *       "url": "http://192.168.1.100:5004/auto/v2.1",
     *       "is_active": true,
     *       "created_at": 1702512345,
     *       "modified_at": 1702512345,
     *       "deleted_at": null
     *     }
     *   ]
     * }
     * ```
     *
     * @param tunerId Tuner ID (database primary key)
     * @return Response containing channel list or error
     */
    @GET("tuners/{tunerId}/channels")
    suspend fun getChannels(
        @Path("tunerId") tunerId: Int
    ): Response<ChannelListResponse>

    /**
     * Generate stream token for HLS playback.
     *
     * Creates a short-lived HMAC-SHA256 signed token for streaming a specific channel.
     * Token is valid for 15 minutes and grants access to HLS playlist and segments.
     *
     * Use the returned token in HLS URLs:
     * - Playlist: `/api/transcode/{tunerId}/{channelId}/playlist.m3u8?token={token}`
     * - Segments: `/api/transcode/{tunerId}/{channelId}/{segment}?token={token}`
     *
     * **Endpoint**: `POST /api/stream-token`
     *
     * **Authentication**: Required (JWT via Authorization header)
     *
     * **Request Body**:
     * ```json
     * {
     *   "tunerId": 1,
     *   "channelId": 5
     * }
     * ```
     *
     * **Response**: 200 OK with token and expiry
     * ```json
     * {
     *   "token": "MToxOjE3MzQyMDQ4MDA6YWJjZGVmZ2hpamtsbW5vcHFyc3R1dnd4eXow",
     *   "expiresAt": 1734204800,
     *   "tunerId": 1,
     *   "channelId": 5
     * }
     * ```
     *
     * @param request Stream token request (tunerId, channelId)
     * @return Response containing stream token or error
     */
    @POST("stream-token")
    suspend fun generateStreamToken(
        @Body request: StreamTokenRequest
    ): Response<StreamTokenResponse>

    /**
     * Get channel preferences for authenticated user.
     *
     * Fetches user's channel favorites and hidden channels.
     * Only returns channels with explicit preferences set (isFavorite=true or isHidden=true).
     * Channels without preferences are omitted (treat as neutral).
     *
     * **Endpoint**: `GET /api/preferences/channels`
     *
     * **Authentication**: Required (JWT via Authorization header)
     *
     * **Query Parameters**:
     * - `tunerId` (optional): Filter by tuner ID, returns all tuners if omitted
     *
     * **Status**: Backend endpoint NOT YET IMPLEMENTED
     * This interface documents the expected API. Backend implementation required.
     *
     * **Response**: 200 OK with preferences wrapped in `data` property
     * ```json
     * {
     *   "data": [
     *     {
     *       "channelId": 1,
     *       "tunerId": 1,
     *       "guideNumber": "2.1",
     *       "guideName": "CBS",
     *       "isFavorite": true,
     *       "isHidden": false,
     *       "updatedAt": 1734200000000
     *     }
     *   ]
     * }
     * ```
     *
     * @param tunerId Optional tuner ID filter (null = all tuners)
     * @return Response containing channel preferences or error
     */
    @GET("preferences/channels")
    suspend fun getChannelPreferences(
        @Query("tunerId") tunerId: Int? = null
    ): Response<ChannelPreferenceListResponse>
}
