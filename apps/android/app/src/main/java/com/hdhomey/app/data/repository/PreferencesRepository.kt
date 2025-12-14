package com.hdhomey.app.data.repository

import com.hdhomey.app.api.HdHomeyApiService
import com.hdhomey.app.data.mapper.toChannelPreferences
import com.hdhomey.app.domain.model.ChannelPreferences
import retrofit2.HttpException
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Repository for user preferences data operations.
 *
 * Handles fetching user's channel preferences (favorites, hidden channels).
 * Abstracts API details from use cases and ViewModels.
 *
 * **Note**: This is different from [com.hdhomey.app.storage.AppPreferences]
 * which handles app-level settings (active server, etc.).
 *
 * ## Responsibilities
 *
 * - Fetch channel preferences for authenticated user
 * - Map API DTOs to domain models
 * - Handle API errors with meaningful messages
 * - Provide graceful fallback to empty preferences
 *
 * ## Backend Status
 *
 * **WARNING**: Backend endpoint NOT YET IMPLEMENTED
 * - API: `GET /api/preferences/channels`
 * - Implementation required in: apps/web/src/app/api/preferences/channels/route.ts
 * - Until implemented, API will return 404 Not Found
 *
 * ## Architecture
 *
 * ```
 * UseCase → PreferencesRepository → HdHomeyApiService (Retrofit) → Backend API
 * ```
 *
 * ## Error Handling
 *
 * All methods return [Result] for explicit error handling:
 * - Success: `Result.success(preferences)`
 * - Failure: `Result.failure(exception)` or fallback to [ChannelPreferences.EMPTY]
 *
 * Common API errors:
 * - 401 Unauthorized: JWT token expired (handled by ErrorInterceptor)
 * - 404 Not Found: Endpoint not implemented (expected in Phase 2)
 * - 500 Internal Server Error: Backend error
 *
 * ## Usage Example
 *
 * ```kotlin
 * class GetChannelPreferencesUseCase @Inject constructor(
 *     private val preferencesRepository: PreferencesRepository
 * ) {
 *     suspend fun invoke(tunerId: Int?): Result<ChannelPreferences> {
 *         return preferencesRepository.getChannelPreferences(tunerId)
 *     }
 * }
 * ```
 *
 * @property apiService Retrofit API service for HTTP requests
 */
@Singleton
class PreferencesRepository @Inject constructor(
    private val apiService: HdHomeyApiService
) {
    /**
     * Fetch channel preferences for authenticated user.
     *
     * Retrieves user's favorite and hidden channels for the specified tuner.
     * If tuner ID is null, returns preferences for all tuners.
     *
     * **API Endpoint**: `GET /api/preferences/channels?tunerId={tunerId}`
     *
     * **Response**: List of channel preferences with flags:
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
     * **Graceful Degradation**:
     * - If backend returns 404 (endpoint not implemented), returns empty preferences
     * - If network error occurs, returns empty preferences
     * - This allows app to function without preference features
     *
     * @param tunerId Optional tuner ID filter (null = all tuners)
     * @return Result containing channel preferences or empty preferences on error
     */
    suspend fun getChannelPreferences(tunerId: Int? = null): Result<ChannelPreferences> {
        return try {
            val response = apiService.getChannelPreferences(tunerId)
            if (response.isSuccessful && response.body() != null) {
                val preferences = response.body()!!.data.toChannelPreferences()
                Result.success(preferences)
            } else if (response.code() == 404) {
                // Backend endpoint not implemented yet - graceful degradation
                Result.success(ChannelPreferences.EMPTY)
            } else {
                Result.failure(
                    HttpException(response)
                )
            }
        } catch (e: Exception) {
            // Network error or other exception - graceful degradation
            Result.success(ChannelPreferences.EMPTY)
        }
    }
}
