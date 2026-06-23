package com.hdhomey.app.api

import com.hdhomey.app.api.models.ChannelDto
import com.hdhomey.app.api.models.ChannelPreferenceDto
import com.hdhomey.app.api.models.DataResponse
import com.hdhomey.app.api.models.StreamTokenRequest
import com.hdhomey.app.api.models.StreamTokenResponse
import com.hdhomey.app.api.models.TunerDto
import retrofit2.http.Body
import retrofit2.http.GET
import retrofit2.http.POST
import retrofit2.http.Path
import retrofit2.http.Query

/**
 * Retrofit service interface for the HD Homey backend API.
 *
 * All endpoints require authentication via cookie-based Better-Auth session.
 * The [com.hdhomey.app.api.interceptors.AuthInterceptor] registered on the
 * [okhttp3.OkHttpClient] automatically injects the
 * `Cookie: better-auth.session_token=<TOKEN>` header — callers do not need
 * to pass credentials explicitly.
 *
 * Base URL is supplied by the Retrofit instance configured in NetworkModule and
 * must end with a trailing slash (e.g., `"http://192.168.1.100:3000/"`).
 * All endpoint paths below are relative (no leading slash) so that Retrofit
 * resolves them correctly against the base URL.
 *
 * All methods are `suspend` functions and must be called from a coroutine context.
 * Retrofit's coroutine adapter converts HTTP errors into [retrofit2.HttpException]
 * which callers should catch and convert to domain-level errors.
 */
interface HdHomeyApiService {

    /**
     * List all active tuners registered on the HD Homey server.
     *
     * Endpoint: `GET /api/tuners`
     * Response shape: `{ "data": [ ...TunerDto... ] }`
     *
     * @return [DataResponse] wrapping a list of [TunerDto] objects; the list is
     *   empty when no tuners have been configured yet.
     */
    @GET("api/tuners")
    suspend fun getTuners(): DataResponse<List<TunerDto>>

    /**
     * List all channels discovered for a specific tuner.
     *
     * Endpoint: `GET /api/tuners/{tunerId}/channels`
     * Response shape: `{ "data": [ ...ChannelDto... ] }`
     *
     * @param tunerId Primary key of the tuner whose channels are requested.
     * @return [DataResponse] wrapping a list of [ChannelDto] objects; the list is
     *   empty when the tuner has not been scanned or has no active channels.
     */
    @GET("api/tuners/{tunerId}/channels")
    suspend fun getChannels(@Path("tunerId") tunerId: Int): DataResponse<List<ChannelDto>>

    /**
     * Request a short-lived HMAC token for HLS video streaming.
     *
     * Endpoint: `POST /api/stream-token`
     * Request shape: `{ "tunerId": Int, "channelId": Int }`
     * Response shape: `{ "token": String, "expiresAt": Long, "tunerId": Int, "channelId": Int }`
     *
     * The token is valid for 15 minutes (900 seconds) as configured on the backend.
     * It is signed with HMAC-SHA256 and encodes `tunerId`, `channelId`, and `expiresAt`
     * into a base64url string. Pass it as a query parameter when building the HLS
     * playlist URL: `.../api/transcode/{tunerId}/{channelId}/playlist.m3u8?token=<TOKEN>`.
     *
     * NOTE: The response is a flat JSON object — it does NOT use the [DataResponse]
     * wrapper that list endpoints use.
     *
     * @param request [StreamTokenRequest] containing the tuner and channel IDs.
     * @return [StreamTokenResponse] with the token string, expiry timestamp, and
     *   echoed tuner/channel IDs for verification.
     */
    @POST("api/stream-token")
    suspend fun getStreamToken(@Body request: StreamTokenRequest): StreamTokenResponse

    /**
     * Get channel preferences (favorites/hidden status) for the authenticated user.
     *
     * Endpoint: `GET /api/preferences/channels[?tunerId={id}]`
     * Response shape: `{ "data": [ ...ChannelPreferenceDto... ] }`
     *
     * Only channels with an **explicit** preference record are returned. Channels absent
     * from the list are neutral — treat them as not-favorite and not-hidden.
     *
     * @param tunerId Optional tuner ID filter. When non-null, only preferences belonging
     *   to that tuner are returned. Pass `null` (the default) to fetch preferences across
     *   all tuners.
     * @return [DataResponse] wrapping a list of [ChannelPreferenceDto] objects.
     */
    @GET("api/preferences/channels")
    suspend fun getChannelPreferences(
        @Query("tunerId") tunerId: Int? = null
    ): DataResponse<List<ChannelPreferenceDto>>
}
