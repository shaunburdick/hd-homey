# Feature Specification: Android App for TV, Phone, and Tablet

**Feature ID**: `013-android-app`  
**Created**: 2025-12-07  
**Status**: Implemented (Phase 2) | 2026-06-29  
**Owner**: HD Homey Core Team  
**Version**: 1.4  
**Dependencies**: Phase 0 (Repository Reorganization) - ✅ COMPLETE

## Overview

The HD Homey Android app brings live TV streaming to Android TV devices, phones, and tablets through a universal native application. The app is built with a fully native MVVM architecture: Phase 1 delivered native fragments for server management and device pairing, and Phase 2 adds native channel browsing (RecyclerView), ViewModels for state management, and AndroidX Media3 ExoPlayer for video playback. The app supports multiple authentication methods (QR code, device code, username/password), automatic server discovery, and graceful fallback from MPEG-2 to HLS transcoding based on device capabilities.

**NOTE**: Phase 0 (Repository Reorganization) is ✅ COMPLETE. The monorepo structure (`apps/web/`, `apps/android/`, `apps/docs/`) is live on `main`.

## Current Status (December 14, 2025)

### ✅ Phase 0: Repository Reorganization - COMPLETE
- Repository restructured into monorepo (`apps/web/`, `apps/android/`, `apps/docs/`)
- All tests passing, Docker working, CI/CD updated
- Documentation updated with new paths

### ✅ Phase 1: Multi-Server Management & Device Pairing - COMPLETE & MERGED
**Duration**: December 7-13, 2025 (7 days)  
**Branch**: `013-android-app` (squash merged to `main`)  
**Location**: `apps/android/` (Kotlin, Android 12+, Target SDK 35)

**Features Implemented**:
- ✅ Multi-server management (add/edit/delete servers)
- ✅ OAuth 2.0 device code pairing (6-character codes)
- ✅ JWT token storage with encrypted SharedPreferences
- ✅ Professional HD Homey branding (app icon, TV banner, launch screen)
- ✅ Polished 10-foot UI with animations and shimmer loaders
- ✅ Comprehensive error handling (retry, cancel, network resilience)
- ✅ Android TV optimized (D-pad navigation, focus management)
- ✅ 86 unit tests with 100% data layer coverage
- ✅ Lint clean (0 errors), 20MB APK

**Technical Stack**:
- Kotlin 2.1.0, Gradle 8.13, Target SDK 35 (Android 15), Min SDK 31 (Android 12)
- Architecture: Simplified Repository Pattern (ViewModels and DataStore coming in Phase 2)
- Testing: JUnit 4, Truth assertions, Robolectric, MockK
- Dependencies: OkHttp 4.12.0, Kotlinx Serialization 1.7.3, Material Components 1.12.0
- Networking: Direct OkHttp (no Retrofit yet)

**Documentation**:
- `apps/android/README.md` - Project overview and Phase 1 achievements
- `apps/android/SETUP.md` - Development setup guide
- `apps/android/DEVELOPMENT.md` - Architecture and patterns
- `apps/android/MANUAL-TEST-GUIDE.md` - Manual testing scenarios
- `specs/013-android-app-phase1/PHASE1-SUMMARY.md` - Comprehensive Phase 1 summary
- `specs/013-android-app-phase1/archive/` - Phase completion documents

**Phase 1 Learnings**:
- Simplified architecture (no ViewModels) accelerated development
- Robolectric enabled fast unit tests without emulator
- D-pad navigation required careful focus management in XML layouts
- SharedPreferences + JSON worked well but DataStore will improve type safety
- Backend device pairing API integration was seamless
- 100% data layer test coverage caught bugs early

### 🚧 Phase 2: Channel Browsing & Streaming - READY TO START
**Branch**: `013-android-app-phase2` (created from `main`)  
**Estimated Duration**: 3-4 weeks

**Planned Features**:
- Fetch channel lineup from authenticated servers
- Display channels with TV-optimized UI (D-pad navigable)
- AndroidX Media3 (ExoPlayer) video playback
- HLS stream playback with automatic quality selection
- Stream URL generation with HMAC tokens
- Channel favorites integration (read from web app preferences)
- Channel metadata display (name, number, logo)

**Architecture Evolution (Phase 2)**:
- Introduce ViewModels for UI state management
- Add Use Cases for business logic separation
- Migrate from SharedPreferences to DataStore
- Add Retrofit for cleaner API calls (optional)
- Add Coil for image loading (channel logos)

**Prerequisites (Already Complete)**:
- ✅ Authentication flow (JWT tokens stored)
- ✅ Server management (active server selection)
- ✅ Backend channel lineup API (`GET /api/lineup.json`)
- ✅ Backend HLS transcoding API (`/api/transcode/...`)
- ✅ Backend stream authentication (HMAC tokens)

## Problem Statement

### User Problems (Android Experience)
HD Homey currently requires users to access the web interface through browsers, which creates several limitations:
- **Android TV users** must navigate with browser-based interfaces not optimized for D-pad/remote control
- **Mobile users** lack a native app experience with proper video player integration
- **10-foot interface** (TV viewing) requires different UX than web browser provides
- **Video playback** relies on HTML5 video, which has codec limitations and performance issues
- **Authentication** through browser on TV requires painful on-screen keyboard typing

An Android app solves these problems by providing native video playback, optimized TV navigation, and streamlined authentication.

### Technical Problem (Repository Structure)
The current HD Homey repository is structured as a single-app project with all code at the root level. Adding an Android app requires reorganizing into a **monorepo structure** to:
- Separate concerns between web backend and Android client
- Enable independent versioning and releases
- Provide clear boundaries between platform-specific code
- Scale to future platforms (iOS, desktop, etc.)

**Phase 0** addresses the repository reorganization prerequisite before Android development begins.

---

## Phase 0: Repository Reorganization — ✅ COMPLETE

Phase 0 reorganized the repository into a monorepo (`apps/web/`, `apps/android/`, `apps/docs/`) and is fully complete as of December 2025. All tests pass, Docker works, and CI/CD workflows are updated. See the **Current Status** section at the top of this document and `specs/013-android-app-phase1/PHASE1-SUMMARY.md` for full details. No further action required.

---

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
- **FR-002**: App MUST display channel lineup in a native RecyclerView (not a WebView)
- **FR-003**: App MUST use native AndroidX Media3 player for video playback (not HTML5 video)
- **FR-004**: App MUST use MVVM architecture (ViewModels + Use Cases) for Phase 2 channel browsing
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
- **FR-023**: App MUST support D-pad navigation natively (RecyclerView focus management, no CSS injection)
- **FR-024**: App MUST handle back button navigation correctly across screens

#### Features (from Web UI)
- **FR-025**: App SHOULD display channel favorites (starred channels) at top of list
- **FR-026**: App SHOULD respect hidden channel preferences
- **FR-027**: App SHOULD support channel search/filtering
- **FR-028**: App SHOULD organize channels by tuner with expand/collapse sections

### Non-Functional Requirements

#### Performance
- **NFR-001**: Video playback MUST start within 3 seconds of channel selection
- **NFR-002**: Channel list MUST load within 2 seconds of screen display (on good network)
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
- **NFR-011**: App MUST recover from player crashes without losing session
- **NFR-012**: App MUST validate all API inputs (channel IDs, stream URLs)

#### Security
- **NFR-013**: App MUST store credentials in Android Keystore (not SharedPreferences)
- **NFR-014**: App MUST use HTTPS for remote connections
- **NFR-015**: App MUST validate SSL certificates (no self-signed cert bypass in production)
- **NFR-016**: App MUST validate all API responses and sanitize stream URLs before use

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

### Repository Structure (Post Phase 0)
- **Location**: Android app MUST be located at `apps/android/` in monorepo
- **Independence**: Android app MUST be completely independent (no shared TypeScript packages)
- **Web App**: HD Homey backend MUST be at `apps/web/`
- **Build Isolation**: Android Gradle build MUST NOT depend on npm workspaces
- **CI/CD**: Android MUST have separate GitHub Actions workflow for APK builds

### Platform Requirements
- **Minimum Android Version**: Android 9 (Pie, API level 28)
- **Target Android Version**: Android 15 (API level 35)
- **HD Homey Version**: Requires HD Homey 1.1.0+ for device pairing API

### Development Stack
- **Language**: Kotlin 2.1.0 (matches Phase 1 implementation)
- **Build System**: Gradle 8.0+ with Android Gradle Plugin 8.0+
- **IDE**: Android Studio Hedgehog (2023.1.1) or newer

### Key Libraries
- **AndroidX Media3**: 1.9.0+ (video playback, replaces deprecated ExoPlayer)
  - `androidx.media3:media3-exoplayer:1.9.0`
  - `androidx.media3:media3-ui:1.9.0`
- **WebView**: Android System WebView (built-in)
- **Networking**: OkHttp 4.12.0+ for HTTP client
- **Coroutines**: Kotlinx Coroutines 1.9.0+ for async operations
- **JSON Parsing**: Kotlinx Serialization 1.6.0+
- **Dependency Injection**: Dagger Hilt 2.50+ (optional but recommended)
- **QR Code Generation**: ZXing 3.5.3+ (client-side QR generation)
- **mDNS Discovery**: Android NSD (Network Service Discovery, built-in)

### Architecture Constraints
- **Native MVVM Architecture**: Phase 2 uses ViewModels, Use Cases, and Repositories (no WebView)
- **Single Activity**: Use single Activity with Fragment navigation (modern Android pattern)
- **No WebView for Channel Browsing**: Channel list is a native RecyclerView, not a WebView
- **No Shared Code**: Android and web apps share NO code (different languages - Kotlin vs TypeScript)
- **Native Video Playback**: Media3 ExoPlayer called directly from ViewModels (no JavaScript bridge)
- **Phase 1 Pattern**: Simplified Repository Pattern (no ViewModels) — ViewModels introduced in Phase 2

### HD Homey Backend Dependencies

**Authentication Note — Cookie-Based Auth Required**: HD Homey uses Better-Auth with JWT sessions stored in HTTP-only cookies (`Cookie: better-auth.session_token=<TOKEN>`). The backend does **not** support `Authorization: Bearer` headers. Android app API calls must include the session token as a cookie header via an OkHttp interceptor. See `specs/013-android-app-phase2/WHY-COOKIE-AUTH.md` for full rationale and implementation examples.

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

### Network Security
- **MUST** use HTTPS for remote connections (Android Network Security Config)
- **MUST** validate SSL certificates (no self-signed bypass in production)
- **MUST** use OkHttp cookie interceptor for Better-Auth session tokens (see cookie auth note above)
- **MUST** validate all stream URLs before passing to ExoPlayer

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

### Player Crashes
- **Scenario**: ExoPlayer crashes due to codec issue or memory pressure
- **Handling**: 
  - Catch player errors via `Player.Listener.onPlayerError()`
  - Exit PlayerActivity gracefully and return to ChannelListFragment
  - Restore session (session token still valid in storage)
  - Notify user: "Playback failed. Please try again."

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
- [ ] Channel list loads in < 2 seconds
- [ ] Video starts playing in < 3 seconds
- [ ] Memory usage < 150MB during video playback
- [ ] No ANR (Application Not Responding) errors during testing

## Dependencies

### CRITICAL Prerequisite
- **Phase 0: Repository Reorganization** — ✅ COMPLETE (merged to main, December 2025)
  - Monorepo structure is live: `apps/web/`, `apps/android/`, `apps/docs/`
  - All tests passing, Docker working, CI/CD updated

### Depends On (Backend Features)
- **SPEC-002**: Channel Streaming (app consumes `/stream` endpoint)
- **SPEC-003**: User Authentication (app uses JWT sessions from Better-Auth)
- **SPEC-005**: Video Transcoding (app falls back to HLS when needed)
- **SPEC-012**: Channel Favorites (app displays favorites in native channel list)
- **NEW**: HD Homey 1.1.0 device pairing backend (must be implemented)
  - `/api/auth/device/code` - Generate device pairing codes
  - `/api/auth/device/poll` - Poll for authorization status
  - `/pair` - Web page for code entry and authorization

### Blocks
- None (Android app is parallel effort to web development after Phase 0)

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

### Monorepo Context

After Phase 0 reorganization, the project structure will be:

```
hd-homey/ (monorepo root)
├── apps/
│   ├── web/              # Next.js backend + web UI
│   │   ├── src/
│   │   ├── Dockerfile
│   │   └── package.json
│   ├── android/          # Android app (THIS SPEC)
│   │   ├── app/
│   │   ├── gradle/
│   │   └── build.gradle.kts
│   └── docs/             # VitePress documentation
├── migrations/           # Database migrations (used by apps/web)
└── package.json          # Root workspace
```

**Key Relationships**:
- Android app (`apps/android/`) is **completely independent** from web app
- No shared code between Kotlin (Android) and TypeScript (web)
- Android calls web API endpoints for auth, channel lineup, streaming, and device pairing (no WebView)
- Build systems are separate: Gradle (Android) vs npm (web)

### High-Level Architecture

> **Note**: Phase 1 used a simplified Repository Pattern (no ViewModels). Phase 2 introduces full MVVM. There is **no WebView** in the channel browsing flow — the channel list is a native RecyclerView.

```
┌─────────────────────────────────────────────────────────┐
│     HD Homey Android App (apps/android/)                │
│                                                         │
│  ┌───────────────────────────────────────────────────┐  │
│  │          MainActivity (Single Activity)           │  │
│  │                                                   │  │
│  │  Phase 1 Fragments (complete):                   │  │
│  │  - ServerListFragment (server management)        │  │
│  │  - AddServerFragment (add/edit server)           │  │
│  │  - AuthenticationFragment (device pairing/login) │  │
│  │  - SuccessFragment (post-auth confirmation)      │  │
│  │                                                   │  │
│  │  Phase 2 Fragments (to implement):               │  │
│  │  - ChannelListFragment (RecyclerView, ViewModel) │  │
│  │  - PlayerActivity (full-screen Media3 player)    │  │
│  └───────────────────────────────────────────────────┘  │
│                      ↕ ViewModels + Use Cases           │
│  ┌───────────────────────────────────────────────────┐  │
│  │         Repository Layer (Phase 2)               │  │
│  │  - ChannelRepository (fetches channel lineup)    │  │
│  │  - ServerRepository (manages saved servers)      │  │
│  │  - StreamRepository (generates stream URLs)      │  │
│  └───────────────────────────────────────────────────┘  │
│                      ↕ HTTPS/HTTP (Cookie auth)         │
│  ┌───────────────────────────────────────────────────┐  │
│  │       AndroidX Media3 ExoPlayer (Native)         │  │
│  │  - Launched via PlayerActivity (not a Fragment)  │  │
│  │  - Plays: MPEG-2 TS or HLS                       │  │
│  │  - Controls: Play/Pause/Seek                     │  │
│  │  - Called directly from ViewModel (no JS bridge) │  │
│  └───────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
                         ↕ HTTPS/HTTP
┌─────────────────────────────────────────────────────────┐
│     HD Homey Server (apps/web/) - Next.js Backend      │
│  - /api/auth/device/code (device pairing)              │
│  - /api/auth/device/poll (pairing status)              │
│  - /pair (pairing web page)                            │
│  - /api/lineup.json (channel list)                     │
│  - /tuners/[id]/channel/[channel_id]/stream (MPEG-2)   │
│  - /api/transcode/.../playlist.m3u8 (HLS fallback)     │
└─────────────────────────────────────────────────────────┘
```

### Key Components

#### Phase 1 Components (Complete)

#### 1. MainActivity (Single Activity Pattern)
- Hosts all fragments via Navigation Component
- Manages navigation between setup → auth → server list → channel list → player
- Handles device type detection (TV/tablet/phone)
- Manages Android TV D-pad focus handling

#### 2. ServerListFragment
- Displays saved HD Homey servers
- Add/edit/delete server management
- Active server selection
- Stores server data in encrypted SharedPreferences

#### 3. AddServerFragment
- Manual server URL entry and validation
- Server connectivity check
- Edit existing server configuration

#### 4. AuthenticationFragment
- Displays pairing options (QR/device code/username-password)
- Generates QR code locally using ZXing
- Polls backend for device code authorization
- Handles username/password login as fallback
- Stores session token in Android Keystore / encrypted SharedPreferences

#### 5. SuccessFragment
- Post-authentication confirmation screen
- Transitions user to server/channel list

#### Phase 2 Components (To Implement)

#### 6. ChannelListFragment (Phase 2)
- Native RecyclerView displaying channel lineup (not a WebView)
- Bound to ChannelListViewModel for state management
- D-pad navigable rows; touch support on phone/tablet
- Channel metadata: name, number, logo (Coil for image loading)
- Favorites and hidden channel filtering

#### 7. ChannelListViewModel (Phase 2)
- Fetches channel lineup via ChannelRepository
- Exposes UI state (loading, error, channel list) as StateFlow
- Handles channel selection → triggers player launch
- Manages favorites state

#### 8. PlayerActivity (Phase 2)
- Separate Activity for full-screen Media3 ExoPlayer playback
- Receives stream URL and channel metadata via Intent extras
- Tries MPEG-2 first; falls back to HLS on decoder error
- Provides standard video controls (play/pause/seek)
- Returns to ChannelListFragment on back button

### Video Playback Flow

```
User selects channel in native RecyclerView
       ↓
ChannelListViewModel handles selection event
       ↓
StreamRepository generates HMAC stream token via API
       ↓
PlayerActivity launched with stream URL as Intent extra
       ↓
PlayerActivity creates Media3 ExoPlayer
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

5. App stores session token in encrypted SharedPreferences
   Navigates to ChannelListFragment (Phase 2) or ServerListFragment (Phase 1)
```

## Distribution & Release Strategy

### Phase 0: Repository Reorganization — ✅ COMPLETE
- **Timeline**: Completed December 2025
- **Deliverable**: Monorepo structure with `apps/android/` directory — live on `main`
- **Status**: All tests passing, Docker working, CI/CD updated

### Phase 1: Alpha Testing (v0.1-alpha)
- **Distribution**: GitHub Releases (APK download)
- **Target Audience**: Early adopters, developers, testers
- **Goal**: Validate core functionality, gather initial feedback
- **Timeline**: 2-4 weeks of development, 2 weeks of testing
- **Build**: GitHub Actions workflow for APK building in `apps/android/`

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
- Built from `apps/android/` via GitHub Actions
- Separate release versioning from web app (web: v1.0.0-beta.5, android: v0.1-alpha)
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

### Why Fully Native Architecture (Not WebView)?
**Decision**: Use native XML layouts, RecyclerView, and MVVM — no WebView for channel browsing

> **v1.4 Note**: The original spec proposed a WebView-hybrid approach. Phase 1 implementation chose fully native fragments instead, and Phase 2 continues that decision with MVVM + RecyclerView. The WebView approach was abandoned before any code was written.

**Alternatives Considered**:
- WebView loading HD Homey web UI (original proposal — not implemented)
- Jetpack Compose (deferred; XML layouts are simpler for TV D-pad support)
- React Native (rejected — unnecessary complexity)

**Rationale**:
- ✅ Native RecyclerView provides significantly better D-pad navigation and focus management
- ✅ Native UI gives precise control over TV 10-foot experience
- ✅ No JavaScript bridge security concerns
- ✅ Better performance without WebView overhead
- ✅ MVVM with ViewModels is the standard Android architecture pattern
- ✅ Aligns with constitution's "Simplicity First" and "Code Quality" principles

**Tradeoffs**:
- ❌ UI does not automatically pick up web app UI changes
- ✅ Acceptable: Android TV UX requirements differ fundamentally from web UI anyway

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
- ✅ Native layouts adapt to screen size via ConstraintLayout and resource qualifiers
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
- ✅ Avoids legacy Android security and API issues in Android 7-8
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

## Clarifications Applied

### v1.1 - Monorepo Reorganization (2025-12-07)
**Context**: Initial spec (v1.0) didn't account for repository structure changes needed to support Android app alongside existing web app.

**Questions Answered**:
1. **Q**: How should repository be structured to support multiple apps?
   **A**: Full monorepo reorganization (Option A) with `apps/web/`, `apps/android/`, `apps/docs/`

2. **Q**: Should Android and web share TypeScript code?
   **A**: No shared packages - keep it simple (different languages, minimal API surface)

3. **Q**: What should the Next.js app directory be named?
   **A**: `apps/web/` (emphasizes web interface)

4. **Q**: How should workspace scripts be organized?
   **A**: Hybrid approach - shortcuts for common tasks (`npm run dev`) + explicit options (`npm run docs:dev`)

5. **Q**: How should Docker builds work in monorepo?
   **A**: Per-app Dockerfiles (`apps/web/Dockerfile`) with app-specific build context

**Changes Made**:
- Added **Phase 0: Repository Reorganization** as critical prerequisite
- Updated **Technical Constraints** to include repository structure requirements
- Updated **Architecture Overview** to show monorepo context and app locations
- Updated **Dependencies** section to list Phase 0 as critical prerequisite
- Updated **Distribution & Release Strategy** to include Phase 0 timeline
- Documented monorepo decisions and rationale throughout spec

**Impact**: Android development CANNOT begin until Phase 0 (repository reorganization) is completed. This is now explicit in the specification.

---

## Specification Change Log

### v1.4 - Pre-Phase 2 Spec Audit (2026-06-23)
**Status Update**: Pre-implementation audit resolved spec/plan inconsistencies.

**Changes Made**:
- Corrected architecture description from WebView-hybrid to native MVVM
- Updated Kotlin version from 2.2.21+ → 2.1.0 (matches actual implementation)
- Updated Target SDK from 34 → 35 (matches actual build.gradle.kts)
- Updated Constitution to remove "Mobile Applications" out-of-scope conflict (now "iOS Applications")
- Condensed Phase 0 (Repository Reorganization) section — complete, replaced 160-line requirements with brief completion note
- Noted cookie-based auth requirement (backend uses Better-Auth cookies, not Bearer tokens); references `specs/013-android-app-phase2/WHY-COOKIE-AUTH.md`
- Added Kotlinx Coroutines 1.9.0 to Key Libraries
- Updated FR-002, FR-004, FR-023 to remove WebView/JS bridge references
- Updated NFR-011, NFR-012, NFR-016 to remove WebView-specific requirements
- Replaced "WebView Security" section with "Network Security" section
- Updated "WebView Crashes" edge case to "Player Crashes"
- Updated Key Components section: Phase 1 native fragments (ServerList, AddServer, Authentication, Success), Phase 2 MVVM components (ChannelListFragment, ViewModel, PlayerActivity)
- Updated Technical Decisions: replaced "Why Hybrid WebView?" with "Why Fully Native Architecture?"
- Updated Dependencies section: Phase 0 marked complete, SPEC-012 no longer references WebView

### v1.3 - Phase 1 Merged, Phase 2 Ready (2025-12-14)
**Status Update**: Phase 1 complete, merged to main, and Phase 2 directory structure created.

**Changes Made**:
- Updated status from "Phase 2 In Progress" to "Phase 1 Complete & Merged | Phase 2 Ready"
- Documented Phase 1 merge details (squash merge to main, 323 files, +24,331 lines)
- Added Phase 1 learnings section (simplified architecture, Robolectric, D-pad focus)
- Created comprehensive Phase 1 summary (`specs/013-android-app-phase1/PHASE1-SUMMARY.md`)
- Archived all Phase 1 completion documents
- Created Phase 2 directory structure (`specs/013-android-app-phase2/`)
- Updated technical stack details (Kotlinx Serialization, Truth assertions, MockK)
- Documented Phase 2 architecture evolution plans (ViewModels, DataStore, Retrofit, Coil)

**Phase 1 Success Metrics**:
- ✅ All 86 tests passing (0 failures)
- ✅ 100% data layer coverage (Repository, Services, Preferences, Validators)
- ✅ Lint clean (0 errors)
- ✅ 20MB APK (debug build)
- ✅ Squash merged to main
- ✅ Branch: `013-android-app-phase2` created from main

**Next Phase**: Phase 2 will implement channel browsing, AndroidX Media3 video playback, HLS streaming, and channel favorites integration.

### v1.2 - Phase 1 Complete (2025-12-13)
**Status Update**: Phase 1 (Multi-Server Management & Device Pairing) is complete and production-ready.

**Changes Made**:
- Updated status from "Specification Phase" to "Phase 1 Complete | Phase 2 In Progress"
- Added "Current Status" section with Phase 0 and Phase 1 achievements
- Documented Phase 1 technical stack and architecture (Kotlin, Repository Pattern, 86 tests)
- Noted Phase 2 next steps (channel browsing, streaming, ExoPlayer)
- Confirmed all Phase 1 deliverables: multi-server, device pairing, branding, polish, testing

**Phase 1 Deliverables Met**:
- ✅ Multi-server management with persistent storage
- ✅ OAuth 2.0 device code pairing (6-character codes, 5-minute expiry)
- ✅ JWT token storage with encryption
- ✅ Professional branding (icon, TV banner, shimmer loaders)
- ✅ Error handling with retry/cancel flows
- ✅ Android TV optimization (D-pad, 10-foot UI)
- ✅ Comprehensive testing (86 tests, 100% data layer coverage)
- ✅ Documentation (README, SETUP, DEVELOPMENT, MANUAL-TEST-GUIDE)

**Next Phase**: Phase 2 will add channel browsing, video playback (Media3/ExoPlayer), channel favorites, and HLS streaming with HMAC authentication.

### v1.1 - Monorepo Reorganization (2025-12-07)
**Context**: Initial spec (v1.0) didn't account for repository structure changes needed to support Android app alongside existing web app.

**Questions Answered**:
1. **Q**: How should repository be structured to support multiple apps?
   **A**: Full monorepo reorganization (Option A) with `apps/web/`, `apps/android/`, `apps/docs/`

2. **Q**: Should Android and web share TypeScript code?
   **A**: No shared packages - keep it simple (different languages, minimal API surface)

3. **Q**: What should the Next.js app directory be named?
   **A**: `apps/web/` (emphasizes web interface)

4. **Q**: How should workspace scripts be organized?
   **A**: Hybrid approach - shortcuts for common tasks (`npm run dev`) + explicit options (`npm run docs:dev`)

5. **Q**: How should Docker builds work in monorepo?
   **A**: Per-app Dockerfiles (`apps/web/Dockerfile`) with app-specific build context

**Changes Made**:
- Added **Phase 0: Repository Reorganization** as critical prerequisite
- Updated **Technical Constraints** to include repository structure requirements
- Updated **Architecture Overview** to show monorepo context and app locations
- Updated **Dependencies** section to list Phase 0 as critical prerequisite
- Updated **Distribution & Release Strategy** to include Phase 0 timeline
- Documented monorepo decisions and rationale throughout spec

**Impact**: Android development CANNOT begin until Phase 0 (repository reorganization) is completed. This is now explicit in the specification.

---

**Version**: 1.4 | **Created**: 2025-12-07 | **Last Updated**: 2026-06-23

*Phase 1 merged to main! Phase 2 (channel browsing & streaming) ready to begin on branch `013-android-app-phase2`. Architecture: fully native MVVM — no WebView.*
