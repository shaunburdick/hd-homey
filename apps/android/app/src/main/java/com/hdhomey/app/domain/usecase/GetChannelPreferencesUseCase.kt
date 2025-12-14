package com.hdhomey.app.domain.usecase

import com.hdhomey.app.data.repository.PreferencesRepository
import com.hdhomey.app.domain.model.ChannelPreferences
import javax.inject.Inject

/**
 * Use case for retrieving user channel preferences.
 *
 * Orchestrates fetching user's favorite and hidden channels from the API.
 * Encapsulates business logic for channel preference retrieval.
 *
 * ## Responsibilities
 *
 * - Fetch channel preferences for authenticated user
 * - Handle API errors gracefully (return empty preferences)
 * - Cache preferences in repository (future enhancement)
 *
 * ## Backend Status
 *
 * **WARNING**: Backend endpoint NOT YET IMPLEMENTED
 * - API: `GET /api/preferences/channels`
 * - Implementation required in apps/web/src/app/api/preferences/channels/route.ts
 * - Until implemented, this use case will return [ChannelPreferences.EMPTY]
 *
 * ## Architecture
 *
 * ```
 * ViewModel → GetChannelPreferencesUseCase → PreferencesRepository → API Service
 * ```
 *
 * ## Usage Example
 *
 * ```kotlin
 * class ChannelListViewModel @Inject constructor(
 *     private val getChannelsUseCase: GetChannelsUseCase,
 *     private val getPreferencesUseCase: GetChannelPreferencesUseCase
 * ) : ViewModel() {
 *     fun loadChannelData(tunerId: Int) {
 *         viewModelScope.launch {
 *             val channelsResult = getChannelsUseCase(tunerId)
 *             val preferencesResult = getPreferencesUseCase(tunerId)
 *
 *             if (channelsResult.isSuccess && preferencesResult.isSuccess) {
 *                 val channels = channelsResult.getOrThrow()
 *                 val prefs = preferencesResult.getOrThrow()
 *                 _uiState.value = Success(mergeChannelsWithPreferences(channels, prefs))
 *             }
 *         }
 *     }
 * }
 * ```
 *
 * @property preferencesRepository Repository for user preferences
 */
class GetChannelPreferencesUseCase @Inject constructor(
    private val preferencesRepository: PreferencesRepository
) {
    /**
     * Retrieve channel preferences for a tuner.
     *
     * Fetches user's favorites and hidden channels for the specified tuner.
     * If API call fails or backend endpoint is not implemented, returns
     * empty preferences to allow graceful degradation.
     *
     * @param tunerId Optional tuner ID filter (null = all tuners)
     * @return Result containing channel preferences or empty preferences on error
     */
    suspend operator fun invoke(tunerId: Int? = null): Result<ChannelPreferences> {
        return try {
            preferencesRepository.getChannelPreferences(tunerId)
        } catch (e: Exception) {
            // Graceful degradation: return empty preferences if API fails
            // This allows app to function without preference features
            Result.success(ChannelPreferences.EMPTY)
        }
    }
}
