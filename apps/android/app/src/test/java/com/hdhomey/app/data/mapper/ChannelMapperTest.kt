package com.hdhomey.app.data.mapper

import com.hdhomey.app.api.models.ChannelDto
import com.hdhomey.app.api.models.ChannelPreferenceDto
import com.hdhomey.app.domain.model.Channel
import com.hdhomey.app.domain.model.ChannelPreferences
import org.junit.Assert.assertEquals
import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

/**
 * Unit tests for [ChannelMapper] extension functions.
 *
 * Covers [ChannelDto.toDomain], [List.toDomainChannels],
 * [List.toDomainPreferences], and [Channel.withMetadata].
 */
class ChannelMapperTest {

    // ========== ChannelDto.toDomain ==========

    @Test
    fun `toDomain maps all scalar fields correctly`() {
        val dto = channelDto(id = 7, fkTuner = 3, guideNumber = "4.2", guideName = "NBC")
        val domain = dto.toDomain()

        assertEquals(7, domain.id)
        assertEquals(3, domain.tunerId)
        assertEquals("4.2", domain.number)
        assertEquals("NBC", domain.name)
    }

    @Test
    fun `toDomain maps hd equals 1 to isHd true`() {
        val domain = channelDto(hd = 1).toDomain()
        assertTrue(domain.isHd)
    }

    @Test
    fun `toDomain maps hd equals 0 to isHd false`() {
        val domain = channelDto(hd = 0).toDomain()
        assertFalse(domain.isHd)
    }

    @Test
    fun `toDomain maps hd other value to isHd false`() {
        // Defensive: any value other than 1 should produce false
        val domain = channelDto(hd = 2).toDomain()
        assertFalse(domain.isHd)
    }

    // ========== List<ChannelDto>.toDomainChannels ==========

    @Test
    fun `toDomainChannels returns empty list for empty input`() {
        val result = emptyList<ChannelDto>().toDomainChannels()
        assertTrue(result.isEmpty())
    }

    @Test
    fun `toDomainChannels maps all elements`() {
        val dtos = listOf(channelDto(id = 1), channelDto(id = 2), channelDto(id = 3))
        val domains = dtos.toDomainChannels()

        assertEquals(3, domains.size)
        assertEquals(1, domains[0].id)
        assertEquals(2, domains[1].id)
        assertEquals(3, domains[2].id)
    }

    // ========== List<ChannelPreferenceDto>.toDomainPreferences ==========

    @Test
    fun `toDomainPreferences returns EMPTY preferences for empty list`() {
        val prefs = emptyList<ChannelPreferenceDto>().toDomainPreferences()
        assertEquals(ChannelPreferences.EMPTY, prefs)
    }

    @Test
    fun `toDomainPreferences collects favorite channel IDs`() {
        val dtos = listOf(
            preferenceDto(channelId = 10, isFavorite = true, isHidden = false),
            preferenceDto(channelId = 20, isFavorite = true, isHidden = false),
            preferenceDto(channelId = 30, isFavorite = false, isHidden = false)
        )
        val prefs = dtos.toDomainPreferences()

        assertTrue(prefs.isFavorite(10))
        assertTrue(prefs.isFavorite(20))
        assertFalse(prefs.isFavorite(30))
    }

    @Test
    fun `toDomainPreferences collects hidden channel IDs`() {
        val dtos = listOf(
            preferenceDto(channelId = 5, isFavorite = false, isHidden = true),
            preferenceDto(channelId = 6, isFavorite = false, isHidden = false)
        )
        val prefs = dtos.toDomainPreferences()

        assertTrue(prefs.isHidden(5))
        assertFalse(prefs.isHidden(6))
    }

    @Test
    fun `toDomainPreferences handles channel in both favorite and hidden`() {
        val dtos = listOf(
            preferenceDto(channelId = 99, isFavorite = true, isHidden = true)
        )
        val prefs = dtos.toDomainPreferences()

        assertTrue(prefs.isFavorite(99))
        assertTrue(prefs.isHidden(99))
    }

    // ========== Channel.withMetadata ==========

    @Test
    fun `withMetadata sets isFavorite true when channel is in favorites`() {
        val channel = domain(id = 1)
        val prefs = ChannelPreferences(favorites = setOf(1))

        val result = channel.withMetadata(prefs)

        assertTrue(result.isFavorite)
    }

    @Test
    fun `withMetadata sets isFavorite false when channel is not in favorites`() {
        val channel = domain(id = 2)
        val prefs = ChannelPreferences(favorites = setOf(1))

        val result = channel.withMetadata(prefs)

        assertFalse(result.isFavorite)
    }

    @Test
    fun `withMetadata sets isHidden true when channel is in hidden`() {
        val channel = domain(id = 5)
        val prefs = ChannelPreferences(hidden = setOf(5))

        val result = channel.withMetadata(prefs)

        assertTrue(result.isHidden)
    }

    @Test
    fun `withMetadata sets isHidden false when channel is not hidden`() {
        val channel = domain(id = 5)
        val prefs = ChannelPreferences(hidden = setOf(99))

        val result = channel.withMetadata(prefs)

        assertFalse(result.isHidden)
    }

    @Test
    fun `withMetadata preserves original channel reference`() {
        val channel = domain(id = 7)
        val result = channel.withMetadata(ChannelPreferences.EMPTY)

        assertEquals(channel, result.channel)
    }

    // ─── helpers ───────────────────────────────────────────────────────────────

    private fun channelDto(
        id: Int = 1,
        fkTuner: Int = 10,
        guideNumber: String = "2.1",
        guideName: String = "CBS",
        hd: Int = 1
    ) = ChannelDto(
        id = id,
        fkTuner = fkTuner,
        guideNumber = guideNumber,
        guideName = guideName,
        videoCodec = "H264",
        audioCodec = "AC3",
        hd = hd,
        url = "http://device/auto/v2.1",
        isActive = true,
        createdAt = "2024-01-01T00:00:00Z",
        modifiedAt = "2024-01-01T00:00:00Z"
    )

    private fun preferenceDto(
        channelId: Int,
        isFavorite: Boolean,
        isHidden: Boolean
    ) = ChannelPreferenceDto(
        channelId = channelId,
        tunerId = 1,
        guideNumber = "2.1",
        guideName = "CBS",
        isFavorite = isFavorite,
        isHidden = isHidden,
        updatedAt = "2024-01-01T00:00:00Z"
    )

    private fun domain(id: Int = 1) = Channel(
        id = id,
        tunerId = 10,
        number = "2.1",
        name = "CBS",
        isHd = true
    )
}
