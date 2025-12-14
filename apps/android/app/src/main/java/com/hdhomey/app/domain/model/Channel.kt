package com.hdhomey.app.domain.model

/**
 * Channel domain entity.
 *
 * Business logic representation of a TV channel from an HDHomeRun tuner.
 * This is the domain model used throughout the app's business logic layer.
 *
 * The domain model is separate from the API DTO ([com.hdhomey.app.api.models.Channel])
 * to decouple business logic from API changes and provide computed properties
 * for display and sorting.
 *
 * ## Mapping from API
 *
 * API DTOs are mapped to domain models via mapper functions in
 * [com.hdhomey.app.data.mapper.ChannelMapper].
 *
 * ## Display Properties
 *
 * - [displayName]: User-friendly channel identifier (e.g., "2.1 CBS")
 * - [sortKey]: Numeric sort key for natural ordering (converts "2.1" → 2.1)
 *
 * ## Usage Example
 *
 * ```kotlin
 * val channel = Channel(
 *     id = 1,
 *     tunerId = 1,
 *     number = "2.1",
 *     name = "CBS",
 *     isHd = true,
 *     videoCodec = "H264",
 *     audioCodec = "AAC"
 * )
 *
 * println(channel.displayName) // "2.1 CBS"
 * println(channel.sortKey)     // 2.1
 * ```
 *
 * @property id Channel database primary key
 * @property tunerId Parent tuner ID (foreign key)
 * @property number Guide number in TV guide format (e.g., "2.1", "13.1")
 * @property name Display name (station call letters or network name, e.g., "CBS", "NBC")
 * @property isHd True if HD channel, false if SD
 * @property videoCodec Video codec (e.g., "H264", "MPEG2", "HEVC")
 * @property audioCodec Audio codec (e.g., "AAC", "AC3", "MP3")
 * @property streamUrl Direct stream URL from HDHomeRun device (not used for playback in Phase 2)
 */
data class Channel(
    val id: Int,
    val tunerId: Int,
    val number: String,
    val name: String,
    val isHd: Boolean,
    val videoCodec: String,
    val audioCodec: String,
    val streamUrl: String
) {
    /**
     * Display-friendly channel identifier.
     *
     * Combines channel number and name for UI display.
     *
     * @return Formatted string like "2.1 CBS"
     */
    val displayName: String
        get() = "$number $name"

    /**
     * Sort key for natural numeric ordering.
     *
     * Converts channel number string to double for proper sorting:
     * - "2.1" → 2.1
     * - "10.3" → 10.3
     * - "100.1" → 100.1
     *
     * Invalid numbers default to 999.0 to sort at the end.
     *
     * @return Numeric sort key (defaults to 999.0 for invalid numbers)
     */
    val sortKey: Double
        get() = number.toDoubleOrNull() ?: 999.0

    /**
     * Check if channel number is valid format.
     *
     * Valid format: major.minor where both are positive integers (e.g., "2.1", "13.2").
     * Invalid: "2", "2.", ".1", "abc", "-5.1"
     *
     * @return True if channel number matches pattern `\d+\.\d+`
     */
    val isValidChannelNumber: Boolean
        get() = CHANNEL_NUMBER_REGEX.matches(number)

    companion object {
        /**
         * Regex pattern for valid channel numbers.
         *
         * Format: major.minor where both are digits (e.g., "2.1", "13.2", "100.5")
         */
        private val CHANNEL_NUMBER_REGEX = Regex("""^\d+\.\d+$""")
    }
}
