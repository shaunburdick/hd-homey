package com.hdhomey.app.domain.usecase

import com.hdhomey.app.data.repository.ChannelRepository
import com.hdhomey.app.domain.model.Channel
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*
import retrofit2.HttpException
import java.io.IOException

/**
 * Unit tests for GetChannelsUseCase.
 *
 * Tests channel retrieval orchestration, sorting logic, and error handling.
 */
class GetChannelsUseCaseTest {

    private lateinit var useCase: GetChannelsUseCase
    private lateinit var channelRepository: ChannelRepository

    private val testTunerId = 1

    @Before
    fun setup() {
        channelRepository = mockk()
        useCase = GetChannelsUseCase(channelRepository)
    }

    // ========== Success Cases ==========

    @Test
    fun `invoke should return channels sorted by number on success`() = runTest {
        // Given: Unsorted channels from repository
        val unsortedChannels = listOf(
            createChannel(id = 1, number = "10.1"),
            createChannel(id = 2, number = "2.1"),
            createChannel(id = 3, number = "5.3"),
            createChannel(id = 4, number = "2.2"),
            createChannel(id = 5, number = "100.1")
        )
        coEvery { channelRepository.getChannels(testTunerId) } returns Result.success(unsortedChannels)

        // When: Invoke use case
        val result = useCase(testTunerId)

        // Then: Channels are sorted numerically
        assertTrue(result.isSuccess)
        val channels = result.getOrNull()!!
        assertEquals(5, channels.size)
        assertEquals("2.1", channels[0].number)
        assertEquals("2.2", channels[1].number)
        assertEquals("5.3", channels[2].number)
        assertEquals("10.1", channels[3].number)
        assertEquals("100.1", channels[4].number)
    }

    @Test
    fun `invoke should return empty list when repository returns empty list`() = runTest {
        // Given: Empty channel list
        coEvery { channelRepository.getChannels(testTunerId) } returns Result.success(emptyList())

        // When: Invoke use case
        val result = useCase(testTunerId)

        // Then: Result is success with empty list
        assertTrue(result.isSuccess)
        val channels = result.getOrNull()!!
        assertEquals(0, channels.size)
    }

    @Test
    fun `invoke should return single channel when only one channel exists`() = runTest {
        // Given: Single channel
        val channels = listOf(createChannel(number = "5.1"))
        coEvery { channelRepository.getChannels(testTunerId) } returns Result.success(channels)

        // When: Invoke use case
        val result = useCase(testTunerId)

        // Then: Result is success with one channel
        assertTrue(result.isSuccess)
        val resultChannels = result.getOrNull()!!
        assertEquals(1, resultChannels.size)
        assertEquals("5.1", resultChannels[0].number)
    }

    @Test
    fun `invoke should sort channels with invalid numbers at the end`() = runTest {
        // Given: Mix of valid and invalid channel numbers
        val channels = listOf(
            createChannel(id = 1, number = "5.1"),
            createChannel(id = 2, number = "invalid"),  // Should sort to end (999.0)
            createChannel(id = 3, number = "2.1"),
            createChannel(id = 4, number = "abc"),      // Should sort to end (999.0)
            createChannel(id = 5, number = "10.1")
        )
        coEvery { channelRepository.getChannels(testTunerId) } returns Result.success(channels)

        // When: Invoke use case
        val result = useCase(testTunerId)

        // Then: Valid numbers sorted first, invalid last
        assertTrue(result.isSuccess)
        val resultChannels = result.getOrNull()!!
        assertEquals(5, resultChannels.size)
        assertEquals("2.1", resultChannels[0].number)
        assertEquals("5.1", resultChannels[1].number)
        assertEquals("10.1", resultChannels[2].number)
        // Invalid numbers should be at the end
        assertTrue(resultChannels[3].number in listOf("invalid", "abc"))
        assertTrue(resultChannels[4].number in listOf("invalid", "abc"))
    }

    @Test
    fun `invoke should handle decimal channel numbers correctly`() = runTest {
        // Given: Channels with decimal numbers
        val channels = listOf(
            createChannel(number = "2.1"),
            createChannel(number = "2.10"),
            createChannel(number = "2.2"),
            createChannel(number = "2.3")
        )
        coEvery { channelRepository.getChannels(testTunerId) } returns Result.success(channels)

        // When: Invoke use case
        val result = useCase(testTunerId)

        // Then: Channels sorted numerically (2.1, 2.2, 2.3, 2.10)
        assertTrue(result.isSuccess)
        val resultChannels = result.getOrNull()!!
        assertEquals("2.1", resultChannels[0].number)
        assertEquals("2.2", resultChannels[1].number)
        assertEquals("2.3", resultChannels[2].number)
        assertEquals("2.10", resultChannels[3].number)
    }

    @Test
    fun `invoke should preserve all channel properties during sorting`() = runTest {
        // Given: Channels with various properties
        val channels = listOf(
            createChannel(id = 1, number = "5.1", name = "NBC", isHd = true, videoCodec = "H264"),
            createChannel(id = 2, number = "2.1", name = "CBS", isHd = false, videoCodec = "MPEG2")
        )
        coEvery { channelRepository.getChannels(testTunerId) } returns Result.success(channels)

        // When: Invoke use case
        val result = useCase(testTunerId)

        // Then: All properties preserved after sorting
        assertTrue(result.isSuccess)
        val resultChannels = result.getOrNull()!!
        assertEquals(2, resultChannels.size)
        
        // First channel (2.1 CBS)
        assertEquals(2, resultChannels[0].id)
        assertEquals("2.1", resultChannels[0].number)
        assertEquals("CBS", resultChannels[0].name)
        assertFalse(resultChannels[0].isHd)
        assertEquals("MPEG2", resultChannels[0].videoCodec)
        
        // Second channel (5.1 NBC)
        assertEquals(1, resultChannels[1].id)
        assertEquals("5.1", resultChannels[1].number)
        assertEquals("NBC", resultChannels[1].name)
        assertTrue(resultChannels[1].isHd)
        assertEquals("H264", resultChannels[1].videoCodec)
    }

    // ========== Error Cases ==========

    @Test
    fun `invoke should propagate network error from repository`() = runTest {
        // Given: Repository throws IOException
        val networkError = IOException("Network timeout")
        coEvery { channelRepository.getChannels(testTunerId) } returns Result.failure(networkError)

        // When: Invoke use case
        val result = useCase(testTunerId)

        // Then: Result is failure with IOException
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is IOException)
        assertEquals("Network timeout", result.exceptionOrNull()?.message)
    }

    @Test
    fun `invoke should propagate 401 authentication error from repository`() = runTest {
        // Given: Repository returns 401 error
        val authError = mockk<HttpException>()
        coEvery { authError.code() } returns 401
        coEvery { authError.message() } returns "Unauthorized"
        coEvery { channelRepository.getChannels(testTunerId) } returns Result.failure(authError)

        // When: Invoke use case
        val result = useCase(testTunerId)

        // Then: Result is failure with HttpException
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is HttpException)
        val exception = result.exceptionOrNull() as HttpException
        assertEquals(401, exception.code())
    }

    @Test
    fun `invoke should propagate 404 not found error from repository`() = runTest {
        // Given: Repository returns 404 error
        val notFoundError = mockk<HttpException>()
        coEvery { notFoundError.code() } returns 404
        coEvery { notFoundError.message() } returns "Tuner not found"
        coEvery { channelRepository.getChannels(testTunerId) } returns Result.failure(notFoundError)

        // When: Invoke use case
        val result = useCase(testTunerId)

        // Then: Result is failure with HttpException
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is HttpException)
        val exception = result.exceptionOrNull() as HttpException
        assertEquals(404, exception.code())
    }

    @Test
    fun `invoke should propagate 500 server error from repository`() = runTest {
        // Given: Repository returns 500 error
        val serverError = mockk<HttpException>()
        coEvery { serverError.code() } returns 500
        coEvery { serverError.message() } returns "Internal server error"
        coEvery { channelRepository.getChannels(testTunerId) } returns Result.failure(serverError)

        // When: Invoke use case
        val result = useCase(testTunerId)

        // Then: Result is failure with HttpException
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is HttpException)
        val exception = result.exceptionOrNull() as HttpException
        assertEquals(500, exception.code())
    }

    @Test
    fun `invoke should handle repository throwing unexpected exception`() = runTest {
        // Given: Repository throws unexpected exception
        val unexpectedException = RuntimeException("Unexpected error")
        coEvery { channelRepository.getChannels(testTunerId) } throws unexpectedException

        // When: Invoke use case
        val result = useCase(testTunerId)

        // Then: Result is failure with RuntimeException
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is RuntimeException)
        assertEquals("Unexpected error", result.exceptionOrNull()?.message)
    }

    // ========== Edge Cases ==========

    @Test
    fun `invoke should handle large channel lists efficiently`() = runTest {
        // Given: Large channel list (100 channels in random order)
        val channels = (1..100).map { i ->
            createChannel(id = i, number = "${(100 - i)}.1")  // Reverse order
        }
        coEvery { channelRepository.getChannels(testTunerId) } returns Result.success(channels)

        // When: Invoke use case
        val result = useCase(testTunerId)

        // Then: All channels sorted correctly
        assertTrue(result.isSuccess)
        val resultChannels = result.getOrNull()!!
        assertEquals(100, resultChannels.size)
        // Verify first and last
        assertEquals("1.1", resultChannels[0].number)
        assertEquals("100.1", resultChannels[99].number)
    }

    @Test
    fun `invoke should handle channels with same number`() = runTest {
        // Given: Channels with duplicate numbers (shouldn't happen in practice)
        val channels = listOf(
            createChannel(id = 1, number = "5.1", name = "NBC"),
            createChannel(id = 2, number = "5.1", name = "NBC-HD"),
            createChannel(id = 3, number = "2.1", name = "CBS")
        )
        coEvery { channelRepository.getChannels(testTunerId) } returns Result.success(channels)

        // When: Invoke use case
        val result = useCase(testTunerId)

        // Then: All channels returned, sorted (stable sort preserves order)
        assertTrue(result.isSuccess)
        val resultChannels = result.getOrNull()!!
        assertEquals(3, resultChannels.size)
        assertEquals("2.1", resultChannels[0].number)
        assertEquals("5.1", resultChannels[1].number)
        assertEquals("5.1", resultChannels[2].number)
    }

    // ========== Helper Functions ==========

    /**
     * Create a test channel with default values.
     */
    private fun createChannel(
        id: Int = 1,
        tunerId: Int = testTunerId,
        number: String = "2.1",
        name: String = "Test Channel",
        isHd: Boolean = true,
        videoCodec: String = "H264",
        audioCodec: String = "AAC",
        streamUrl: String = "http://test/stream"
    ): Channel {
        return Channel(
            id = id,
            tunerId = tunerId,
            number = number,
            name = name,
            isHd = isHd,
            videoCodec = videoCodec,
            audioCodec = audioCodec,
            streamUrl = streamUrl
        )
    }
}
