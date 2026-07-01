package com.hdhomey.app.data.mapper

import com.hdhomey.app.api.models.StreamTokenResponse
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

/**
 * Unit tests for [StreamTokenMapper] extension function.
 *
 * Covers correct conversion of [StreamTokenResponse] to [com.hdhomey.app.domain.model.StreamToken],
 * with particular attention to the epoch-seconds ↔ [Instant] conversion.
 */
class StreamTokenMapperTest {

    // ========== toDomain ==========

    @Test
    fun `toDomain maps token string correctly`() {
        val response = response(token = "abc123")
        assertEquals("abc123", response.toDomain().token)
    }

    @Test
    fun `toDomain maps tunerId correctly`() {
        val response = response(tunerId = 7)
        assertEquals(7, response.toDomain().tunerId)
    }

    @Test
    fun `toDomain maps channelId correctly`() {
        val response = response(channelId = 42)
        assertEquals(42, response.toDomain().channelId)
    }

    @Test
    fun `toDomain converts epoch seconds to correct Instant`() {
        val epochSeconds = 1_734_204_800L // a fixed point in 2024
        val response = response(expiresAt = epochSeconds)
        val domain = response.toDomain()

        assertEquals(epochSeconds, domain.expiresAt.epochSecond)
    }

    @Test
    fun `toDomain produces a valid token for a future expiry`() {
        val futureEpoch = Instant.now().plusSeconds(900).epochSecond
        val domain = response(expiresAt = futureEpoch).toDomain()

        assertTrue(domain.isValid)
    }

    @Test
    fun `toDomain produces an invalid token for a past expiry`() {
        val pastEpoch = Instant.now().minusSeconds(10).epochSecond
        val domain = response(expiresAt = pastEpoch).toDomain()

        assertFalse(domain.isValid)
    }

    // ─── helpers ───────────────────────────────────────────────────────────────

    private fun response(
        token: String = "test-hmac-token",
        expiresAt: Long = Instant.now().plusSeconds(900).epochSecond,
        tunerId: Int = 1,
        channelId: Int = 10
    ) = StreamTokenResponse(
        token = token,
        expiresAt = expiresAt,
        tunerId = tunerId,
        channelId = channelId
    )
}
