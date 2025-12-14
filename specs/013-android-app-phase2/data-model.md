# Data Model: Android App Phase 2

**Date**: 2025-12-14  
**Phase**: 2 - Channel Browsing & Streaming  
**Branch**: `013-android-app-phase2`

## Overview

Phase 2 introduces channel and streaming data models. Models are organized in three layers:
- **API models** (network DTOs - match backend responses)
- **Domain models** (business logic entities)
- **UI models** (display-optimized, includes favorites/hidden state)

---

## Entity Relationships

```
Server (Phase 1)
  ↓ 1:N
Tuner (from backend /api/tuners)
  ↓ 1:N
Channel (from backend /api/tuners/{id}/channels)
  ↓ N:1
ChannelPreferences (from backend /api/preferences/channels)
  
StreamToken (from backend /api/stream-token)
  → Generated per playback session
  → 15-minute expiry
```

---

## 1. Channel Entity

### Purpose
Represents a single TV channel from an HDHomeRun tuner.

### Source
Backend API: `GET /api/tuners/{tunerId}/channels`

### API Model (Network DTO)

```kotlin
package com.hdhomey.app.api.models

import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable

/**
 * Channel data transfer object from HDHomeRun API.
 * 
 * Maps HDHomeRun's native format to our internal representation.
 * Backend returns this format from /api/tuners/{tunerId}/channels.
 */
@Serializable
data class ChannelDto(
    @SerialName("GuideNumber")
    val guideNumber: String, // e.g., "2.1", "4.2", "99.1"
    
    @SerialName("GuideName")
    val guideName: String, // e.g., "CBS", "NBC", "PBS"
    
    @SerialName("URL")
    val url: String, // HDHomeRun stream URL (not used directly in Phase 2)
    
    @SerialName("HD")
    val hd: Int? = null, // 1 if HD, 0 if SD (optional field)
    
    @SerialName("Favorite")
    val favorite: Int? = null, // 1 if favorited (optional, may not exist in Phase 2)
    
    @SerialName("DRM")
    val drm: Int? = null // 1 if encrypted (optional, ignore in Phase 2)
)
```

### Domain Model

```kotlin
package com.hdhomey.app.domain.model

/**
 * Channel domain entity.
 * 
 * Business logic representation of a TV channel.
 * Includes metadata and computed properties.
 */
data class Channel(
    val id: String, // Unique ID: "{tunerId}_{guideNumber}" e.g., "tuner-1_2.1"
    val tunerId: String, // Parent tuner ID
    val number: String, // Guide number (e.g., "2.1")
    val name: String, // Display name (e.g., "CBS")
    val isHd: Boolean, // True if HD channel
    val logoUrl: String?, // Channel logo URL (if available)
    val isDrm: Boolean = false // True if encrypted (ignore in Phase 2)
) {
    /**
     * Display-friendly channel identifier.
     * Example: "2.1 CBS"
     */
    val displayName: String
        get() = "$number $name"
    
    /**
     * Sort key for natural ordering.
     * Converts "2.1" → 2.1, "10.3" → 10.3 for proper numeric sorting.
     */
    val sortKey: Double
        get() = number.toDoubleOrNull() ?: 999.0
}
```

### UI Model (with Preferences)

```kotlin
package com.hdhomey.app.ui.channels.model

import com.hdhomey.app.domain.model.Channel

/**
 * Channel UI model with user preferences.
 * 
 * Combines channel data with user-specific state (favorites, hidden).
 * Used by RecyclerView adapter for display logic.
 */
data class ChannelUiModel(
    val channel: Channel,
    val isFavorite: Boolean = false, // User favorited this channel
    val isHidden: Boolean = false // User hid this channel (don't display)
) {
    val shouldDisplay: Boolean
        get() = !isHidden
    
    val displayPriority: Int
        get() = when {
            isFavorite -> 0 // Show first
            else -> 1 // Show after favorites
        }
}
```

### Mapping Functions

```kotlin
package com.hdhomey.app.data.mapper

import com.hdhomey.app.api.models.ChannelDto
import com.hdhomey.app.domain.model.Channel

/**
 * Maps API DTO to domain model.
 */
fun ChannelDto.toDomain(tunerId: String): Channel = Channel(
    id = "${tunerId}_${guideNumber}",
    tunerId = tunerId,
    number = guideNumber,
    name = guideName,
    isHd = (hd == 1),
    logoUrl = null, // TODO: Phase 3 - logo URL mapping
    isDrm = (drm == 1)
)

/**
 * Maps list of DTOs to domain models.
 */
fun List<ChannelDto>.toDomain(tunerId: String): List<Channel> = 
    map { it.toDomain(tunerId) }
```

### Validation Rules

- `number`: Must match pattern `\d+\.\d+` (e.g., "2.1", "10.3")
- `name`: Non-empty string, max 50 characters
- `tunerId`: Must exist in Phase 1 server list
- `logoUrl`: Valid HTTP/HTTPS URL or null

### Example Data

```json
// API Response: GET /api/tuners/tuner-1/channels
[
  {
    "GuideNumber": "2.1",
    "GuideName": "CBS",
    "URL": "http://192.168.1.100:5004/auto/v2.1",
    "HD": 1
  },
  {
    "GuideNumber": "4.2",
    "GuideName": "NBC",
    "URL": "http://192.168.1.100:5004/auto/v4.2",
    "HD": 1
  },
  {
    "GuideNumber": "7.1",
    "GuideName": "ABC",
    "URL": "http://192.168.1.100:5004/auto/v7.1",
    "HD": 0
  }
]
```

```kotlin
// Domain Model Example
val channel = Channel(
    id = "tuner-1_2.1",
    tunerId = "tuner-1",
    number = "2.1",
    name = "CBS",
    isHd = true,
    logoUrl = null,
    isDrm = false
)
```

---

## 2. Tuner Entity (Reference Only)

### Purpose
Represents an HDHomeRun tuner device. **Already exists in Phase 1** as `Server` model.

### Phase 1 Model (Keep Unchanged)

```kotlin
package com.hdhomey.app.data.model

/**
 * Server/Tuner entity from Phase 1.
 * 
 * Represents an HD Homey server (which proxies HDHomeRun tuners).
 * Phase 2 continues using this model - no changes needed.
 */
data class Server(
    val id: String, // UUID
    val name: String, // User-friendly name
    val url: String, // HD Homey server URL
    val isActive: Boolean = false // Currently selected server
)
```

### Notes
- Phase 2 treats `Server` as "Tuner" conceptually
- Each Server URL maps to one HD Homey instance
- HD Homey may proxy multiple HDHomeRun devices (Phase 3 feature)
- Phase 2 assumes 1 Server = 1 Tuner for simplicity

---

## 3. ChannelPreferences Entity

### Purpose
User-specific channel preferences (favorites, hidden channels).

### Source
Backend API: `GET /api/preferences/channels` (NEW - needs backend implementation)

### API Model (Network DTO)

```kotlin
package com.hdhomey.app.api.models

import kotlinx.serialization.Serializable

/**
 * Channel preferences data transfer object.
 * 
 * User's favorite and hidden channels.
 * Backend: GET /api/preferences/channels
 */
@Serializable
data class ChannelPreferencesDto(
    val favorites: List<String> = emptyList(), // Channel numbers: ["2.1", "4.1"]
    val hidden: List<String> = emptyList() // Channel numbers: ["99.1", "100.1"]
)
```

### Domain Model

```kotlin
package com.hdhomey.app.domain.model

/**
 * Channel preferences domain entity.
 * 
 * User's channel preferences across all tuners.
 */
data class ChannelPreferences(
    val favorites: Set<String>, // Channel numbers (set for fast lookup)
    val hidden: Set<String> // Channel numbers
) {
    companion object {
        val EMPTY = ChannelPreferences(
            favorites = emptySet(),
            hidden = emptySet()
        )
    }
    
    fun isFavorite(channelNumber: String): Boolean = 
        channelNumber in favorites
    
    fun isHidden(channelNumber: String): Boolean = 
        channelNumber in hidden
}
```

### Mapping Functions

```kotlin
package com.hdhomey.app.data.mapper

import com.hdhomey.app.api.models.ChannelPreferencesDto
import com.hdhomey.app.domain.model.ChannelPreferences

/**
 * Maps API DTO to domain model.
 */
fun ChannelPreferencesDto.toDomain(): ChannelPreferences = ChannelPreferences(
    favorites = favorites.toSet(),
    hidden = hidden.toSet()
)
```

### Example Data

```json
// API Response: GET /api/preferences/channels
{
  "favorites": ["2.1", "4.1", "7.1"],
  "hidden": ["99.1", "100.5"]
}
```

```kotlin
// Domain Model Example
val prefs = ChannelPreferences(
    favorites = setOf("2.1", "4.1", "7.1"),
    hidden = setOf("99.1", "100.5")
)

prefs.isFavorite("2.1") // true
prefs.isHidden("99.1") // true
```

---

## 4. StreamToken Entity

### Purpose
HMAC-signed token for authenticating HLS stream requests.

### Source
Backend API: `GET /api/stream-token?tunerId={id}&channelId={number}`

### API Model (Network DTO)

```kotlin
package com.hdhomey.app.api.models

import kotlinx.serialization.Serializable

/**
 * Stream token data transfer object.
 * 
 * HMAC token for authenticating video stream requests.
 * Backend: GET /api/stream-token
 */
@Serializable
data class StreamTokenResponse(
    val token: String, // HMAC-SHA256 signature
    val expiresAt: String // ISO 8601 timestamp (e.g., "2025-12-14T15:30:00Z")
)

/**
 * Stream token request (query parameters).
 */
data class StreamTokenRequest(
    val tunerId: String,
    val channelId: String // Channel number (e.g., "2.1")
)
```

### Domain Model

```kotlin
package com.hdhomey.app.domain.model

import java.time.Instant

/**
 * Stream token domain entity.
 * 
 * Represents an authenticated stream session.
 */
data class StreamToken(
    val token: String, // HMAC signature
    val expiresAt: Instant, // Expiry timestamp
    val tunerId: String,
    val channelId: String
) {
    /**
     * Check if token is still valid (with 1-minute buffer).
     */
    val isValid: Boolean
        get() = Instant.now().plusSeconds(60).isBefore(expiresAt)
    
    /**
     * Seconds until expiry.
     */
    val secondsUntilExpiry: Long
        get() = expiresAt.epochSecond - Instant.now().epochSecond
}
```

### Mapping Functions

```kotlin
package com.hdhomey.app.data.mapper

import com.hdhomey.app.api.models.StreamTokenResponse
import com.hdhomey.app.domain.model.StreamToken
import java.time.Instant

/**
 * Maps API DTO to domain model.
 */
fun StreamTokenResponse.toDomain(
    tunerId: String,
    channelId: String
): StreamToken = StreamToken(
    token = token,
    expiresAt = Instant.parse(expiresAt),
    tunerId = tunerId,
    channelId = channelId
)
```

### Usage in Stream URL Generation

```kotlin
/**
 * Generate HLS stream URL with HMAC token.
 * 
 * Example: https://server.local/api/transcode/tuner-1/2.1/playlist.m3u8?token=abc123
 */
fun generateStreamUrl(
    serverUrl: String,
    tunerId: String,
    channelId: String,
    token: StreamToken
): String = buildString {
    append(serverUrl.removeSuffix("/"))
    append("/api/transcode/")
    append(tunerId)
    append("/")
    append(channelId)
    append("/playlist.m3u8?token=")
    append(token.token)
}
```

### Example Data

```json
// API Response: GET /api/stream-token?tunerId=tuner-1&channelId=2.1
{
  "token": "a1b2c3d4e5f6...",
  "expiresAt": "2025-12-14T15:45:00Z"
}
```

```kotlin
// Domain Model Example
val streamToken = StreamToken(
    token = "a1b2c3d4e5f6...",
    expiresAt = Instant.parse("2025-12-14T15:45:00Z"),
    tunerId = "tuner-1",
    channelId = "2.1"
)

streamToken.isValid // true (if current time < 15:44:00Z)
streamToken.secondsUntilExpiry // e.g., 850 seconds
```

---

## 5. UI State Models

### ChannelListUiState

```kotlin
package com.hdhomey.app.ui.channels

import com.hdhomey.app.ui.channels.model.ChannelUiModel

/**
 * UI state for ChannelListFragment.
 * 
 * Represents all possible states of the channel list screen.
 */
sealed interface ChannelListUiState {
    /**
     * Initial state - loading channels from server.
     */
    data object Loading : ChannelListUiState
    
    /**
     * Channels loaded successfully.
     */
    data class Success(
        val channels: List<ChannelUiModel>,
        val tunerName: String
    ) : ChannelListUiState
    
    /**
     * Error occurred while loading channels.
     */
    data class Error(
        val message: String,
        val isRetryable: Boolean = true
    ) : ChannelListUiState
    
    /**
     * No channels found for tuner.
     */
    data object Empty : ChannelListUiState
}
```

### PlayerUiState

```kotlin
package com.hdhomey.app.ui.player

/**
 * UI state for PlayerActivity.
 * 
 * Represents video playback states.
 */
sealed interface PlayerUiState {
    /**
     * Preparing stream (fetching token, loading media).
     */
    data object Preparing : PlayerUiState
    
    /**
     * Video is playing.
     */
    data class Playing(
        val channelName: String,
        val channelNumber: String,
        val isBuffering: Boolean = false
    ) : PlayerUiState
    
    /**
     * Video is paused.
     */
    data class Paused(
        val channelName: String,
        val channelNumber: String
    ) : PlayerUiState
    
    /**
     * Playback error occurred.
     */
    data class Error(
        val message: String,
        val errorCode: Int? = null,
        val isRetryable: Boolean = true
    ) : PlayerUiState
}
```

---

## 6. DataStore Keys

### TokenDataStore Keys

```kotlin
package com.hdhomey.app.storage

import androidx.datastore.preferences.core.stringPreferencesKey

/**
 * DataStore preference keys.
 */
object PreferenceKeys {
    val JWT_TOKEN = stringPreferencesKey("jwt_token")
    val ACTIVE_SERVER_ID = stringPreferencesKey("active_server_id")
    val ACTIVE_SERVER_URL = stringPreferencesKey("active_server_url")
    val USER_ID = stringPreferencesKey("user_id")
}
```

---

## 7. Database Schema (None for Phase 2)

Phase 2 does **not** use Room database. All data is:
- **Transient**: Fetched from backend on demand
- **Cached in-memory**: During app session only
- **Persistent preferences**: DataStore only (JWT token, active server)

**Future (Phase 3+)**: Consider Room for offline channel caching.

---

## 8. Data Validation Rules

### Channel Number Format

```kotlin
private val CHANNEL_NUMBER_REGEX = Regex("""^\d+\.\d+$""")

fun String.isValidChannelNumber(): Boolean = 
    matches(CHANNEL_NUMBER_REGEX)

// Valid: "2.1", "10.3", "100.5"
// Invalid: "2", "2.", ".1", "abc"
```

### Stream Token Expiry

```kotlin
/**
 * Tokens are valid for 15 minutes.
 * Refresh if < 1 minute remaining (60-second buffer).
 */
fun StreamToken.needsRefresh(): Boolean = 
    secondsUntilExpiry < 60
```

### JWT Token Expiry

```kotlin
/**
 * JWT tokens expire after 7 days.
 * Handled by backend (401 Unauthorized response).
 * App should catch 401 and prompt re-authentication.
 */
```

---

## 9. Sorting & Filtering

### Channel Sorting

```kotlin
/**
 * Sort channels by:
 * 1. Favorites first
 * 2. Channel number (numeric)
 */
fun List<ChannelUiModel>.sortForDisplay(): List<ChannelUiModel> = 
    sortedWith(
        compareBy<ChannelUiModel> { it.displayPriority }
            .thenBy { it.channel.sortKey }
    )
```

### Channel Filtering

```kotlin
/**
 * Filter out hidden channels.
 */
fun List<ChannelUiModel>.filterVisible(): List<ChannelUiModel> = 
    filter { !it.isHidden }
```

---

## 10. Error Handling

### API Error Response

```kotlin
package com.hdhomey.app.api.models

import kotlinx.serialization.Serializable

/**
 * Standard error response from backend.
 */
@Serializable
data class ErrorResponse(
    val error: String, // Error message
    val code: String? = null, // Error code (e.g., "UNAUTHORIZED")
    val details: String? = null // Additional details
)
```

### Common Error Codes

```kotlin
object ApiErrorCodes {
    const val UNAUTHORIZED = "UNAUTHORIZED" // 401 - JWT expired
    const val FORBIDDEN = "FORBIDDEN" // 403 - Insufficient permissions
    const val NOT_FOUND = "NOT_FOUND" // 404 - Resource not found
    const val RATE_LIMITED = "RATE_LIMITED" // 429 - Too many requests
    const val INTERNAL_ERROR = "INTERNAL_ERROR" // 500 - Server error
}
```

---

## Data Flow Summary

```
ViewModel requests channels
       ↓
UseCase orchestrates
       ↓
Repository fetches from API
       ↓
    ┌──────────────────────┐
    │ Network Layer        │
    │ 1. Retrofit call     │
    │ 2. ChannelDto list   │
    └──────────────────────┘
       ↓
Mapper: ChannelDto → Channel (domain)
       ↓
Repository fetches preferences
       ↓
    ┌──────────────────────┐
    │ Network Layer        │
    │ 1. Retrofit call     │
    │ 2. PreferencesDto    │
    └──────────────────────┘
       ↓
Mapper: PreferencesDto → ChannelPreferences (domain)
       ↓
UseCase combines: Channel + Preferences → ChannelUiModel
       ↓
ViewModel emits StateFlow<List<ChannelUiModel>>
       ↓
Fragment observes and updates RecyclerView
```

---

## Files to Create

### Phase 2.2 (Channel List)
- `api/models/ChannelDto.kt`
- `api/models/ChannelPreferencesDto.kt`
- `domain/model/Channel.kt`
- `domain/model/ChannelPreferences.kt`
- `data/mapper/ChannelMapper.kt`
- `ui/channels/model/ChannelUiModel.kt`
- `ui/channels/ChannelListUiState.kt`

### Phase 2.3 (Video Player)
- `api/models/StreamTokenResponse.kt`
- `domain/model/StreamToken.kt`
- `data/mapper/StreamTokenMapper.kt`
- `ui/player/PlayerUiState.kt`
- `util/StreamUrlGenerator.kt`

### Phase 2.1 (DataStore)
- `storage/TokenDataStore.kt`
- `storage/PreferenceKeys.kt`

---

**Data Model Complete** ✅  
**Next**: Create contracts/ directory with API contracts
