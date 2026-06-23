package com.hdhomey.app.domain.usecase

import com.hdhomey.app.api.HdHomeyApiService
import com.hdhomey.app.api.models.StreamTokenRequest
import com.hdhomey.app.data.mapper.toDomain
import com.hdhomey.app.domain.model.StreamToken
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Use case for generating an HLS stream URL with a signed HMAC token.
 *
 * Requests a stream token from the backend and constructs
 * the full playback URL for the ExoPlayer.
 *
 * Stream URL format: {serverUrl}/api/transcode/{tunerId}/{channelId}/playlist.m3u8?token={token}
 */
@Singleton
class GenerateStreamUrlUseCase @Inject constructor(
    private val apiService: HdHomeyApiService
) {

    /**
     * Generate a stream token for playing a channel.
     *
     * @param tunerId ID of the tuner
     * @param channelId ID of the channel
     * @return [StreamToken] domain entity
     */
    suspend operator fun invoke(tunerId: Int, channelId: Int): StreamToken {
        val request = StreamTokenRequest(tunerId = tunerId, channelId = channelId)
        val response = apiService.getStreamToken(request)
        return response.toDomain()
    }

    /**
     * Build the full HLS stream URL from server URL and token.
     *
     * @param serverUrl Base URL of the HD Homey server (e.g., "http://192.168.1.100:3000")
     * @param tunerId ID of the tuner
     * @param channelId ID of the channel
     * @param streamToken Valid stream token
     * @return Full HLS playlist URL
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
     * Convenience method: request token and build URL in one call.
     *
     * @param serverUrl Base URL of the HD Homey server
     * @param tunerId ID of the tuner
     * @param channelId ID of the channel
     * @return Full HLS playlist URL with HMAC token
     */
    suspend fun generateStreamUrl(
        serverUrl: String,
        tunerId: Int,
        channelId: Int
    ): String {
        val token = invoke(tunerId, channelId)
        return buildStreamUrl(serverUrl, tunerId, channelId, token)
    }
}
