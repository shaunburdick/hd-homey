package com.hdhomey.app.data.repository

import com.hdhomey.app.api.HdHomeyApiService
import com.hdhomey.app.api.HdHomeyApiServiceProvider
import com.hdhomey.app.api.models.ChannelDto
import com.hdhomey.app.api.models.DataResponse
import com.hdhomey.app.api.models.TunerDto
import com.hdhomey.app.data.model.Server
import com.hdhomey.app.domain.model.ChannelPreferences
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.every
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import retrofit2.HttpException

/**
 * Unit tests for [ChannelRepository].
 *
 * The repository is thin by design — it delegates mapping to extension functions
 * ([com.hdhomey.app.data.mapper.toDomainChannels] and
 * [com.hdhomey.app.data.mapper.withMetadata]) rather than an injectable mapper
 * class. Tests therefore verify end-to-end behaviour (DTO → domain) rather than
 * mocking the mapper in isolation.
 *
 * [HdHomeyApiServiceProvider] is mocked, and the underlying [HdHomeyApiService]
 * is mocked via the provider. All coroutine tests use [runTest]
 * with [coEvery]/[coVerify] for suspend functions.
 */
class ChannelRepositoryTest {

    private val apiServiceProvider: HdHomeyApiServiceProvider = mockk()
    private val repository = ChannelRepository(apiServiceProvider)

    /** Test server fixture — used by all tests that need a server reference. */
    private val testServer = Server(
        id = "test-server",
        name = "Test Server",
        url = "http://192.168.1.100:3000",
        jwt = "test-jwt-token",
        expiresAt = System.currentTimeMillis() + 86_400_000L,
        userRole = "admin",
        username = "testuser"
    )

    // ========== getChannels ==========

    @Test
    fun `getChannels returns mapped domain channels`() = runTest {
        val tunerId = 1
        val dtos = listOf(
            channelDto(id = 10, fkTuner = tunerId, guideNumber = "2.1", guideName = "CBS", hd = 1),
            channelDto(id = 20, fkTuner = tunerId, guideNumber = "4.1", guideName = "NBC", hd = 0)
        )
        val apiService: HdHomeyApiService = mockk()
        coEvery { apiService.getChannels(tunerId) } returns DataResponse(dtos)
        every { apiServiceProvider.getService(testServer.url, testServer.jwt) } returns apiService

        val result = repository.getChannels(testServer, tunerId)

        assertEquals(2, result.size)

        assertEquals(10, result[0].id)
        assertEquals(tunerId, result[0].tunerId)
        assertEquals("2.1", result[0].number)
        assertEquals("CBS", result[0].name)
        assertTrue(result[0].isHd)

        assertEquals(20, result[1].id)
        assertEquals(tunerId, result[1].tunerId)
        assertEquals("4.1", result[1].number)
        assertEquals("NBC", result[1].name)
        assertFalse(result[1].isHd)

        coVerify(exactly = 1) { apiService.getChannels(tunerId) }
    }

    @Test
    fun `getChannels returns empty list when API returns empty data`() = runTest {
        val tunerId = 2
        val apiService: HdHomeyApiService = mockk()
        coEvery { apiService.getChannels(tunerId) } returns DataResponse(emptyList())
        every { apiServiceProvider.getService(testServer.url, testServer.jwt) } returns apiService

        val result = repository.getChannels(testServer, tunerId)

        assertTrue(result.isEmpty())
        coVerify(exactly = 1) { apiService.getChannels(tunerId) }
    }

    @Test
    fun `getChannels maps hd flag 1 to isHd true`() = runTest {
        val tunerId = 1
        val apiService: HdHomeyApiService = mockk()
        coEvery { apiService.getChannels(tunerId) } returns DataResponse(
            listOf(channelDto(hd = 1))
        )
        every { apiServiceProvider.getService(testServer.url, testServer.jwt) } returns apiService

        val result = repository.getChannels(testServer, tunerId)

        assertTrue(result.single().isHd)
    }

    @Test
    fun `getChannels maps hd flag 0 to isHd false`() = runTest {
        val tunerId = 1
        val apiService: HdHomeyApiService = mockk()
        coEvery { apiService.getChannels(tunerId) } returns DataResponse(
            listOf(channelDto(hd = 0))
        )
        every { apiServiceProvider.getService(testServer.url, testServer.jwt) } returns apiService

        val result = repository.getChannels(testServer, tunerId)

        assertFalse(result.single().isHd)
    }

    @Test(expected = RuntimeException::class)
    fun `getChannels propagates network exception`() = runTest {
        val tunerId = 3
        val apiService: HdHomeyApiService = mockk()
        coEvery { apiService.getChannels(tunerId) } throws RuntimeException("Network failure")
        every { apiServiceProvider.getService(testServer.url, testServer.jwt) } returns apiService

        repository.getChannels(testServer, tunerId)
    }

    @Test(expected = HttpException::class)
    fun `getChannels propagates HTTP exception`() = runTest {
        val tunerId = 4
        val httpException = mockk<HttpException>(relaxed = true)
        val apiService: HdHomeyApiService = mockk()
        coEvery { apiService.getChannels(tunerId) } throws httpException
        every { apiServiceProvider.getService(testServer.url, testServer.jwt) } returns apiService

        repository.getChannels(testServer, tunerId)
    }

    // ========== getChannelsWithMetadata ==========

    @Test
    fun `getChannelsWithMetadata returns channels combined with preferences`() = runTest {
        val tunerId = 1
        val dtos = listOf(
            channelDto(id = 10, fkTuner = tunerId, guideNumber = "2.1", guideName = "CBS"),
            channelDto(id = 20, fkTuner = tunerId, guideNumber = "4.1", guideName = "NBC")
        )
        val preferences = ChannelPreferences(favorites = setOf(10))
        val apiService: HdHomeyApiService = mockk()
        coEvery { apiService.getChannels(tunerId) } returns DataResponse(dtos)
        every { apiServiceProvider.getService(testServer.url, testServer.jwt) } returns apiService

        val result = repository.getChannelsWithMetadata(testServer, tunerId, preferences)

        assertEquals(2, result.size)
        // Channel 10 is a favorite and should sort first
        val cbsEntry = result.first { it.channel.id == 10 }
        assertTrue(cbsEntry.isFavorite)
        assertFalse(cbsEntry.isHidden)

        val nbcEntry = result.first { it.channel.id == 20 }
        assertFalse(nbcEntry.isFavorite)
        assertFalse(nbcEntry.isHidden)
    }

    @Test
    fun `getChannelsWithMetadata forwards favorite preference to each channel`() = runTest {
        val tunerId = 1
        val dtos = listOf(
            channelDto(id = 5, fkTuner = tunerId),
            channelDto(id = 6, fkTuner = tunerId)
        )
        val preferences = ChannelPreferences(favorites = setOf(5))
        val apiService: HdHomeyApiService = mockk()
        coEvery { apiService.getChannels(tunerId) } returns DataResponse(dtos)
        every { apiServiceProvider.getService(testServer.url, testServer.jwt) } returns apiService

        val result = repository.getChannelsWithMetadata(testServer, tunerId, preferences)

        val channel5 = result.first { it.channel.id == 5 }
        val channel6 = result.first { it.channel.id == 6 }
        assertTrue("Channel 5 should be a favourite", channel5.isFavorite)
        assertFalse("Channel 6 should not be a favourite", channel6.isFavorite)
    }

    @Test
    fun `getChannelsWithMetadata forwards hidden preference to each channel`() = runTest {
        val tunerId = 1
        val dtos = listOf(
            channelDto(id = 7, fkTuner = tunerId),
            channelDto(id = 8, fkTuner = tunerId)
        )
        val preferences = ChannelPreferences(hidden = setOf(7))
        val apiService: HdHomeyApiService = mockk()
        coEvery { apiService.getChannels(tunerId) } returns DataResponse(dtos)
        every { apiServiceProvider.getService(testServer.url, testServer.jwt) } returns apiService

        val result = repository.getChannelsWithMetadata(testServer, tunerId, preferences)

        val channel7 = result.first { it.channel.id == 7 }
        val channel8 = result.first { it.channel.id == 8 }
        assertTrue("Channel 7 should be hidden", channel7.isHidden)
        assertFalse("Channel 8 should not be hidden", channel8.isHidden)
    }

    @Test
    fun `getChannelsWithMetadata defaults to EMPTY preferences`() = runTest {
        val tunerId = 1
        val dtos = listOf(channelDto(id = 9, fkTuner = tunerId))
        val apiService: HdHomeyApiService = mockk()
        coEvery { apiService.getChannels(tunerId) } returns DataResponse(dtos)
        every { apiServiceProvider.getService(testServer.url, testServer.jwt) } returns apiService

        // Call without explicit preferences — default is ChannelPreferences.EMPTY
        val result = repository.getChannelsWithMetadata(testServer, tunerId)

        assertEquals(1, result.size)
        assertFalse(result[0].isFavorite)
        assertFalse(result[0].isHidden)
    }

    @Test
    fun `getChannelsWithMetadata sorts favorites before non-favorites`() = runTest {
        val tunerId = 1
        val dtos = listOf(
            channelDto(id = 100, fkTuner = tunerId, guideNumber = "2.1"),
            channelDto(id = 200, fkTuner = tunerId, guideNumber = "4.1"),
            channelDto(id = 300, fkTuner = tunerId, guideNumber = "7.1")
        )
        // Mark the last channel (300) as favorite; it should appear first in the result.
        val preferences = ChannelPreferences(favorites = setOf(300))
        val apiService: HdHomeyApiService = mockk()
        coEvery { apiService.getChannels(tunerId) } returns DataResponse(dtos)
        every { apiServiceProvider.getService(testServer.url, testServer.jwt) } returns apiService

        val result = repository.getChannelsWithMetadata(testServer, tunerId, preferences)

        assertEquals(300, result[0].channel.id)
        assertTrue(result[0].isFavorite)
        // Remaining channels are sorted by channel number (2.1 < 4.1)
        assertEquals(100, result[1].channel.id)
        assertEquals(200, result[2].channel.id)
    }

    @Test
    fun `getChannelsWithMetadata sorts non-favorites by channel number`() = runTest {
        val tunerId = 1
        // Deliberately out-of-order guide numbers to verify numeric sort.
        val dtos = listOf(
            channelDto(id = 1, fkTuner = tunerId, guideNumber = "11.1"),
            channelDto(id = 2, fkTuner = tunerId, guideNumber = "2.1"),
            channelDto(id = 3, fkTuner = tunerId, guideNumber = "4.1")
        )
        val apiService: HdHomeyApiService = mockk()
        coEvery { apiService.getChannels(tunerId) } returns DataResponse(dtos)
        every { apiServiceProvider.getService(testServer.url, testServer.jwt) } returns apiService

        val result = repository.getChannelsWithMetadata(testServer, tunerId, ChannelPreferences.EMPTY)

        assertEquals("2.1", result[0].channel.number)
        assertEquals("4.1", result[1].channel.number)
        assertEquals("11.1", result[2].channel.number)
    }

    @Test(expected = RuntimeException::class)
    fun `getChannelsWithMetadata propagates API exception`() = runTest {
        val tunerId = 5
        val apiService: HdHomeyApiService = mockk()
        coEvery { apiService.getChannels(tunerId) } throws RuntimeException("Timeout")
        every { apiServiceProvider.getService(testServer.url, testServer.jwt) } returns apiService

        repository.getChannelsWithMetadata(testServer, tunerId)
    }

    // ========== getTuners ==========

    @Test
    fun `getTuners returns id-name pairs for each tuner`() = runTest {
        val tunerDtos = listOf(
            tunerDto(id = 1, name = "Living Room"),
            tunerDto(id = 2, name = "Bedroom")
        )
        val apiService: HdHomeyApiService = mockk()
        coEvery { apiService.getTuners() } returns DataResponse(tunerDtos)
        every { apiServiceProvider.getService(testServer.url, testServer.jwt) } returns apiService

        val result = repository.getTuners(testServer)

        assertEquals(2, result.size)
        assertEquals(1 to "Living Room", result[0])
        assertEquals(2 to "Bedroom", result[1])

        coVerify(exactly = 1) { apiService.getTuners() }
    }

    @Test
    fun `getTuners returns empty list when API returns empty data`() = runTest {
        val apiService: HdHomeyApiService = mockk()
        coEvery { apiService.getTuners() } returns DataResponse(emptyList())
        every { apiServiceProvider.getService(testServer.url, testServer.jwt) } returns apiService

        val result = repository.getTuners(testServer)

        assertTrue(result.isEmpty())
        coVerify(exactly = 1) { apiService.getTuners() }
    }

    @Test
    fun `getTuners preserves tuner ID values in pairs`() = runTest {
        val tunerDtos = listOf(tunerDto(id = 42, name = "Garage"))
        val apiService: HdHomeyApiService = mockk()
        coEvery { apiService.getTuners() } returns DataResponse(tunerDtos)
        every { apiServiceProvider.getService(testServer.url, testServer.jwt) } returns apiService

        val result = repository.getTuners(testServer)

        assertEquals(42, result.single().first)
        assertEquals("Garage", result.single().second)
    }

    @Test(expected = RuntimeException::class)
    fun `getTuners propagates network exception`() = runTest {
        val apiService: HdHomeyApiService = mockk()
        coEvery { apiService.getTuners() } throws RuntimeException("Connection refused")
        every { apiServiceProvider.getService(testServer.url, testServer.jwt) } returns apiService

        repository.getTuners(testServer)
    }

    @Test(expected = HttpException::class)
    fun `getTuners propagates HTTP exception`() = runTest {
        val httpException = mockk<HttpException>(relaxed = true)
        val apiService: HdHomeyApiService = mockk()
        coEvery { apiService.getTuners() } throws httpException
        every { apiServiceProvider.getService(testServer.url, testServer.jwt) } returns apiService

        repository.getTuners(testServer)
    }

    // ─── helpers ────────────────────────────────────────────────────────────────

    /**
     * Factory for [ChannelDto] test fixtures with sensible defaults.
     *
     * Only override the fields that matter for the specific test case.
     */
    private fun channelDto(
        id: Int = 1,
        fkTuner: Int = 1,
        guideNumber: String = "2.1",
        guideName: String = "CBS",
        videoCodec: String = "H264",
        audioCodec: String = "AC3",
        hd: Int = 1,
        url: String = "http://hdhomerun/auto/v2.1",
        isActive: Boolean = true,
        createdAt: String = "2024-01-01T00:00:00Z",
        modifiedAt: String = "2024-01-01T00:00:00Z"
    ) = ChannelDto(
        id = id,
        fkTuner = fkTuner,
        guideNumber = guideNumber,
        guideName = guideName,
        videoCodec = videoCodec,
        audioCodec = audioCodec,
        hd = hd,
        url = url,
        isActive = isActive,
        createdAt = createdAt,
        modifiedAt = modifiedAt
    )

    /**
     * Factory for [TunerDto] test fixtures with sensible defaults.
     *
     * Only override the fields that matter for the specific test case.
     */
    private fun tunerDto(
        id: Int = 1,
        name: String = "Living Room",
        path: String = "http://192.168.1.100",
        lastScanned: String? = "2024-01-01T00:00:00Z",
        isActive: Boolean = true,
        createdAt: String = "2024-01-01T00:00:00Z",
        modifiedAt: String = "2024-01-01T00:00:00Z"
    ) = TunerDto(
        id = id,
        name = name,
        path = path,
        lastScanned = lastScanned,
        isActive = isActive,
        createdAt = createdAt,
        modifiedAt = modifiedAt
    )
}
