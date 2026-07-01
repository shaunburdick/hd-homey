package com.hdhomey.app.domain.model

import org.junit.Assert.assertFalse
import org.junit.Assert.assertSame
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for [ChannelWithMetadata] domain entity.
 *
 * Covers [ChannelWithMetadata.shouldDisplay] and the propagation of preference flags.
 */
class ChannelWithMetadataTest {

    // ========== shouldDisplay ==========

    @Test
    fun `shouldDisplay is true when isHidden is false`() {
        val item = ChannelWithMetadata(channel = channel(), isHidden = false)
        assertTrue(item.shouldDisplay)
    }

    @Test
    fun `shouldDisplay is false when isHidden is true`() {
        val item = ChannelWithMetadata(channel = channel(), isHidden = true)
        assertFalse(item.shouldDisplay)
    }

    @Test
    fun `shouldDisplay defaults to true when no arguments provided`() {
        val item = ChannelWithMetadata(channel = channel())
        assertTrue(item.shouldDisplay)
    }

    // ========== defaults ==========

    @Test
    fun `isFavorite defaults to false`() {
        val item = ChannelWithMetadata(channel = channel())
        assertFalse(item.isFavorite)
    }

    @Test
    fun `isHidden defaults to false`() {
        val item = ChannelWithMetadata(channel = channel())
        assertFalse(item.isHidden)
    }

    // ========== channel reference ==========

    @Test
    fun `channel property holds the exact Channel instance provided`() {
        val c = channel()
        val item = ChannelWithMetadata(channel = c)
        assertSame(c, item.channel)
    }

    // ─── helpers ───────────────────────────────────────────────────────────────

    private fun channel() = Channel(
        id = 1,
        tunerId = 10,
        number = "2.1",
        name = "CBS",
        isHd = true
    )
}
