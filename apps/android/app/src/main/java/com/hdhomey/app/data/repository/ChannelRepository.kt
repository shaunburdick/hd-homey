package com.hdhomey.app.data.repository

import com.hdhomey.app.api.HdHomeyApiService
import com.hdhomey.app.api.models.StreamTokenRequest
import com.hdhomey.app.data.mapper.toDomain
import com.hdhomey.app.domain.model.Channel
import com.hdhomey.app.domain.model.StreamToken
import retrofit2.HttpException
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for channel data operations.
 *
 * Handles fetching channel lineups and generating stream tokens via the API.
 * Abstracts API details from use cases and ViewModels.
 *
 * ## Responsibilities
 *
 * - Fetch channel lineup for a tuner
 * - Generate HLS stream tokens for playback
 * - Map API DTOs to domain models
 * - Handle API errors with meaningful messages
 *
 * ## Architecture
 *
 * ```
 * UseCase → ChannelRepository → HdHomeyApiService (Retrofit) → Backend API
 * ```
 *
 * ## Error Handling
 *
 * All methods return [Result] for explicit error handling:
 * - Success: `Result.success(data)`
 * - Failure: `Result.failure(exception)`
 *
 * Common API errors:
 * - 401 Unauthorized: JWT token expired (handled by ErrorInterceptor)
 * - 404 Not Found: Tuner or channel doesn't exist
 * - 500 Internal Server Error: Backend error
 *
 * ## Usage Example
 *
 * ```kotlin
 * class GetChannelsUseCase @Inject constructor(
 *     private val channelRepository: ChannelRepository
 * ) {
 *     suspend fun invoke(tunerId: Int): Result<List<Channel>> {
 *         return channelRepository.getChannels(tunerId)
 *     }
 * }
 * ```
 *
 * @property apiService Retrofit API service for HTTP requests
 */
@Singleton
class ChannelRepository @Inject constructor(
    private val apiService: HdHomeyApiService
) {
    /**
     * Fetch channel lineup for a tuner.
     *
     * Retrieves all active channels from the specified tuner.
     * Channels are returned in database order (use case should sort by guide number).
     *
     * **API Endpoint**: `GET /api/tuners/{tunerId}/channels`
     *
     * @param tunerId Tuner ID (database primary key)
     * @return Result containing list of channels or error
     * @throws HttpException for API errors (401, 404, 500)
     */
    suspend fun getChannels(tunerId: Int): Result<List<Channel>> {
        return try {
            val response = apiService.getChannels(tunerId)
            if (response.isSuccessful && response.body() != null) {
                val channels = response.body()!!.data.toDomain()
                Result.success(channels)
            } else {
                Result.failure(
                    HttpException(response)
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }

    /**
     * Generate stream token for HLS playback.
     *
     * Creates a short-lived HMAC token (15-minute validity) for streaming
     * a specific channel. Token grants access to HLS playlist and segments.
     *
     * **API Endpoint**: `POST /api/stream-token`
     *
     * **Request Body**:
     * ```json
     * {
     *   "tunerId": 1,
     *   "channelId": 5
     * }
     * ```
     *
     * @param tunerId Tuner ID (database primary key)
     * @param channelId Channel ID (database primary key)
     * @return Result containing stream token or error
     * @throws HttpException for API errors (400, 401, 404, 500)
     */
    suspend fun generateStreamToken(
        tunerId: Int,
        channelId: Int
    ): Result<StreamToken> {
        return try {
            val request = StreamTokenRequest(tunerId, channelId)
            val response = apiService.generateStreamToken(request)
            if (response.isSuccessful && response.body() != null) {
                val token = response.body()!!.toDomain()
                Result.success(token)
            } else {
                Result.failure(
                    HttpException(response)
                )
            }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
