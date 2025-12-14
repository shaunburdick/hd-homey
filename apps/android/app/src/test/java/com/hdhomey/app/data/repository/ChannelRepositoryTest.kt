package com.hdhomey.app.data.repository

import com.hdhomey.app.api.HdHomeyApiService
import com.hdhomey.app.api.models.ChannelListResponse
import com.hdhomey.app.api.models.StreamTokenRequest
import com.hdhomey.app.api.models.StreamTokenResponse
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import okhttp3.ResponseBody.Companion.toResponseBody
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*
import retrofit2.HttpException
import retrofit2.Response
import java.io.IOException

/**
 * Unit tests for ChannelRepository.
 *
 * Tests API call wrapping, error handling, and domain model mapping.
 */
class ChannelRepositoryTest {

    private lateinit var repository: ChannelRepository
    private lateinit var apiService: HdHomeyApiService

    // Test data
    private val testTunerId = 1
    private val testChannelId = 5

    @Before
    fun setup() {
        apiService = mockk()
        repository = ChannelRepository(apiService)
    }

    // ========== Get Channels Tests ==========

    @Test
    fun `getChannels should return channels on successful API response`() = runTest {
        // Given: Successful API response
        val apiChannels = listOf(
            com.hdhomey.app.api.models.Channel(
                id = 1,
                fkTuner = testTunerId,
                guideNumber = "2.1",
                guideName = "CBS",
                videoCodec = "H264",
                audioCodec = "AAC",
                hd = 1,
                url = "http://test/channel1",
                isActive = true,
                createdAt = System.currentTimeMillis() / 1000,
                modifiedAt = System.currentTimeMillis() / 1000
            ),
            com.hdhomey.app.api.models.Channel(
                id = 2,
                fkTuner = testTunerId,
                guideNumber = "4.1",
                guideName = "NBC",
                videoCodec = "H264",
                audioCodec = "AAC",
                hd = 1,
                url = "http://test/channel2",
                isActive = true,
                createdAt = System.currentTimeMillis() / 1000,
                modifiedAt = System.currentTimeMillis() / 1000
            )
        )
        val response = ChannelListResponse(data = apiChannels)
        coEvery { apiService.getChannels(testTunerId) } returns Response.success(response)

        // When: Get channels
        val result = repository.getChannels(testTunerId)

        // Then: Result is success with channels
        assertTrue(result.isSuccess)
        val channels = result.getOrNull()
        assertNotNull(channels)
        assertEquals(2, channels?.size)
        assertEquals("2.1", channels?.get(0)?.number)
        assertEquals("CBS", channels?.get(0)?.name)
        assertTrue(channels?.get(0)?.isHd == true)
    }

    @Test
    fun `getChannels should return empty list when API returns empty data`() = runTest {
        // Given: Empty API response
        val response = ChannelListResponse(data = emptyList())
        coEvery { apiService.getChannels(testTunerId) } returns Response.success(response)

        // When: Get channels
        val result = repository.getChannels(testTunerId)

        // Then: Result is success with empty list
        assertTrue(result.isSuccess)
        val channels = result.getOrNull()
        assertNotNull(channels)
        assertEquals(0, channels?.size)
    }

    @Test
    fun `getChannels should return failure on 404 error`() = runTest {
        // Given: 404 Not Found response
        val errorResponse = Response.error<ChannelListResponse>(
            404,
            """{"error": "Tuner not found"}""".toResponseBody()
        )
        coEvery { apiService.getChannels(testTunerId) } returns errorResponse

        // When: Get channels
        val result = repository.getChannels(testTunerId)

        // Then: Result is failure with HttpException
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is HttpException)
        val exception = result.exceptionOrNull() as HttpException
        assertEquals(404, exception.code())
    }

    @Test
    fun `getChannels should return failure on 401 error`() = runTest {
        // Given: 401 Unauthorized response
        val errorResponse = Response.error<ChannelListResponse>(
            401,
            """{"error": "Unauthorized"}""".toResponseBody()
        )
        coEvery { apiService.getChannels(testTunerId) } returns errorResponse

        // When: Get channels
        val result = repository.getChannels(testTunerId)

        // Then: Result is failure with HttpException
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is HttpException)
        val exception = result.exceptionOrNull() as HttpException
        assertEquals(401, exception.code())
    }

    @Test
    fun `getChannels should return failure on network error`() = runTest {
        // Given: Network exception
        coEvery { apiService.getChannels(testTunerId) } throws IOException("Network timeout")

        // When: Get channels
        val result = repository.getChannels(testTunerId)

        // Then: Result is failure with IOException
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is IOException)
        assertEquals("Network timeout", result.exceptionOrNull()?.message)
    }

    @Test
    fun `getChannels should return failure on 500 server error`() = runTest {
        // Given: 500 Internal Server Error
        val errorResponse = Response.error<ChannelListResponse>(
            500,
            """{"error": "Internal server error"}""".toResponseBody()
        )
        coEvery { apiService.getChannels(testTunerId) } returns errorResponse

        // When: Get channels
        val result = repository.getChannels(testTunerId)

        // Then: Result is failure with HttpException
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is HttpException)
        val exception = result.exceptionOrNull() as HttpException
        assertEquals(500, exception.code())
    }

    // ========== Generate Stream Token Tests ==========

    @Test
    fun `generateStreamToken should return token on successful API response`() = runTest {
        // Given: Successful token generation
        val tokenResponse = StreamTokenResponse(
            token = "abc123xyz",
            expiresAt = System.currentTimeMillis() / 1000 + 900, // 15 minutes (in seconds)
            tunerId = testTunerId,
            channelId = testChannelId
        )
        coEvery { 
            apiService.generateStreamToken(StreamTokenRequest(testTunerId, testChannelId)) 
        } returns Response.success(tokenResponse)

        // When: Generate stream token
        val result = repository.generateStreamToken(testTunerId, testChannelId)

        // Then: Result is success with token
        assertTrue(result.isSuccess)
        val token = result.getOrNull()
        assertNotNull(token)
        assertEquals("abc123xyz", token?.token)
        assertTrue(token?.expiresAt!! > System.currentTimeMillis() / 1000)
    }

    @Test
    fun `generateStreamToken should return failure on 404 error`() = runTest {
        // Given: 404 Not Found (channel doesn't exist)
        val errorResponse = Response.error<StreamTokenResponse>(
            404,
            """{"error": "Channel not found"}""".toResponseBody()
        )
        coEvery { 
            apiService.generateStreamToken(StreamTokenRequest(testTunerId, testChannelId)) 
        } returns errorResponse

        // When: Generate stream token
        val result = repository.generateStreamToken(testTunerId, testChannelId)

        // Then: Result is failure with HttpException
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is HttpException)
        val exception = result.exceptionOrNull() as HttpException
        assertEquals(404, exception.code())
    }

    @Test
    fun `generateStreamToken should return failure on 401 error`() = runTest {
        // Given: 401 Unauthorized
        val errorResponse = Response.error<StreamTokenResponse>(
            401,
            """{"error": "Authentication required"}""".toResponseBody()
        )
        coEvery { 
            apiService.generateStreamToken(StreamTokenRequest(testTunerId, testChannelId)) 
        } returns errorResponse

        // When: Generate stream token
        val result = repository.generateStreamToken(testTunerId, testChannelId)

        // Then: Result is failure with HttpException
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is HttpException)
        val exception = result.exceptionOrNull() as HttpException
        assertEquals(401, exception.code())
    }

    @Test
    fun `generateStreamToken should return failure on network error`() = runTest {
        // Given: Network exception
        coEvery { 
            apiService.generateStreamToken(any()) 
        } throws IOException("Connection refused")

        // When: Generate stream token
        val result = repository.generateStreamToken(testTunerId, testChannelId)

        // Then: Result is failure with IOException
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is IOException)
        assertEquals("Connection refused", result.exceptionOrNull()?.message)
    }

    @Test
    fun `generateStreamToken should return failure on 400 bad request`() = runTest {
        // Given: 400 Bad Request (invalid parameters)
        val errorResponse = Response.error<StreamTokenResponse>(
            400,
            """{"error": "Invalid tuner or channel ID"}""".toResponseBody()
        )
        coEvery { 
            apiService.generateStreamToken(StreamTokenRequest(testTunerId, testChannelId)) 
        } returns errorResponse

        // When: Generate stream token
        val result = repository.generateStreamToken(testTunerId, testChannelId)

        // Then: Result is failure with HttpException
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is HttpException)
        val exception = result.exceptionOrNull() as HttpException
        assertEquals(400, exception.code())
    }

    @Test
    fun `generateStreamToken should map response to domain model correctly`() = runTest {
        // Given: API response with specific values
        val expiryTime = System.currentTimeMillis() / 1000 + 900 // 15 minutes (in seconds)
        val tokenResponse = StreamTokenResponse(
            token = "test-token-12345",
            expiresAt = expiryTime,
            tunerId = testTunerId,
            channelId = testChannelId
        )
        coEvery { 
            apiService.generateStreamToken(StreamTokenRequest(testTunerId, testChannelId)) 
        } returns Response.success(tokenResponse)

        // When: Generate stream token
        val result = repository.generateStreamToken(testTunerId, testChannelId)

        // Then: Domain model matches API response
        assertTrue(result.isSuccess)
        val token = result.getOrNull()
        assertEquals("test-token-12345", token?.token)
        assertEquals(expiryTime, token?.expiresAt)
    }

    // ========== Edge Cases ==========

    @Test
    fun `getChannels should handle null response body`() = runTest {
        // Given: Response with null body (should not happen, but defensive)
        coEvery { apiService.getChannels(testTunerId) } returns Response.success(null)

        // When: Get channels
        val result = repository.getChannels(testTunerId)

        // Then: Result is failure
        assertTrue(result.isFailure)
    }

    @Test
    fun `generateStreamToken should handle null response body`() = runTest {
        // Given: Response with null body
        coEvery { 
            apiService.generateStreamToken(any()) 
        } returns Response.success(null)

        // When: Generate stream token
        val result = repository.generateStreamToken(testTunerId, testChannelId)

        // Then: Result is failure
        assertTrue(result.isFailure)
    }

    @Test
    fun `getChannels should handle large channel lists`() = runTest {
        // Given: Large channel list (100 channels)
        val apiChannels = (1..100).map { i ->
            com.hdhomey.app.api.models.Channel(
                id = i,
                fkTuner = testTunerId,
                guideNumber = "$i.1",
                guideName = "Channel $i",
                videoCodec = "H264",
                audioCodec = "AAC",
                hd = if (i % 2 == 0) 1 else 0,
                url = "http://test/channel$i",
                isActive = true,
                createdAt = System.currentTimeMillis() / 1000,
                modifiedAt = System.currentTimeMillis() / 1000
            )
        }
        val response = ChannelListResponse(data = apiChannels)
        coEvery { apiService.getChannels(testTunerId) } returns Response.success(response)

        // When: Get channels
        val result = repository.getChannels(testTunerId)

        // Then: All channels returned
        assertTrue(result.isSuccess)
        val channels = result.getOrNull()
        assertEquals(100, channels?.size)
    }
}
