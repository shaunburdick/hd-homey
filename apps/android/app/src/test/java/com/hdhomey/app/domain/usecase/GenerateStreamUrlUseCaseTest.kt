package com.hdhomey.app.domain.usecase

import com.hdhomey.app.api.HdHomeyApiService
import com.hdhomey.app.api.models.StreamTokenRequest
import com.hdhomey.app.api.models.StreamTokenResponse
import com.hdhomey.app.domain.model.StreamToken
import io.mockk.coEvery
import io.mockk.coVerify
import io.mockk.mockk
import kotlinx.coroutines.test.runTest
import org.junit.Assert.assertEquals
import org.junit.Test
import java.io.IOException
import java.time.Instant

/**
 * Unit tests for [GenerateStreamUrlUseCase].
 *
 * Covers:
 * - [GenerateStreamUrlUseCase.invoke]: token retrieval and domain mapping via the API service.
 * - [GenerateStreamUrlUseCase.buildStreamUrl]: HLS URL construction and trailing-slash handling.
 * - [GenerateStreamUrlUseCase.generateStreamUrl]: end-to-end chain of invoke + buildStreamUrl.
 *
 * Uses MockK for suspend-function mocking and [runTest] from
 * [kotlinx.coroutines.test] to drive coroutine execution deterministically.
 */
class GenerateStreamUrlUseCaseTest {

    private val apiService: HdHomeyApiService = mockk()

    /** System under test — constructed directly (no DI framework needed in unit tests). */
    private val useCase = GenerateStreamUrlUseCase(apiService)

    // ─── Test fixtures ─────────────────────────────────────────────────────────

    /**
     * A fixed far-future expiry epoch so [StreamToken.isValid] stays true for the
     * lifetime of any test run.
     */
    private val futureEpochSeconds = 1_800_000_000L // ~2027-01-15

    /**
     * Canonical domain-layer token used as the expected output of [invoke] and as
     * direct input to [buildStreamUrl] tests.
     */
    private val testToken = StreamToken(
        token = "abc123",
        expiresAt = Instant.ofEpochSecond(futureEpochSeconds),
        tunerId = 1,
        channelId = 42
    )

    /**
     * DTO that the mapper converts to [testToken].
     *
     * [expiresAt] is deliberately set to [futureEpochSeconds] — the mapper calls
     * [Instant.ofEpochSecond], so the values line up exactly.
     */
    private val testResponse = StreamTokenResponse(
        token = "abc123",
        expiresAt = futureEpochSeconds,
        tunerId = 1,
        channelId = 42
    )

    // ========== invoke ==========

    @Test
    fun `invoke returns StreamToken mapped from API response`() = runTest {
        coEvery { apiService.getStreamToken(any()) } returns testResponse

        val result = useCase(tunerId = 1, channelId = 42)

        assertEquals(testToken.token, result.token)
        assertEquals(testToken.expiresAt, result.expiresAt)
        assertEquals(testToken.tunerId, result.tunerId)
        assertEquals(testToken.channelId, result.channelId)
    }

    @Test
    fun `invoke passes correct tunerId and channelId to apiService`() = runTest {
        coEvery { apiService.getStreamToken(any()) } returns testResponse

        useCase(tunerId = 1, channelId = 42)

        coVerify(exactly = 1) {
            apiService.getStreamToken(StreamTokenRequest(tunerId = 1, channelId = 42))
        }
    }

    @Test(expected = IOException::class)
    fun `invoke propagates exception thrown by apiService`() = runTest {
        coEvery { apiService.getStreamToken(any()) } throws IOException("Network unreachable")

        useCase(tunerId = 1, channelId = 42)
    }

    // ========== buildStreamUrl ==========

    @Test
    fun `buildStreamUrl constructs correct HLS URL`() {
        val url = useCase.buildStreamUrl(
            serverUrl = "http://192.168.1.100:3000",
            tunerId = 1,
            channelId = 42,
            streamToken = testToken
        )

        assertEquals(
            "http://192.168.1.100:3000/api/transcode/1/42/playlist.m3u8?token=abc123",
            url
        )
    }

    @Test
    fun `buildStreamUrl trims trailing slash from serverUrl`() {
        val url = useCase.buildStreamUrl(
            serverUrl = "http://192.168.1.100:3000/",
            tunerId = 1,
            channelId = 42,
            streamToken = testToken
        )

        assertEquals(
            "http://192.168.1.100:3000/api/transcode/1/42/playlist.m3u8?token=abc123",
            url
        )
    }

    @Test
    fun `buildStreamUrl embeds tunerId and channelId in correct path positions`() {
        val token = testToken.copy(tunerId = 7, channelId = 99)

        val url = useCase.buildStreamUrl(
            serverUrl = "http://server:3000",
            tunerId = 7,
            channelId = 99,
            streamToken = token
        )

        assertEquals(
            "http://server:3000/api/transcode/7/99/playlist.m3u8?token=abc123",
            url
        )
    }

    // ========== generateStreamUrl ==========

    @Test
    fun `generateStreamUrl returns correctly formed URL`() = runTest {
        coEvery { apiService.getStreamToken(any()) } returns testResponse

        val url = useCase.generateStreamUrl(
            serverUrl = "http://192.168.1.100:3000",
            tunerId = 1,
            channelId = 42
        )

        assertEquals(
            "http://192.168.1.100:3000/api/transcode/1/42/playlist.m3u8?token=abc123",
            url
        )
    }

    @Test
    fun `generateStreamUrl calls apiService exactly once`() = runTest {
        coEvery { apiService.getStreamToken(any()) } returns testResponse

        useCase.generateStreamUrl(
            serverUrl = "http://192.168.1.100:3000",
            tunerId = 1,
            channelId = 42
        )

        coVerify(exactly = 1) { apiService.getStreamToken(any()) }
    }

    @Test(expected = IOException::class)
    fun `generateStreamUrl propagates exception from invoke`() = runTest {
        coEvery { apiService.getStreamToken(any()) } throws IOException("Timeout")

        useCase.generateStreamUrl(
            serverUrl = "http://192.168.1.100:3000",
            tunerId = 1,
            channelId = 42
        )
    }
}
