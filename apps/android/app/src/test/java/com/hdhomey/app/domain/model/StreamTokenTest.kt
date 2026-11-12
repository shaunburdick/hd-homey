package com.hdhomey.app.domain.model

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test
import java.time.Instant

/**
 * Unit tests for [StreamToken] domain entity.
 *
 * Covers [StreamToken.isValid] (with 60-second buffer) and [StreamToken.secondsUntilExpiry].
 */
class StreamTokenTest {

    // ========== isValid ==========

    @Test
    fun `isValid returns true when token expires well in the future`() {
        val token = token(expiresAt = Instant.now().plusSeconds(300))
        assertTrue(token.isValid)
    }

    @Test
    fun `isValid returns true when token expires just beyond the 60-second buffer`() {
        // 61 seconds from now — still inside valid window
        val token = token(expiresAt = Instant.now().plusSeconds(61))
        assertTrue(token.isValid)
    }

    @Test
    fun `isValid returns false when token expires within 60-second buffer`() {
        // 59 seconds from now — within the buffer, should be treated as expired
        val token = token(expiresAt = Instant.now().plusSeconds(59))
        assertFalse(token.isValid)
    }

    @Test
    fun `isValid returns false when token has already expired`() {
        val token = token(expiresAt = Instant.now().minusSeconds(10))
        assertFalse(token.isValid)
    }

    // ========== secondsUntilExpiry ==========

    @Test
    fun `secondsUntilExpiry is positive for future token`() {
        val token = token(expiresAt = Instant.now().plusSeconds(120))
        assertTrue(token.secondsUntilExpiry > 0)
    }

    @Test
    fun `secondsUntilExpiry is negative for expired token`() {
        val token = token(expiresAt = Instant.now().minusSeconds(30))
        assertTrue(token.secondsUntilExpiry < 0)
    }

    @Test
    fun `secondsUntilExpiry is approximately correct`() {
        val futureSeconds = 500L
        val token = token(expiresAt = Instant.now().plusSeconds(futureSeconds))
        // Allow ±2 seconds for test execution time
        assertTrue(token.secondsUntilExpiry in (futureSeconds - 2)..(futureSeconds + 2))
    }

    // ─── helpers ───────────────────────────────────────────────────────────────

    private fun token(
        tokenStr: String = "test-token",
        expiresAt: Instant = Instant.now().plusSeconds(900),
        tunerId: Int = 1,
        channelId: Int = 42
    ) = StreamToken(
        token = tokenStr,
        expiresAt = expiresAt,
        tunerId = tunerId,
        channelId = channelId
    )
}
