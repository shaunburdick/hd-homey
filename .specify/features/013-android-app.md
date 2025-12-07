# Feature Specification: Android App for TV, Phone, and Tablet

**Feature ID**: `013-android-app`  
**Created**: 2025-12-07  
**Status**: 📝 Specification Phase  
**Owner**: HD Homey Core Team  
**Version**: 1.0

## Overview

The HD Homey Android app brings live TV streaming to Android TV devices, phones, and tablets through a universal native application. Using a hybrid WebView + native video architecture, the app reuses HD Homey's existing web interface for browsing while providing optimal video playback through AndroidX Media3. The app supports multiple authentication methods (QR code, device code, username/password), automatic server discovery, and graceful fallback from MPEG-2 to HLS transcoding based on device capabilities.

## Problem Statement

HD Homey currently requires users to access the web interface through browsers, which creates several limitations:
- **Android TV users** must navigate with browser-based interfaces not optimized for D-pad/remote control
- **Mobile users** lack a native app experience with proper video player integration
- **10-foot interface** (TV viewing) requires different UX than web browser provides
- **Video playback** relies on HTML5 video, which has codec limitations and performance issues
- **Authentication** through browser on TV requires painful on-screen keyboard typing

An Android app solves these problems by providing native video playback, optimized TV navigation, and streamlined authentication.

## User Stories

### Story 1: First-Time Setup on Android TV (Priority: P1)

**As a** new Android TV user  
**I want** to easily connect the app to my HD Homey server without typing URLs or passwords  
**So that** I can start watching TV quickly

**Why this priority**: Initial setup determines if users can even use the app

**Acceptance Criteria**:
- **Given** I launch the app for the first time, **When** on same network as HD Homey, **Then** app auto-discovers server and shows pairing options
- **Given** I see the pairing screen, **When** I choose QR code option, **Then** I can scan QR with my phone and authorize the TV
- **Given** I see the pairing screen, **When** I choose device code option, **Then** I see a 6-character code I can enter on HD Homey web interface
- **Given** I authorize the device, **When** authentication succeeds, **Then** app stores credentials and proceeds to channel list
- **Given** auto-discovery fails, **When** I choose manual setup, **Then** I can enter HD Homey server URL manually

---

### Story 2: Browse Channels with D-Pad Navigation (Priority: P1)

**As an** Android TV user  
**I want** to navigate through channels using my TV remote's D-pad  
**So that** I can find content without a mouse or touchscreen

**Why this priority**: Core TV UX - remote control is the primary input method

**Acceptance Criteria**:
- **Given** I'm on the channel list, **When** I press D-pad up/down, **Then** focus moves between channels smoothly
- **Given** focus is on a channel, **When** I press D-pad select/OK, **Then** channel detail opens
- **Given** I'm in a menu, **When** I press D-pad back, **Then** I return to previous screen
- **Given** channels are organized by tuner, **When** I press D-pad left/right, **Then** I can expand/collapse tuner sections
- **Given** I have favorites enabled, **When** viewing channel list, **Then** starred channels appear first with visual indicator

---

### Story 3: Watch Live TV with Native Video Player (Priority: P1)

**As a** user on any Android device  
**I want** to watch live TV streams in a native video player  
**So that** I get smooth playback without browser limitations

**Why this priority**: Core value proposition - watching TV is the main purpose

**Acceptance Criteria**:
- **Given** I select a channel, **When** I click "Watch", **Then** full-screen Media3 video player opens within 2 seconds
- **Given** the player opens, **When** device supports MPEG-2, **Then** app streams raw MPEG-TS from `/stream` endpoint
- **Given** the player opens, **When** device doesn't support MPEG-2, **Then** app automatically falls back to HLS transcoding
- **Given** video is playing, **When** I press play/pause on remote, **Then** player responds immediately
- **Given** video is playing, **When** I press back button, **Then** player exits and returns to channel list
- **Given** stream fails, **When** error occurs, **Then** I see helpful error message and option to retry

---

### Story 4: Multi-Device Support (Priority: P1)

**As a** user  
**I want** the same app to work on my TV, tablet, and phone  
**So that** I don't need separate apps for each device

**Why this priority**: Maximizes reach and reduces maintenance

**Acceptance Criteria**:
- **Given** I install on Android TV, **When** app launches, **Then** I see 10-foot interface optimized for D-pad
- **Given** I install on tablet, **When** app launches, **Then** I see touch-optimized interface with appropriate spacing
- **Given** I install on phone, **When** app launches, **Then** I see compact mobile interface
- **Given** I'm on phone/tablet, **When** authenticating, **Then** username/password entry is easier (no D-pad keyboard)
- **Given** I'm on any device, **When** watching video, **Then** player controls adapt to input method (touch vs D-pad)

---

### Story 5: Automatic Server Discovery (Priority: P2)

**As a** user on the same network as HD Homey  
**I want** the app to automatically find my HD Homey server  
**So that** I don't need to know IP addresses or hostnames

**Why this priority**: Improves UX but manual entry provides fallback

**Acceptance Criteria**:
- **Given** app launches for first time, **When** on same LAN as HD Homey, **Then** app discovers server via mDNS (`hd-homey.local`)
- **Given** server is discovered, **When** I see setup screen, **Then** HD Homey URL is pre-filled
- **Given** discovery fails, **When** I wait 5 seconds, **Then** app prompts for manual URL entry
- **Given** I enter manual URL, **When** URL is valid, **Then** app connects and proceeds to authentication

---

### Story 6: Remote Access Support (Priority: P2)

**As a** remote user  
**I want** to connect to HD Homey over the internet  
**So that** I can watch TV when away from home

**Why this priority**: Advanced use case, requires server configuration

**Acceptance Criteria**:
- **Given** I'm not on local network, **When** I enter `https://homey.example.com` manually, **Then** app connects over internet
- **Given** I'm using remote URL, **When** authenticating, **Then** connection uses HTTPS (not HTTP)
- **Given** remote connection succeeds, **When** watching video, **Then** streams work same as local connection

---

### Story 7: Channel Favorites and Organization (Priority: P2)

**As a** user  
**I want** to star favorite channels and hide unwanted ones  
**So that** I can quickly access my preferred content

**Why this priority**: Quality-of-life feature leveraging existing web functionality

**Acceptance Criteria**:
- **Given** I'm viewing channels, **When** I star a channel, **Then** it appears at top of list with star icon
- **Given** I hide a channel, **When** viewing channel list, **Then** hidden channel is not shown
- **Given** I have favorites, **When** I open app, **Then** favorites appear first in each tuner section
- **Given** I change favorites/hidden on web, **When** I refresh app, **Then** changes sync automatically

---

### Story 8: Persistent Authentication (Priority: P2)

**As a** user  
**I want** to stay logged in between app sessions  
**So that** I don't need to re-authenticate every time

**Why this priority**: Reduces friction for returning users

**Acceptance Criteria**:
- **Given** I've authenticated, **When** I close and reopen app, **Then** I remain logged in
- **Given** session is active, **When** 7 days pass (JWT expiry), **Then** app prompts for re-authentication
- **Given** I log out manually, **When** I reopen app, **Then** I see authentication screen
- **Given** credentials stored, **When** server URL changes, **Then** app detects and prompts for new setup

---

## Requirements

### Functional Requirements

#### Core Features
- **FR-001**: App MUST support Android TV, tablets, and phones with single codebase
- **FR-002**: App MUST display HD Homey web interface via WebView for channel browsing
- **FR-003**: App MUST use native AndroidX Media3 player for video playback (not HTML5 video)
- **FR-004**: App MUST provide JavaScript bridge between WebView and native video player
- **FR-005**: App MUST detect device type (TV/tablet/phone) and adapt UI accordingly

#### Authentication
- **FR-006**: App MUST support QR code pairing (TV shows QR, user scans with phone)
- **FR-007**: App MUST support device code pairing (TV shows 6-char code, user enters on web)
- **FR-008**: App MUST support username/password authentication as fallback
- **FR-009**: App MUST store JWT session tokens securely using Android Keystore
- **FR-010**: App MUST auto-refresh expired sessions when possible

#### Server Discovery
- **FR-011**: App MUST attempt mDNS discovery for `hd-homey.local` on first launch
- **FR-012**: App MUST support manual HD Homey server URL entry
- **FR-013**: App MUST validate server connectivity before proceeding
- **FR-014**: App MUST support both HTTP (local) and HTTPS (remote) connections

#### Video Playback
- **FR-015**: App MUST stream MPEG-2 TS from `/tuners/[id]/channel/[channel_id]/stream?token=XXX` as primary method
- **FR-016**: App MUST detect MPEG-2 codec support on device
- **FR-017**: App MUST automatically fall back to HLS transcoding (`/api/transcode/...`) if MPEG-2 unsupported
- **FR-018**: App MUST use existing stream token authentication for video requests
- **FR-019**: App MUST provide full-screen video player with standard controls (play/pause/seek)
- **FR-020**: App MUST handle back button to exit video player and return to channel list

#### Navigation
- **FR-021**: App MUST support D-pad navigation on Android TV (up/down/left/right/select)
- **FR-022**: App MUST support touch navigation on phones/tablets
- **FR-023**: App MUST inject CSS/JavaScript into WebView to optimize for D-pad focus
- **FR-024**: App MUST handle back button navigation correctly across screens

#### Features (from Web UI)
- **FR-025**: App SHOULD display channel favorites (starred channels) at top of list
- **FR-026**: App SHOULD respect hidden channel preferences
- **FR-027**: App SHOULD support channel search/filtering
- **FR-028**: App SHOULD organize channels by tuner with expand/collapse sections

### Non-Functional Requirements

#### Performance
- **NFR-001**: Video playback MUST start within 3 seconds of channel selection
- **NFR-002**: WebView MUST load channel list within 2 seconds (on good network)
- **NFR-003**: D-pad navigation MUST respond within 100ms (no lag)
- **NFR-004**: App MUST use < 150MB memory during typical usage

#### Compatibility
- **NFR-005**: App MUST support Android 9+ (API level 28+)
- **NFR-006**: App MUST work with HD Homey 1.1.0+ (requires device pairing backend)
- **NFR-007**: App MUST work on Android TV, tablets (7"+), and phones (4"+)
- **NFR-008**: App MUST handle portrait and landscape orientations on phones/tablets

#### Reliability
- **NFR-009**: App MUST NOT crash if HD Homey server is unreachable
- **NFR-010**: App MUST gracefully handle network interruptions during video playback
- **NFR-011**: App MUST recover from WebView crashes without losing session
- **NFR-012**: App MUST validate all inputs from WebView JavaScript bridge

#### Security
- **NFR-013**: App MUST store credentials in Android Keystore (not SharedPreferences)
- **NFR-014**: App MUST use HTTPS for remote connections
- **NFR-015**: App MUST validate SSL certificates (no self-signed cert bypass in production)
- **NFR-016**: App MUST sanitize JavaScript bridge inputs to prevent injection

#### Usability
- **NFR-017**: App MUST provide clear error messages for common issues (server unreachable, auth failed, etc.)
- **NFR-018**: App MUST show loading indicators during async operations
- **NFR-019**: App MUST provide consistent back button behavior across all screens
- **NFR-020**: Video player controls MUST be intuitive and match Android platform conventions

#### Accessibility
- **NFR-021**: App MUST meet Android accessibility guidelines for D-pad navigation
- **NFR-022**: App MUST provide content descriptions for all interactive elements
- **NFR-023**: App MUST support TalkBack screen reader on phones/tablets
- **NFR-024**: App MUST maintain focus indicators visible on Android TV

### Data Requirements

#### Local Storage
- **HD Homey Server Configuration**:
  - Server URL (e.g., `http://hd-homey.local:3000` or `https://homey.example.com`)
  - Connection type (local/remote)
  - Last successful connection timestamp

- **Authentication Tokens** (Android Keystore):
  - JWT session token (encrypted)
  - Token expiry timestamp
  - User role (admin/viewer)

- **App Preferences**:
  - Last watched channel ID
  - Video quality preference (MPEG-2 vs HLS)
  - Theme preference (if applicable)

#### No Server-Side Data
- App is purely a client - all data comes from HD Homey backend
- No separate database or backend for Android app

## Technical Constraints

### Platform Requirements
- **Minimum Android Version**: Android 9 (Pie, API level 28)
- **Target Android Version**: Android 14 (API level 34)
- **HD Homey Version**: Requires HD Homey 1.1.0+ for device pairing API

### Development Stack
- **Language**: Kotlin 2.2.21+ (latest stable)
- **Build System**: Gradle 8.0+ with Android Gradle Plugin 8.0+
- **IDE**: Android Studio Hedgehog (2023.1.1) or newer

### Key Libraries
- **AndroidX Media3**: 1.9.0+ (video playback, replaces deprecated ExoPlayer)
  - `androidx.media3:media3-exoplayer:1.9.0`
  - `androidx.media3:media3-ui:1.9.0`
- **WebView**: Android System WebView (built-in)
- **Networking**: OkHttp 4.12.0+ for HTTP client
- **JSON Parsing**: Kotlinx Serialization 1.6.0+
- **Dependency Injection**: Dagger Hilt 2.50+ (optional but recommended)
- **QR Code Generation**: ZXing 3.5.3+ (client-side QR generation)
- **mDNS Discovery**: Android NSD (Network Service Discovery, built-in)

### Architecture Constraints
- **Hybrid Architecture**: WebView for UI + Native player for video
- **JavaScript Bridge**: Communication via `addJavascriptInterface()`
- **Single Activity**: Use single Activity with Fragment navigation (modern Android pattern)
- **No Compose UI**: WebView-based, not Jetpack Compose (simplicity)

### HD Homey Backend Dependencies

The Android app requires these NEW backend features (to be implemented in HD Homey 1.1.0):

#### 1. Device Pairing API
```typescript
// Generate device code
POST /api/auth/device/code
Response: {
  code: "A8F2K9",           // 6-character alphanumeric
  expiresAt: "2025-12-07T15:30:00Z",
  pairingUrl: "http://hd-homey.local:3000/pair?code=A8F2K9"
}

// Poll for authorization
GET /api/auth/device/poll?code=A8F2K9
Responses:
  - { status: "pending" }
  - { status: "authorized", token: "jwt-token-here", user: {...} }
  - { status: "expired" }
```

#### 2. Pairing Web Page
```
GET /pair
  - Shows form to enter device code
  - Validates code
  - Prompts logged-in user: "Authorize Android TV?"
  - On approval, marks code as authorized and returns JWT
```

#### 3. Enhanced Stream Token API (already exists, document it)
```
GET /api/stream-token?tunerId=1&channelId=42
Response: {
  token: "hmac-sha256-token",
  expiresAt: "2025-12-07T15:30:00Z"
}
```

### Video Format Support Matrix

| Device | MPEG-2 TS | H.264/HLS | App Strategy |
|--------|-----------|-----------|--------------|
| Modern Android TV (2020+) | ✅ Native | ✅ Native | Use MPEG-2 via `/stream` |
| Budget Android TV | ❌ No support | ✅ Native | Fallback to HLS via `/transcode` |
| Android Phones/Tablets | ⚠️ Varies | ✅ Native | Fallback to HLS via `/transcode` |

**Detection Strategy**:
```kotlin
// Try MPEG-2 first
val mediaItem = MediaItem.fromUri(mpegStreamUrl)
player.setMediaItem(mediaItem)
player.prepare()

// Listen for errors
player.addListener(object : Player.Listener {
    override fun onPlayerError(error: PlaybackException) {
        if (error.errorCode == PlaybackException.ERROR_CODE_DECODER_INIT_FAILED) {
            // MPEG-2 not supported, switch to HLS
            switchToHLSStream()
        }
    }
})
```

### WebView Security
- **MUST** enable Safe Browsing API
- **MUST** disable file access (`setAllowFileAccess(false)`)
- **MUST** enable same-origin policy
- **MUST** validate all JavaScript bridge inputs
- **MUST** use Content Security Policy headers from HD Homey

## Edge Cases & Error Handling

### Server Discovery Failures
- **Scenario**: User opens app, mDNS discovery times out (no HD Homey found)
- **Handling**: 
  - Show message: "Couldn't find HD Homey on your network"
  - Provide "Enter URL manually" button
  - Suggest checking WiFi connection

### Authentication Failures
- **Scenario 1**: Device code expires before user completes pairing
- **Handling**: 
  - Show message: "Code expired. Please try again."
  - Generate new code automatically
  
- **Scenario 2**: User enters wrong username/password (fallback method)
- **Handling**: 
  - Show error: "Invalid credentials"
  - Allow retry without losing entered username

### Video Playback Failures
- **Scenario 1**: MPEG-2 codec not supported on device
- **Handling**: 
  - Detect `ERROR_CODE_DECODER_INIT_FAILED`
  - Automatically switch to HLS transcoding URL
  - Log preference for future playback
  
- **Scenario 2**: Network drops mid-stream
- **Handling**: 
  - Show buffering indicator
  - Attempt reconnection (3 retries with exponential backoff)
  - If fails, show error with "Retry" button

- **Scenario 3**: HD Homey server stops responding during playback
- **Handling**: 
  - Detect connection timeout
  - Exit player with error message
  - Return to channel list

### WebView Crashes
- **Scenario**: WebView crashes due to memory pressure or OS issue
- **Handling**: 
  - Detect `onRenderProcessGone()` callback
  - Reload WebView automatically
  - Restore session if possible (JWT token still valid)
  - Notify user: "Reloading channel list..."

### Incompatible HD Homey Version
- **Scenario**: App connects to HD Homey 1.0.0 (no device pairing API)
- **Handling**: 
  - Detect missing `/api/auth/device/code` endpoint (404)
  - Show error: "HD Homey server is outdated. Please upgrade to 1.1.0+"
  - Allow username/password fallback if supported

### Network Switching
- **Scenario**: User starts on WiFi (local), then switches to cellular (remote)
- **Handling**: 
  - Detect network change via `ConnectivityManager`
  - If server URL was auto-discovered (`hd-homey.local`), re-check connectivity
  - If unreachable, pause playback and show network error
  - Allow user to switch to remote URL if configured

### Multiple HD Homey Servers
- **Scenario**: User has HD Homey at home and vacation house
- **Handling**: 
  - Initial scope: Support one server at a time
  - User must manually change server URL in settings
  - Future: Store multiple server profiles

### TV Remote Special Buttons
- **Scenario**: User presses channel up/down buttons on TV remote
- **Handling**: 
  - Out of scope for v1
  - Future enhancement: Map CH+/CH- to next/previous channel

## Success Criteria

### Measurable Outcomes
- **SC-001**: 90%+ of users complete pairing without errors (QR or device code)
- **SC-002**: Video playback starts within 3 seconds for 95% of streams
- **SC-003**: D-pad navigation lag < 100ms on Android TV (measured with frame profiler)
- **SC-004**: App crash rate < 1% (measured via Play Console crash reports)
- **SC-005**: 80%+ of users stay logged in for 7+ days (session persistence works)

### User Validation
- [ ] Successfully tested on Android TV 9, 11, 13, 14
- [ ] Successfully tested on 3+ Android TV devices (different manufacturers)
- [ ] Successfully tested on Android phones (portrait + landscape)
- [ ] Successfully tested on Android tablets
- [ ] QR code pairing works from phone → TV
- [ ] Device code pairing works from web → TV
- [ ] MPEG-2 playback works on modern devices
- [ ] HLS fallback works on devices without MPEG-2
- [ ] Remote access works over HTTPS
- [ ] App recovers gracefully from network interruptions

### Performance Validation
- [ ] App launches in < 2 seconds (cold start)
- [ ] WebView loads channel list in < 2 seconds
- [ ] Video starts playing in < 3 seconds
- [ ] Memory usage < 150MB during video playback
- [ ] No ANR (Application Not Responding) errors during testing

## Dependencies

### Depends On
- **SPEC-002**: Channel Streaming (app consumes `/stream` endpoint)
- **SPEC-003**: User Authentication (app uses JWT sessions from Better-Auth)
- **SPEC-005**: Video Transcoding (app falls back to HLS when needed)
- **SPEC-012**: Channel Favorites (app displays favorites in WebView)
- **NEW**: HD Homey 1.1.0 device pairing backend (must be implemented)

### Blocks
- None (app is parallel effort to web development)

### Related To
- **SPEC-004**: UI/UX Guidelines (app should follow accessibility principles)
- Future: Fire TV app (similar architecture, different platform)

## Out of Scope

Explicitly list what this feature does NOT include:

### Out of Scope for v1
- ❌ **DVR/Recording** - Per constitution, not a DVR system
- ❌ **EPG/Program Guide** - Per constitution, no TV guide
- ❌ **Closed Captioning** - Constitution says "future enhancement"
- ❌ **Picture-in-Picture (PiP)** - Future v2 feature
- ❌ **Chromecast sender** - Casting FROM phone TO TV
- ❌ **Voice search integration** - Android TV voice commands
- ❌ **Home screen integration** - Recommendations row on TV launcher
- ❌ **Admin features on TV** - Tuner/user management (use web UI)
- ❌ **Multiple audio tracks** - Use default audio track only
- ❌ **Parental controls** - No content filtering
- ❌ **Offline viewing** - Live streaming only
- ❌ **Channel up/down remote buttons** - Special TV remote button mapping

### Out of Scope Entirely
- ❌ **Fire TV app** - Different platform (requires separate project)
- ❌ **Apple TV app** - Different platform (Swift/tvOS)
- ❌ **Roku app** - Different platform (BrightScript)
- ❌ **Chromecast receiver** - HD Homey doesn't run on Chromecast hardware
- ❌ **Android Auto** - Watching TV while driving is unsafe

## Architecture Overview

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│           HD Homey Android App (Universal)              │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │          MainActivity (Single Activity)           │  │
│  │                                                   │  │
│  │  Fragments:                                       │  │
│  │  - ServerSetupFragment (first launch)            │  │
│  │  - AuthenticationFragment (pairing/login)        │  │
│  │  - ChannelBrowserFragment (WebView container)    │  │
│  │  - PlayerFragment (Media3 video player)          │  │
│  └───────────────────────────────────────────────────┘  │
│                      ↕                                  │
│  ┌───────────────────────────────────────────────────┐  │
│  │           WebView (HD Homey Web UI)              │  │
│  │  - Loads: https://hd-homey.local/                │  │
│  │  - Shows: Channel list, favorites, search        │  │
│  │  - Injects: D-pad CSS, JavaScript bridge         │  │
│  └───────────────────────────────────────────────────┘  │
│          ↕ JavaScript Bridge (VideoPlayerBridge)        │
│  ┌───────────────────────────────────────────────────┐  │
│  │       AndroidX Media3 Player (Native)            │  │
│  │  - Plays: MPEG-2 TS or HLS                       │  │
│  │  - Controls: Play/Pause/Seek                     │  │
│  │  - Fullscreen video playback                     │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
                         ↕ HTTPS/HTTP
┌─────────────────────────────────────────────────────────┐
│               HD Homey Server (Backend)                 │
│  - /api/auth/device/code (device pairing)              │
│  - /api/auth/device/poll (pairing status)              │
│  - /pair (pairing web page)                            │
│  - /tuners/[id]/channel/[channel_id]/stream (MPEG-2)   │
│  - /api/transcode/.../playlist.m3u8 (HLS fallback)     │
│  - / (main web UI served to WebView)                   │
└─────────────────────────────────────────────────────────┘
```

### Key Components

#### 1. MainActivity (Single Activity Pattern)
- Hosts all fragments
- Manages navigation between setup → auth → browsing → player
- Handles device type detection (TV/tablet/phone)
- Manages Android TV focus handling

#### 2. ServerSetupFragment
- Attempts mDNS discovery on first launch
- Shows manual URL entry if discovery fails
- Validates server connectivity
- Stores server URL in encrypted SharedPreferences

#### 3. AuthenticationFragment
- Displays pairing options (QR/device code/username-password)
- Generates QR code locally using ZXing
- Polls backend for device code authorization
- Handles username/password login as fallback
- Stores JWT token in Android Keystore

#### 4. ChannelBrowserFragment
- Hosts WebView loading HD Homey web UI
- Injects CSS for D-pad focus styling
- Registers JavaScript bridge for video playback
- Handles WebView lifecycle (pause/resume)

#### 5. PlayerFragment
- Full-screen Media3 ExoPlayer instance
- Receives stream URL via navigation arguments
- Tries MPEG-2 first, falls back to HLS on error
- Provides standard video controls (play/pause/seek)
- Returns to browser on back button

#### 6. JavaScript Bridge (VideoPlayerBridge)
```kotlin
class VideoPlayerBridge(private val activity: MainActivity) {
    @JavascriptInterface
    fun playVideo(streamUrl: String, channelName: String, channelId: Int) {
        // Validate inputs
        if (!streamUrl.startsWith("http")) return
        
        // Navigate to player fragment
        activity.runOnUiThread {
            val args = Bundle().apply {
                putString("streamUrl", streamUrl)
                putString("channelName", channelName)
                putInt("channelId", channelId)
            }
            activity.navigateToPlayer(args)
        }
    }
    
    @JavascriptInterface
    fun getDeviceType(): String {
        // Returns: "tv", "tablet", or "phone"
        return when {
            activity.packageManager.hasSystemFeature("android.software.leanback") -> "tv"
            activity.resources.configuration.isLayoutSizeAtLeast(Configuration.SCREENLAYOUT_SIZE_LARGE) -> "tablet"
            else -> "phone"
        }
    }
}
```

### WebView Integration

#### Injected JavaScript (for HD Homey web UI)
```javascript
// Detect Android app environment
window.isAndroidApp = typeof AndroidApp !== 'undefined';
window.deviceType = AndroidApp?.getDeviceType() || 'unknown';

// Override "Watch" button behavior
if (window.isAndroidApp) {
    document.addEventListener('click', (e) => {
        const watchButton = e.target.closest('[data-watch-channel]');
        if (watchButton) {
            e.preventDefault();
            const channelId = watchButton.dataset.channelId;
            const channelName = watchButton.dataset.channelName;
            const streamUrl = watchButton.dataset.streamUrl;
            
            // Call native Android bridge
            AndroidApp.playVideo(streamUrl, channelName, parseInt(channelId));
        }
    });
}

// Add D-pad navigation CSS
if (window.deviceType === 'tv') {
    const style = document.createElement('style');
    style.textContent = `
        *:focus {
            outline: 3px solid #007bff;
            outline-offset: 2px;
        }
        button:focus, a:focus {
            background-color: rgba(0, 123, 255, 0.1);
        }
    `;
    document.head.appendChild(style);
}
```

### Video Playback Flow

```
User clicks "Watch" in WebView
       ↓
JavaScript Bridge receives playVideo(streamUrl, ...)
       ↓
MainActivity navigates to PlayerFragment
       ↓
PlayerFragment creates Media3 ExoPlayer
       ↓
Try primary: streamUrl = /tuners/1/channel/42/stream?token=XXX (MPEG-2)
       ↓
ExoPlayer prepares MediaItem
       ↓
    ┌───────────────────────────────┐
    │ Does device support MPEG-2?   │
    └───────────────────────────────┘
         /                    \
       YES                    NO
        ↓                      ↓
    Play MPEG-2         onPlayerError(DECODER_INIT_FAILED)
        ↓                      ↓
    Success!          Switch to HLS: /api/transcode/.../playlist.m3u8
                               ↓
                         Play HLS (H.264)
                               ↓
                           Success!
```

### Device Type Detection

```kotlin
enum class DeviceType {
    TV,     // Android TV (leanback feature)
    TABLET, // 7"+ screen
    PHONE   // < 7" screen
}

fun detectDeviceType(context: Context): DeviceType {
    return when {
        context.packageManager.hasSystemFeature(PackageManager.FEATURE_LEANBACK) -> DeviceType.TV
        context.resources.configuration.smallestScreenWidthDp >= 600 -> DeviceType.TABLET
        else -> DeviceType.PHONE
    }
}
```

### Authentication Flow (Device Code)

```
1. App: POST /api/auth/device/code
   Server: { code: "A8F2K9", expiresAt: "...", pairingUrl: "..." }

2. App shows TV screen:
   ┌─────────────────────────────┐
   │  Sign in to HD Homey        │
   │                             │
   │  [QR CODE]                  │
   │                             │
   │  Or visit: homey.local/pair │
   │  Enter code: A8F2K9         │
   └─────────────────────────────┘

3. User opens phone/computer browser → homey.local/pair
   Enters code: A8F2K9
   Server shows: "Authorize Android TV?"
   User clicks: "Yes"

4. App polls: GET /api/auth/device/poll?code=A8F2K9 (every 3 seconds)
   Server: { status: "pending" }
   Server: { status: "pending" }
   Server: { status: "authorized", token: "jwt-token", user: {...} }

5. App stores JWT token in Android Keystore
   Navigates to ChannelBrowserFragment
```

## Distribution & Release Strategy

### Phase 1: Alpha Testing (v0.1-alpha)
- **Distribution**: GitHub Releases (APK download)
- **Target Audience**: Early adopters, developers, testers
- **Goal**: Validate core functionality, gather initial feedback
- **Timeline**: 2-4 weeks of development, 2 weeks of testing

### Phase 2: Beta Testing (v0.5-beta)
- **Distribution**: GitHub Releases (APK download)
- **Target Audience**: Wider HD Homey user base
- **Goal**: Stress test, find edge cases, polish UX
- **Timeline**: 4 weeks of testing, iterative improvements

### Phase 3: Production Release (v1.0)
- **Distribution**: Google Play Store + GitHub APK
- **Target Audience**: General public
- **Requirements**: 
  - $25 Google Play developer account fee
  - App review process (1-7 days)
  - Privacy policy published
  - Play Store listing (screenshots, description)
- **Timeline**: 1 week for submission, ongoing maintenance

### APK Distribution (GitHub Releases)
- Signed APK artifacts attached to GitHub releases
- Installation instructions in README:
  ```
  1. Enable "Install from unknown sources" in Android settings
  2. Download APK from GitHub Releases
  3. Open APK file to install
  4. Launch "HD Homey" app
  ```

### Play Store Listing (v1.0+)
- **App Name**: HD Homey
- **Short Description**: Watch live TV from your HDHomeRun devices
- **Category**: Video Players & Editors
- **Content Rating**: Everyone (live TV, no explicit content)
- **Permissions**: Internet, Network State (for streaming)
- **Screenshots**: Required for TV, tablet, and phone form factors

## Technical Decisions & Rationale

### Why Hybrid WebView + Native Video?
**Decision**: Use WebView for UI, native Media3 player for video

**Alternatives Considered**:
- Fully native UI (Jetpack Compose or XML layouts)
- Fully web-based (PWA-style)
- React Native

**Rationale**:
- ✅ Reuses HD Homey's existing responsive web UI (zero duplication)
- ✅ Native video player provides better performance and codec support
- ✅ Simplest architecture (minimal Android-specific code)
- ✅ UI updates automatically when HD Homey web app updates
- ✅ Aligns with constitution's "Simplicity First" principle

**Tradeoffs**:
- ❌ WebView has some performance overhead vs native UI
- ❌ D-pad navigation requires CSS/JS injection
- ✅ Acceptable: Most UI interactions are browsing, not real-time (video is native anyway)

### Why AndroidX Media3 instead of deprecated ExoPlayer?
**Decision**: Use Media3 1.9.0+ for video playback

**Rationale**:
- ✅ ExoPlayer is deprecated (last release 2.19.1)
- ✅ Media3 is actively maintained by Google (part of AndroidX/Jetpack)
- ✅ Same API as ExoPlayer (migration path for existing knowledge)
- ✅ Better codec support and performance optimizations
- ✅ Aligns with "modern stack" principle from constitution

### Why MPEG-2 with HLS Fallback?
**Decision**: Try MPEG-2 TS first, fall back to HLS transcoding

**Alternatives Considered**:
- Always use HLS transcoding
- Always use MPEG-2 (no fallback)

**Rationale**:
- ✅ MPEG-2 has lower latency (no transcoding delay)
- ✅ MPEG-2 reduces server load (no CPU for transcoding)
- ✅ Most modern Android TV devices support MPEG-2
- ✅ HLS fallback ensures compatibility with all devices
- ✅ Automatic detection means best experience for each device

**Tradeoffs**:
- ❌ Requires implementing fallback logic
- ✅ Acceptable: One-time detection, then cached preference

### Why Device Code + QR for Authentication?
**Decision**: Support multiple auth methods (QR/code/password)

**Alternatives Considered**:
- Username/password only
- QR code only
- Device code only

**Rationale**:
- ✅ QR code is fastest (1-2 seconds with phone camera)
- ✅ Device code works if QR scanner fails
- ✅ Username/password fallback for edge cases
- ✅ Typing passwords on TV remote is painful - avoid when possible
- ✅ Matches UX of popular streaming apps (Netflix, YouTube TV, Disney+)

### Why Universal App (not separate TV/mobile apps)?
**Decision**: Single APK works on TV, tablet, and phone

**Alternatives Considered**:
- Separate Android TV app and mobile app
- TV-only app

**Rationale**:
- ✅ One codebase = less maintenance
- ✅ WebView UI is already responsive (works on any screen size)
- ✅ Video player is device-agnostic
- ✅ Single Play Store listing (better discoverability)
- ✅ Aligns with "Simplicity First" - don't maintain two apps

**Tradeoffs**:
- ❌ Slightly larger APK size (includes TV + mobile layouts)
- ✅ Acceptable: APK size < 10MB, not a concern

### Why Android 9+ (API 28)?
**Decision**: Minimum SDK version 28 (Android 9)

**Alternatives Considered**:
- Android 11+ (API 30) - more modern
- Android 7+ (API 24) - wider reach

**Rationale**:
- ✅ Covers ~95% of Android devices (as of 2024)
- ✅ Media3 supports API 21+, so 28 is safe
- ✅ Most Android TV devices from 2018+ run Android 9+
- ✅ Avoids legacy WebView issues in Android 7-8
- ✅ Balances compatibility with modern APIs

## Open Questions

- [x] **Q1**: Should app support multiple HD Homey servers (home + vacation house)?
  **A**: Not in v1. User can manually switch server URL in settings. Future enhancement.

- [x] **Q2**: Should app cache channel list for offline viewing of metadata?
  **A**: Not in v1. App requires internet for live streaming anyway. Future optimization.

- [x] **Q3**: Should app integrate with Android TV home screen (recommendations row)?
  **A**: Out of scope for v1. Complex integration, diminishing returns for niche app.

- [x] **Q4**: Should app support Picture-in-Picture (PiP)?
  **A**: Out of scope for v1. Nice-to-have feature for v2.

- [ ] **Q5**: Should app support Fire TV (Amazon's Android fork)?
  **A**: Deferred. Fire TV is similar to Android TV but requires separate testing and potentially minor code changes. Evaluate after Android TV v1 success.

- [ ] **Q6**: Should app track analytics (crashes, usage patterns)?
  **A**: TBD. If yes, use privacy-respecting analytics (Firebase Crashlytics for crashes only, no user tracking without consent).

## References

- **AndroidX Media3 Documentation**: https://developer.android.com/media/media3
- **Android TV Development Guide**: https://developer.android.com/tv/start
- **Android WebView Security**: https://developer.android.com/develop/ui/views/layout/webapps/webview
- **Android Keystore**: https://developer.android.com/privacy-and-security/keystore
- **ZXing (QR Codes)**: https://github.com/zxing/zxing
- **HD Homey Specs**:
  - SPEC-002: Channel Streaming
  - SPEC-003: User Authentication
  - SPEC-005: Video Transcoding
  - SPEC-012: Channel Favorites
- **Android TV Samples**: https://github.com/android/tv-samples

---

**Version**: 1.0 | **Created**: 2025-12-07 | **Last Updated**: 2025-12-07

*This specification is ready for clarification phase. Next steps: Resolve any ambiguities, then hand off to modern-architect-engineer for implementation planning.*
