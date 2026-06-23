package com.hdhomey.app.domain.usecase

import com.hdhomey.app.data.repository.ChannelRepository
import com.hdhomey.app.data.repository.PreferencesRepository
import com.hdhomey.app.domain.model.Channel
import com.hdhomey.app.domain.model.ChannelPreferences
import com.hdhomey.app.domain.model.ChannelWithMetadata
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import io.mockk.slot
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertSame
import org.junit.Test

/**
 * Unit tests for [GetChannelsUseCase].
 *
 * Verifies that the use case correctly orchestrates [ChannelRepository] and
 * [PreferencesRepository]: fetching preferences first, then passing both the
 * [tunerId] and the returned preferences object on to the channel repository.
 *
 * Uses MockK for suspend-function mocking and [runTest] from
 * [kotlinx.coroutines.test] to drive coroutine execution deterministically.
 */
class GetChannelsUseCaseTest {

    private val channelRepository: ChannelRepository = mockk()
    private val preferencesRepository: PreferencesRepository = mockk()

    /** System under test — constructed directly (no DI framework needed in unit tests). */
    private val useCase = GetChannelsUseCase(channelRepository, preferencesRepository)

    // ========== Helpers ==========

    /** Convenience builder for a minimal [Channel] domain entity. */
    private fun buildChannel(id: Int, tunerId: Int = 1, number: String = "$id.1") =
        Channel(id = id, tunerId = tunerId, number = number, name = "Channel $id", isHd = true)

    /** Convenience builder for a [ChannelWithMetadata] with sensible defaults. */
    private fun buildChannelWithMetadata(
        id: Int,
        tunerId: Int = 1,
        isFavorite: Boolean = false,
        isHidden: Boolean = false
    ) = ChannelWithMetadata(
        channel = buildChannel(id = id, tunerId = tunerId),
        isFavorite = isFavorite,
        isHidden = isHidden
    )

    // ========== Returns channels with preferences merged ==========

    @Test
    fun `returns channels from channelRepository getChannelsWithMetadata`() = runTest {
        val tunerId = 1
        val preferences = ChannelPreferences.EMPTY
        val expectedChannels = listOf(
            buildChannelWithMetadata(id = 10, tunerId = tunerId),
            buildChannelWithMetadata(id = 20, tunerId = tunerId, isFavorite = true)
        )

        coEvery { preferencesRepository.getPreferences(any()) } returns preferences
        coEvery { channelRepository.getChannelsWithMetadata(any(), any()) } returns expectedChannels

        val result = useCase(tunerId)

        assertEquals(expectedChannels, result)
    }

    // ========== Passes tunerId to both repositories ==========

    @Test
    fun `passes tunerId to preferencesRepository`() = runTest {
        val tunerId = 42

        coEvery { preferencesRepository.getPreferences(any()) } returns ChannelPreferences.EMPTY
        coEvery { channelRepository.getChannelsWithMetadata(any(), any()) } returns emptyList()

        useCase(tunerId)

        coVerify(exactly = 1) { preferencesRepository.getPreferences(tunerId) }
    }

    @Test
    fun `passes tunerId to channelRepository`() = runTest {
        val tunerId = 7

        coEvery { preferencesRepository.getPreferences(any()) } returns ChannelPreferences.EMPTY
        coEvery { channelRepository.getChannelsWithMetadata(any(), any()) } returns emptyList()

        useCase(tunerId)

        coVerify(exactly = 1) { channelRepository.getChannelsWithMetadata(tunerId, any()) }
    }

    // ========== Passes preferences to channelRepository ==========

    @Test
    fun `passes the exact preferences object returned by preferencesRepository to channelRepository`() = runTest {
        val tunerId = 3
        val preferences = ChannelPreferences(favorites = setOf(1, 2), hidden = setOf(5))
        val preferencesSlot = slot<ChannelPreferences>()

        coEvery { preferencesRepository.getPreferences(any()) } returns preferences
        coEvery {
            channelRepository.getChannelsWithMetadata(any(), capture(preferencesSlot))
        } returns emptyList()

        useCase(tunerId)

        // assertSame checks reference equality — the exact object was forwarded, not a copy.
        assertSame(preferences, preferencesSlot.captured)
    }

    // ========== Returns empty list when repository returns empty ==========

    @Test
    fun `returns empty list when channelRepository returns empty list`() = runTest {
        val tunerId = 1

        coEvery { preferencesRepository.getPreferences(any()) } returns ChannelPreferences.EMPTY
        coEvery { channelRepository.getChannelsWithMetadata(any(), any()) } returns emptyList()

        val result = useCase(tunerId)

        assertEquals(emptyList<ChannelWithMetadata>(), result)
    }

    // ========== Forwards exceptions from preferencesRepository ==========

    @Test(expected = RuntimeException::class)
    fun `propagates exception thrown by preferencesRepository`() = runTest {
        val tunerId = 1

        coEvery { preferencesRepository.getPreferences(any()) } throws RuntimeException("Preferences unavailable")

        // channelRepository should never be reached — no stub needed
        useCase(tunerId)
    }

    @Test
    fun `does not call channelRepository when preferencesRepository throws`() = runTest {
        val tunerId = 1

        coEvery { preferencesRepository.getPreferences(any()) } throws RuntimeException("Network error")

        runCatching { useCase(tunerId) }

        coVerify(exactly = 0) { channelRepository.getChannelsWithMetadata(any(), any()) }
    }
}
