package com.hdhomey.app.domain.model

import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for [Channel] domain entity.
 *
 * Covers computed properties [Channel.displayName] and [Channel.sortKey].
 */
class ChannelTest {

    // ========== displayName ==========

    @Test
    fun `displayName combines number and name with a space`() {
        val channel = channel(number = "2.1", name = "CBS")
        assertEquals("2.1 CBS", channel.displayName)
    }

    @Test
    fun `displayName handles single-digit channel number`() {
        val channel = channel(number = "5", name = "NBC")
        assertEquals("5 NBC", channel.displayName)
    }

    @Test
    fun `displayName handles empty name gracefully`() {
        val channel = channel(number = "7.1", name = "")
        assertEquals("7.1 ", channel.displayName)
    }

    // ========== sortKey ==========

    @Test
    fun `sortKey parses simple integer channel number`() {
        val channel = channel(number = "5")
        assertEquals(5.0, channel.sortKey, 0.0001)
    }

    @Test
    fun `sortKey parses decimal channel number`() {
        val channel = channel(number = "2.1")
        assertEquals(2.1, channel.sortKey, 0.0001)
    }

    @Test
    fun `sortKey returns 999 dot 0 for malformed channel number`() {
        val channel = channel(number = "abc")
        assertEquals(999.0, channel.sortKey, 0.0001)
    }

    @Test
    fun `sortKey returns 999 dot 0 for empty channel number`() {
        val channel = channel(number = "")
        assertEquals(999.0, channel.sortKey, 0.0001)
    }

    @Test
    fun `channels with valid numbers sort before channels with malformed numbers`() {
        val valid = channel(number = "3.1")
        val malformed = channel(number = "N/A")

        assertTrue(valid.sortKey < malformed.sortKey)
    }

    // ========== isHd ==========

    @Test
    fun `isHd reflects value provided at construction`() {
        assertTrue(channel(isHd = true).isHd)
        assertFalse(channel(isHd = false).isHd)
    }

    // ─── helpers ───────────────────────────────────────────────────────────────

    private fun channel(
        id: Int = 1,
        tunerId: Int = 10,
        number: String = "2.1",
        name: String = "CBS",
        isHd: Boolean = true
    ) = Channel(id = id, tunerId = tunerId, number = number, name = name, isHd = isHd)
}
