package com.hdhomey.app.data.mapper

import com.hdhomey.app.api.models.StreamTokenResponse
import com.hdhomey.app.domain.model.StreamToken
import java.time.Instant

/**
 * Maps a [StreamTokenResponse] (API layer) to a [StreamToken] domain entity.
 *
 * The backend returns `expiresAt` as a Unix timestamp in **seconds** (not milliseconds).
 * [Instant.ofEpochSecond] is used here to convert it to a proper [Instant]; callers
 * must not assume the raw long is in milliseconds.
 */
fun StreamTokenResponse.toDomain(): StreamToken = StreamToken(
    token = token,
    expiresAt = Instant.ofEpochSecond(expiresAt),
    tunerId = tunerId,
    channelId = channelId
)
