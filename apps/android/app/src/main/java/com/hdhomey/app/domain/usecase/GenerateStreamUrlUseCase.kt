package com.hdhomey.app.domain.usecase

import com.hdhomey.app.data.repository.ChannelRepository
import com.hdhomey.app.domain.model.StreamToken
import javax.inject.Inject

/**
 * Use case for generating HLS stream URLs.
 *
 * Orchestrates stream token generation and URL construction for video playback.
 * Encapsulates business logic for authenticated HLS streaming.
 *
 * ## Responsibilities
 *
 * - Generate HMAC stream token via API
 * - Construct authenticated HLS playlist URL
 * - Validate token before returning URL
 * - Handle API errors and return Result
 *
 * ## Stream URL Format
 *
 * ```
 * https://server.local/api/transcode/{tunerId}/{channelId}/playlist.m3u8?token={token}
 * ```
 *
 * ## Architecture
 *
 * ```
 * ViewModel → GenerateStreamUrlUseCase → ChannelRepository → API Service
 * ```
 *
 * ## Usage Example
 *
 * ```kotlin
 * class PlayerViewModel @Inject constructor(
 *     private val generateStreamUrlUseCase: GenerateStreamUrlUseCase
 * ) : ViewModel() {
 *     fun startPlayback(tunerId: Int, channelId: Int, serverUrl: String) {
 *         viewModelScope.launch {
 *             generateStreamUrlUseCase(serverUrl, tunerId, channelId)
 *                 .onSuccess { url -> player.setMediaSource(url) }
 *                 .onFailure { error -> _uiState.value = Error(error.message) }
 *         }
 *     }
 * }
 * ```
 *
 * @property channelRepository Repository for channel data operations
 */
class GenerateStreamUrlUseCase @Inject constructor(
    private val channelRepository: ChannelRepository
) {
    /**
     * Generate authenticated HLS stream URL.
     *
     * 1. Requests HMAC token from API (15-minute validity)
     * 2. Validates token before constructing URL
     * 3. Returns complete HLS playlist URL with token parameter
     *
     * @param serverUrl HD Homey server base URL (e.g., "https://server.local")
     * @param tunerId Tuner ID (database primary key)
     * @param channelId Channel ID (database primary key)
     * @return Result containing HLS playlist URL or error
     */
    suspend operator fun invoke(
        serverUrl: String,
        tunerId: Int,
        channelId: Int
    ): Result<String> {
        return try {
            channelRepository.generateStreamToken(tunerId, channelId)
                .map { token ->
                    if (!token.isValid) {
                        throw IllegalStateException("Generated token is already expired")
                    }
                    buildStreamUrl(serverUrl, tunerId, channelId, token)
                }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Construct HLS playlist URL with authentication token.
     *
     * Format: `{serverUrl}/api/transcode/{tunerId}/{channelId}/playlist.m3u8?token={token}`
     *
     * Example:
     * ```
     * https://server.local/api/transcode/1/5/playlist.m3u8?token=MToxOjE3MzQyMDQ4MDA6YWJj
     * ```
     *
     * @param serverUrl Server base URL (trailing slash removed)
     * @param tunerId Tuner ID
     * @param channelId Channel ID
     * @param token Stream token with HMAC signature
     * @return Complete HLS playlist URL
     */
    private fun buildStreamUrl(
        serverUrl: String,
        tunerId: Int,
        channelId: Int,
        token: StreamToken
    ): String = buildString {
        append(serverUrl.removeSuffix("/"))
        append("/api/transcode/")
        append(tunerId)
        append("/")
        append(channelId)
        append("/playlist.m3u8?token=")
        append(token.token)
    }
}
