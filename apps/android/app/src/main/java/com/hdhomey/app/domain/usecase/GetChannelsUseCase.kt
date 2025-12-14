package com.hdhomey.app.domain.usecase

import com.hdhomey.app.data.repository.ChannelRepository
import com.hdhomey.app.domain.model.Channel
import javax.inject.Inject

/**
 * Use case for retrieving channels from a tuner.
 *
 * Orchestrates fetching channel lineup from the API via repository.
 * Encapsulates business logic for channel retrieval and error handling.
 *
 * ## Responsibilities
 *
 * - Fetch channels for a specific tuner
 * - Sort channels by guide number (numeric order)
 * - Handle API errors and return Result
 * - Cache channels in repository (future enhancement)
 *
 * ## Architecture
 *
 * ```
 * ViewModel → GetChannelsUseCase → ChannelRepository → API Service
 * ```
 *
 * ## Usage Example
 *
 * ```kotlin
 * class ChannelListViewModel @Inject constructor(
 *     private val getChannelsUseCase: GetChannelsUseCase
 * ) : ViewModel() {
 *     fun loadChannels(tunerId: Int) {
 *         viewModelScope.launch {
 *             getChannelsUseCase(tunerId)
 *                 .onSuccess { channels -> _uiState.value = Success(channels) }
 *                 .onFailure { error -> _uiState.value = Error(error.message) }
 *         }
 *     }
 * }
 * ```
 *
 * @property channelRepository Repository for channel data operations
 */
class GetChannelsUseCase @Inject constructor(
    private val channelRepository: ChannelRepository
) {
    /**
     * Retrieve channels for a tuner.
     *
     * Fetches channel lineup from the API and sorts by guide number.
     * Channels are sorted numerically (2.1, 2.2, 10.1, not 10.1, 2.1, 2.2).
     *
     * @param tunerId Tuner ID (database primary key)
     * @return Result containing sorted channel list or error
     */
    suspend operator fun invoke(tunerId: Int): Result<List<Channel>> {
        return try {
            channelRepository.getChannels(tunerId)
                .map { channels ->
                    // Sort channels by guide number (numeric order)
                    channels.sortedBy { it.sortKey }
                }
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
