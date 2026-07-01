package com.hdhomey.app.domain.model

/**
 * Channel domain entity representing a TV channel from a tuner.
 *
 * This is the clean domain representation stripped of API/serialization concerns.
 * Mapped from [com.hdhomey.app.api.models.ChannelDto] via [com.hdhomey.app.data.mapper.toDomain].
 *
 * @property id Backend primary key ID
 * @property tunerId ID of the parent tuner
 * @property number Guide number string (e.g., "2.1", "4.2")
 * @property name Guide display name (e.g., "CBS", "NBC")
 * @property isHd Whether this channel broadcasts in HD
 */
data class Channel(
    val id: Int,
    val tunerId: Int,
    val number: String,
    val name: String,
    val isHd: Boolean
) {
    /**
     * Display-friendly channel identifier combining number and name.
     *
     * Example: "2.1 CBS"
     */
    val displayName: String get() = "$number $name"

    /**
     * Numeric sort key for natural channel ordering.
     *
     * Converts the guide number string (e.g., "2.1") to a Double for numeric
     * sorting. Falls back to 999.0 for malformed channel numbers so they sink
     * to the bottom of any sorted list.
     */
    val sortKey: Double get() = number.toDoubleOrNull() ?: 999.0
}
