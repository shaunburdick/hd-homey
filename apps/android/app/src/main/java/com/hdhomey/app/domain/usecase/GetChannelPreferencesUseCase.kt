package com.hdhomey.app.domain.usecase

import com.hdhomey.app.data.repository.PreferencesRepository
import com.hdhomey.app.domain.model.ChannelPreferences
import javax.inject.Inject
import javax.inject.Singleton

/**
 * Use case for fetching user channel preferences.
 *
 * Provides a clean boundary between UI layer and preference data.
 */
@Singleton
class GetChannelPreferencesUseCase @Inject constructor(
    private val preferencesRepository: PreferencesRepository
) {

    /**
     * Fetch channel preferences, optionally filtered by tuner.
     *
     * @param tunerId Optional tuner filter
     * @return [ChannelPreferences] with favorite and hidden channel IDs
     */
    suspend operator fun invoke(tunerId: Int? = null): ChannelPreferences {
        return preferencesRepository.getPreferences(tunerId)
    }
}
