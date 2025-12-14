package com.hdhomey.app.domain.usecase

import com.hdhomey.app.data.repository.ChannelRepository
import com.hdhomey.app.domain.model.StreamToken
import io.mockk.coEvery
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Before
import org.junit.Test
import org.junit.Assert.*
import retrofit2.HttpException
import java.io.IOException

/**
 * Unit tests for GenerateStreamUrlUseCase.
 *
 * Tests stream token generation, URL construction, and error handling.
 */
class GenerateStreamUrlUseCaseTest {

    private lateinit var useCase: GenerateStreamUrlUseCase
    private lateinit var channelRepository: ChannelRepository

    private val testServerUrl = "https://server.local"
    private val testTunerId = 1
    private val testChannelId = 5

    @Before
    fun setup() {
        channelRepository = mockk()
        useCase = GenerateStreamUrlUseCase(channelRepository)
    }

    // ========== Success Cases ==========

    @Test
    fun `invoke should return valid HLS URL with token on success`() = runTest {
        // Given: Valid stream token
        val token = createValidToken(tokenString = "abc123xyz")
        coEvery { 
            channelRepository.generateStreamToken(testTunerId, testChannelId) 
        } returns Result.success(token)

        // When: Generate stream URL
        val result = useCase(testServerUrl, testTunerId, testChannelId)

        // Then: URL is constructed correctly
        assertTrue(result.isSuccess)
        val url = result.getOrNull()!!
        assertEquals(
            "https://server.local/api/transcode/1/5/playlist.m3u8?token=abc123xyz",
            url
        )
    }

    @Test
    fun `invoke should remove trailing slash from server URL`() = runTest {
        // Given: Server URL with trailing slash
        val token = createValidToken()
        coEvery { 
            channelRepository.generateStreamToken(testTunerId, testChannelId) 
        } returns Result.success(token)

        // When: Generate stream URL with trailing slash
        val result = useCase("https://server.local/", testTunerId, testChannelId)

        // Then: Trailing slash is removed
        assertTrue(result.isSuccess)
        val url = result.getOrNull()!!
        assertEquals(
            "https://server.local/api/transcode/1/5/playlist.m3u8?token=test-token",
            url
        )
    }

    @Test
    fun `invoke should handle HTTP (non-HTTPS) server URL`() = runTest {
        // Given: HTTP server URL
        val token = createValidToken()
        coEvery { 
            channelRepository.generateStreamToken(testTunerId, testChannelId) 
        } returns Result.success(token)

        // When: Generate stream URL with HTTP
        val result = useCase("http://localhost:3000", testTunerId, testChannelId)

        // Then: HTTP URL is preserved
        assertTrue(result.isSuccess)
        val url = result.getOrNull()!!
        assertTrue(url.startsWith("http://localhost:3000/api/transcode/"))
    }

    @Test
    fun `invoke should handle server URL with port`() = runTest {
        // Given: Server URL with port
        val token = createValidToken()
        coEvery { 
            channelRepository.generateStreamToken(testTunerId, testChannelId) 
        } returns Result.success(token)

        // When: Generate stream URL
        val result = useCase("https://server.local:8443", testTunerId, testChannelId)

        // Then: Port is preserved
        assertTrue(result.isSuccess)
        val url = result.getOrNull()!!
        assertTrue(url.startsWith("https://server.local:8443/api/transcode/"))
    }

    @Test
    fun `invoke should handle different tuner and channel IDs`() = runTest {
        // Given: Different IDs
        val token = createValidToken()
        coEvery { 
            channelRepository.generateStreamToken(99, 88) 
        } returns Result.success(token)

        // When: Generate stream URL with different IDs
        val result = useCase(testServerUrl, 99, 88)

        // Then: URL contains correct IDs
        assertTrue(result.isSuccess)
        val url = result.getOrNull()!!
        assertTrue(url.contains("/api/transcode/99/88/"))
    }

    @Test
    fun `invoke should URL-encode token if needed`() = runTest {
        // Given: Token with special characters (Base64url safe, but test anyway)
        val token = createValidToken(tokenString = "abc+123/xyz=")
        coEvery { 
            channelRepository.generateStreamToken(testTunerId, testChannelId) 
        } returns Result.success(token)

        // When: Generate stream URL
        val result = useCase(testServerUrl, testTunerId, testChannelId)

        // Then: Token is included as-is (URL encoding happens at HTTP client level)
        assertTrue(result.isSuccess)
        val url = result.getOrNull()!!
        assertTrue(url.endsWith("?token=abc+123/xyz="))
    }

    // ========== Error Cases ==========

    @Test
    fun `invoke should return failure when token generation fails`() = runTest {
        // Given: Token generation fails
        val networkError = IOException("Connection timeout")
        coEvery { 
            channelRepository.generateStreamToken(testTunerId, testChannelId) 
        } returns Result.failure(networkError)

        // When: Generate stream URL
        val result = useCase(testServerUrl, testTunerId, testChannelId)

        // Then: Result is failure with IOException
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is IOException)
        assertEquals("Connection timeout", result.exceptionOrNull()?.message)
    }

    @Test
    fun `invoke should return failure when token is already expired`() = runTest {
        // Given: Expired token (expiresAt in the past)
        val expiredToken = StreamToken(
            token = "expired-token",
            expiresAt = (System.currentTimeMillis() / 1000) - 120, // 2 minutes ago
            tunerId = testTunerId,
            channelId = testChannelId
        )
        coEvery { 
            channelRepository.generateStreamToken(testTunerId, testChannelId) 
        } returns Result.success(expiredToken)

        // When: Generate stream URL
        val result = useCase(testServerUrl, testTunerId, testChannelId)

        // Then: Result is failure with IllegalStateException
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is IllegalStateException)
        assertEquals("Generated token is already expired", result.exceptionOrNull()?.message)
    }

    @Test
    fun `invoke should propagate 401 authentication error`() = runTest {
        // Given: 401 Unauthorized error
        val authError = mockk<HttpException>()
        coEvery { authError.code() } returns 401
        coEvery { authError.message() } returns "Unauthorized"
        coEvery { 
            channelRepository.generateStreamToken(testTunerId, testChannelId) 
        } returns Result.failure(authError)

        // When: Generate stream URL
        val result = useCase(testServerUrl, testTunerId, testChannelId)

        // Then: Result is failure with HttpException
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is HttpException)
        val exception = result.exceptionOrNull() as HttpException
        assertEquals(401, exception.code())
    }

    @Test
    fun `invoke should propagate 404 not found error`() = runTest {
        // Given: 404 Channel not found
        val notFoundError = mockk<HttpException>()
        coEvery { notFoundError.code() } returns 404
        coEvery { notFoundError.message() } returns "Channel not found"
        coEvery { 
            channelRepository.generateStreamToken(testTunerId, testChannelId) 
        } returns Result.failure(notFoundError)

        // When: Generate stream URL
        val result = useCase(testServerUrl, testTunerId, testChannelId)

        // Then: Result is failure with HttpException
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is HttpException)
        val exception = result.exceptionOrNull() as HttpException
        assertEquals(404, exception.code())
    }

    @Test
    fun `invoke should propagate network error`() = runTest {
        // Given: Network error during token generation
        val networkError = IOException("Network unreachable")
        coEvery { 
            channelRepository.generateStreamToken(testTunerId, testChannelId) 
        } returns Result.failure(networkError)

        // When: Generate stream URL
        val result = useCase(testServerUrl, testTunerId, testChannelId)

        // Then: Result is failure with IOException
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is IOException)
        assertEquals("Network unreachable", result.exceptionOrNull()?.message)
    }

    @Test
    fun `invoke should handle repository throwing unexpected exception`() = runTest {
        // Given: Repository throws unexpected exception
        val unexpectedException = RuntimeException("Unexpected error")
        coEvery { 
            channelRepository.generateStreamToken(testTunerId, testChannelId) 
        } throws unexpectedException

        // When: Generate stream URL
        val result = useCase(testServerUrl, testTunerId, testChannelId)

        // Then: Result is failure with RuntimeException
        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is RuntimeException)
        assertEquals("Unexpected error", result.exceptionOrNull()?.message)
    }

    // ========== Edge Cases ==========

    @Test
    fun `invoke should handle server URL without scheme`() = runTest {
        // Given: Server URL without scheme (technically invalid, but defensive)
        val token = createValidToken()
        coEvery { 
            channelRepository.generateStreamToken(testTunerId, testChannelId) 
        } returns Result.success(token)

        // When: Generate stream URL
        val result = useCase("server.local", testTunerId, testChannelId)

        // Then: URL is constructed (scheme will be missing)
        assertTrue(result.isSuccess)
        val url = result.getOrNull()!!
        assertEquals("server.local/api/transcode/1/5/playlist.m3u8?token=test-token", url)
    }

    @Test
    fun `invoke should handle token with long string`() = runTest {
        // Given: Very long token (Base64 encoded HMAC can be long)
        val longToken = "a".repeat(256)
        val token = createValidToken(tokenString = longToken)
        coEvery { 
            channelRepository.generateStreamToken(testTunerId, testChannelId) 
        } returns Result.success(token)

        // When: Generate stream URL
        val result = useCase(testServerUrl, testTunerId, testChannelId)

        // Then: Long token is handled correctly
        assertTrue(result.isSuccess)
        val url = result.getOrNull()!!
        assertTrue(url.endsWith("?token=$longToken"))
    }

    @Test
    fun `invoke should handle server URL with path prefix`() = runTest {
        // Given: Server URL with path prefix (e.g., reverse proxy setup)
        val token = createValidToken()
        coEvery { 
            channelRepository.generateStreamToken(testTunerId, testChannelId) 
        } returns Result.success(token)

        // When: Generate stream URL with path prefix
        val result = useCase("https://example.com/hd-homey", testTunerId, testChannelId)

        // Then: Path prefix is preserved
        assertTrue(result.isSuccess)
        val url = result.getOrNull()!!
        assertEquals(
            "https://example.com/hd-homey/api/transcode/1/5/playlist.m3u8?token=test-token",
            url
        )
    }

    // ========== Helper Functions ==========

    /**
     * Create a valid stream token for testing.
     *
     * Token is valid for 15 minutes from now.
     */
    private fun createValidToken(
        tokenString: String = "test-token",
        tunerId: Int = testTunerId,
        channelId: Int = testChannelId
    ): StreamToken {
        val expiresAt = (System.currentTimeMillis() / 1000) + 900 // 15 minutes from now
        return StreamToken(
            token = tokenString,
            expiresAt = expiresAt,
            tunerId = tunerId,
            channelId = channelId
        )
    }
}
