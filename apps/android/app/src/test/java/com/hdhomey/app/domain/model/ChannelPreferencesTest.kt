package com.hdhomey.app.domain.model

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for [ChannelPreferences] domain entity.
 *
 * Covers [ChannelPreferences.isFavorite], [ChannelPreferences.isHidden], and
 * the [ChannelPreferences.EMPTY] singleton.
 */
class ChannelPreferencesTest {

    // ========== EMPTY ==========

    @Test
    fun `EMPTY has no favorites`() {
        assertFalse(ChannelPreferences.EMPTY.isFavorite(1))
    }

    @Test
    fun `EMPTY has no hidden channels`() {
        assertFalse(ChannelPreferences.EMPTY.isHidden(1))
    }

    // ========== isFavorite ==========

    @Test
    fun `isFavorite returns true when channel is in favorites set`() {
        val prefs = ChannelPreferences(favorites = setOf(10, 20, 30))
        assertTrue(prefs.isFavorite(20))
    }

    @Test
    fun `isFavorite returns false when channel is not in favorites set`() {
        val prefs = ChannelPreferences(favorites = setOf(10, 20))
        assertFalse(prefs.isFavorite(99))
    }

    @Test
    fun `isFavorite returns false when favorites set is empty`() {
        val prefs = ChannelPreferences()
        assertFalse(prefs.isFavorite(5))
    }

    // ========== isHidden ==========

    @Test
    fun `isHidden returns true when channel is in hidden set`() {
        val prefs = ChannelPreferences(hidden = setOf(5, 15))
        assertTrue(prefs.isHidden(15))
    }

    @Test
    fun `isHidden returns false when channel is not in hidden set`() {
        val prefs = ChannelPreferences(hidden = setOf(5, 15))
        assertFalse(prefs.isHidden(99))
    }

    @Test
    fun `isHidden returns false when hidden set is empty`() {
        val prefs = ChannelPreferences()
        assertFalse(prefs.isHidden(5))
    }

    // ========== Both sets populated ==========

    @Test
    fun `a channel can be in both favorites and hidden sets independently`() {
        // Edge case: misbehaving client sets both flags. Both queries are consistent.
        val prefs = ChannelPreferences(favorites = setOf(7), hidden = setOf(7))
        assertTrue(prefs.isFavorite(7))
        assertTrue(prefs.isHidden(7))
    }

    @Test
    fun `favorites and hidden can contain different channel IDs`() {
        val prefs = ChannelPreferences(favorites = setOf(1, 2), hidden = setOf(3, 4))
        assertTrue(prefs.isFavorite(1))
        assertFalse(prefs.isHidden(1))
        assertFalse(prefs.isFavorite(3))
        assertTrue(prefs.isHidden(3))
    }
}
