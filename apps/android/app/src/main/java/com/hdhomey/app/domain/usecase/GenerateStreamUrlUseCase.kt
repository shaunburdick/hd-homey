package com.hdhomey.app.domain.usecase

import com.hdhomey.app.api.HdHomeyApiServiceProvider
import com.hdhomey.app.api.models.StreamTokenRequest
import com.hdhomey.app.data.mapper.toDomain
import com.hdhomey.app.data.model.Server
import com.hdhomey.app.domain.model.StreamToken
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Use case for generating stream URLs with a signed HMAC token.
 *
 * Requests a stream token from the backend and constructs the full playback
 * URL for ExoPlayer. Supports two stream types:
 *
 * - **HLS transcoded**: `/api/transcode/{tunerId}/{channelId}/playlist.m3u8?token={token}`
 *   ~6-10 s start-up latency; universally compatible; uses FFmpeg on the server.
 * - **Raw MPEG-TS proxy**: `/tuners/{tunerId}/channel/{channelId}/stream?token={token}`
 *   ~1-2 s start-up latency; no transcoding; requires hardware MPEG-2 decoder on device.
 *
 * The [generateStreamToken] / [buildRawStreamUrl] / [buildStreamUrl] split allows
 * callers to fetch a single token once and then decide which URL to build based on
 * runtime capability detection (e.g., try raw first, fall back to HLS on decoder error).
 *
 * All API-calling methods take a [Server] parameter to target the correct server,
 * using [HdHomeyApiServiceProvider] to obtain a per-server API client.
 */
@Singleton
class GenerateStreamUrlUseCase @Inject constructor(
    private val apiServiceProvider: HdHomeyApiServiceProvider
) {

    /**
     * Generate a stream token for playing a channel.
     *
     * @param server The server to query (provides URL and JWT).
     * @param tunerId ID of the tuner.
     * @param channelId ID of the channel.
     * @return [StreamToken] domain entity.
     */
    suspend operator fun invoke(server: Server, tunerId: Int, channelId: Int): StreamToken {
        val apiService = apiServiceProvider.getService(server.url, server.jwt)
        val request = StreamTokenRequest(tunerId = tunerId, channelId = channelId)
        val response = apiService.getStreamToken(request)
        return response.toDomain()
    }

    /**
     * Request a stream token without constructing a URL.
     *
     * Used by the try-raw-then-HLS flow where the token is fetched once and the URL
     * is built based on which stream mode is active. This avoids making two separate
     * token requests (one for each stream type).
     *
     * @param server The server to query (provides URL and JWT).
     * @param tunerId ID of the tuner.
     * @param channelId ID of the channel.
     * @return [StreamToken] domain entity ready for use with [buildRawStreamUrl] or [buildStreamUrl].
     */
    suspend fun generateStreamToken(server: Server, tunerId: Int, channelId: Int): StreamToken {
        return invoke(server, tunerId, channelId)
    }

    /**
     * Build the full HLS stream URL from server URL and token.
     *
     * This is a pure function — no network access.
     *
     * @param serverUrl Base URL of the HD Homey server (e.g., "http://192.168.1.100:3000").
     * @param tunerId ID of the tuner.
     * @param channelId ID of the channel.
     * @param streamToken Valid stream token.
     * @return Full HLS playlist URL.
     */
    fun buildStreamUrl(
        serverUrl: String,
        tunerId: Int,
        channelId: Int,
        streamToken: StreamToken
    ): String {
        return "${serverUrl.trimEnd('/')}/api/transcode/$tunerId/$channelId/playlist.m3u8?token=${streamToken.token}"
    }

    /**
     * Build the raw MPEG-TS proxy stream URL.
     *
     * This endpoint transparently proxies the HDHomeRun device's native stream through
     * the server with no transcoding, providing lower latency (~1-2s) and original
     * quality compared to HLS transcoding (~6-10s).
     *
     * Endpoint: GET /tuners/{tunerId}/channel/{channelId}/stream?token={token}
     *
     * This is a pure function — no network access.
     *
     * @param serverUrl Base URL of the HD Homey server.
     * @param tunerId ID of the tuner.
     * @param channelId ID of the channel.
     * @param streamToken Valid stream token (same HMAC token as HLS).
     * @return Full raw stream URL.
     */
    fun buildRawStreamUrl(
        serverUrl: String,
        tunerId: Int,
        channelId: Int,
        streamToken: StreamToken
    ): String {
        return "${serverUrl.trimEnd('/')}/tuners/$tunerId/channel/$channelId/stream?token=${streamToken.token}"
    }

    /**
     * Convenience method: request token and build HLS URL in one call.
     *
     * @param server The server to query (provides URL and JWT).
     * @param tunerId ID of the tuner.
     * @param channelId ID of the channel.
     * @return Full HLS playlist URL with HMAC token.
     */
    suspend fun generateStreamUrl(
        server: Server,
        tunerId: Int,
        channelId: Int
    ): String {
        val token = invoke(server, tunerId, channelId)
        return buildStreamUrl(server.url, tunerId, channelId, token)
    }
}
