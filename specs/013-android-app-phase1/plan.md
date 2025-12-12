# Implementation Plan: Android App Phase 1 - Foundation & Authentication

**Feature ID**: `013-android-app-phase1`  
**Created**: 2025-12-12  
**Status**: 📋 Planning  
**Parent Spec**: `.specify/features/013-android-app.md`  
**Dependencies**: Phase 0 (Monorepo Reorganization) - ✅ Complete

---

## Overview

Phase 1 establishes the Android app foundation with core architecture, server discovery, and device authentication. This phase creates a working app that can connect to HD Homey and authenticate, but does not yet implement video playback or channel browsing (those are Phase 2).

**Goal**: By end of Phase 1, users can install the app, discover their HD Homey server, and authenticate using device code pairing.

---

## What We're Building

### 1. Android Project Initialization
- **Location**: `apps/android/`
- **Build System**: Gradle 8.9+ with Kotlin DSL
- **Language**: Kotlin 2.1.0+
- **Min SDK**: 28 (Android 9)
- **Target SDK**: 34 (Android 14)
- **Project Structure**: Standard Android app with single Activity

### 2. Core Architecture
- **Pattern**: Single Activity + Fragment navigation
- **Navigation**: AndroidX Navigation Component
- **DI**: Dagger Hilt (deferred to Phase 2 for simplicity)
- **Networking**: OkHttp 4.12.0+ with Kotlin Coroutines

### 3. Key Fragments (Phase 1 Scope)
1. **ServerSetupFragment** - mDNS discovery + manual URL entry
2. **AuthenticationFragment** - Device code pairing flow
3. **SuccessFragment** - "You're connected!" placeholder (actual UI comes in Phase 2)

### 4. Backend Requirements (HD Homey 1.1.0)
Must implement device pairing API in Next.js backend:
- `POST /api/auth/device/code` - Generate pairing code
- `GET /api/auth/device/poll?code=XXX` - Check authorization status
- `GET /pair` - Web page for code entry
- JWT token storage in Android Keystore

---

## Technical Context

### Platform
- **Android**: Kotlin-based native Android app
- **Min SDK**: 28 (Android 9 Pie) - ~95% device coverage
- **Target SDK**: 34 (Android 14)
- **Form Factors**: Android TV, tablets, phones (universal app)

### Dependencies (apps/android/)
```gradle
// Core Android
androidx.core:core-ktx:1.15.0+
androidx.appcompat:appcompat:1.7.0+
androidx.constraintlayout:constraintlayout:2.2.0+

// Navigation
androidx.navigation:navigation-fragment-ktx:2.8.0+
androidx.navigation:navigation-ui-ktx:2.8.0+

// Lifecycle
androidx.lifecycle:lifecycle-viewmodel-ktx:2.8.0+
androidx.lifecycle:lifecycle-livedata-ktx:2.8.0+

// Networking
com.squareup.okhttp3:okhttp:4.12.0+
org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.0+

// Android TV (Leanback)
androidx.leanback:leanback:1.2.0-alpha04+

// mDNS Discovery (Android NSD - built-in)
// No dependency needed - uses android.net.nsd.*

// Security (Android Keystore - built-in)
androidx.security:security-crypto:1.1.0-alpha06+

// Testing
junit:junit:4.13.2
androidx.test.ext:junit:1.2.1
androidx.test.espresso:espresso-core:3.6.1
```

### Backend Dependencies (HD Homey)
Must implement in `apps/web/`:
- Device pairing API endpoints
- Pairing web page
- JWT token validation for device-paired sessions

---

## Architecture Decisions

### AD-1: Single Activity Pattern
**Decision**: Use single `MainActivity` with Fragment navigation

**Rationale**:
- Modern Android best practice (replaces multi-Activity apps)
- Easier navigation management with Navigation Component
- Better for sharing ViewModels between screens
- Simplifies deep linking (future)

**Alternatives Considered**:
- Multi-Activity: Outdated, harder to manage state
- Jetpack Compose: Too complex for WebView-heavy app

**Tradeoff**: Learning curve for traditional Activity developers
**Acceptance**: Standard pattern, well-documented

---

### AD-2: Kotlin Coroutines for Async Operations
**Decision**: Use Kotlin Coroutines for network calls, not callbacks

**Rationale**:
- Native Kotlin async/await pattern (cleaner than callbacks)
- Integrates with AndroidX Lifecycle (viewModelScope)
- Better error handling (try/catch vs callback hell)
- Cancel operations automatically when Fragment destroyed

**Alternatives Considered**:
- RxJava: More complex, heavier dependency
- Callbacks: Harder to read, prone to memory leaks

**Tradeoff**: Requires coroutine knowledge
**Acceptance**: Industry standard for Kotlin Android

---

### AD-3: No Shared Code Between Android and Web
**Decision**: Android (Kotlin) and Web (TypeScript) share NO code

**Rationale**:
- Different languages (Kotlin vs TypeScript)
- Different platforms (Android SDK vs Browser APIs)
- Minimal API surface (just REST endpoints)
- Aligns with constitution: "Simplicity First"

**Alternatives Considered**:
- Kotlin Multiplatform (KMP): Overkill for our use case
- React Native: Doesn't fit WebView + native video architecture

**Tradeoff**: Some API contract duplication
**Acceptance**: Clean separation, easier to maintain

---

### AD-4: Device Code Pairing (Primary Auth Method)
**Decision**: Implement device code pairing as primary authentication for TV

**Rationale**:
- TV remote typing is painful (device code avoids this)
- Matches user expectations from Netflix, Disney+, YouTube TV
- QR code is even faster (Phase 2 enhancement)
- Better security than storing passwords on TV

**Alternatives Considered**:
- Username/password only: Bad UX on TV remote
- OAuth: Overkill for local network use case

**Tradeoff**: Requires backend changes
**Acceptance**: Worth the UX improvement

---

### AD-5: mDNS Discovery with Manual Fallback
**Decision**: Auto-discover `hd-homey.local` via mDNS, with manual URL entry fallback

**Rationale**:
- Zero-config setup for most users (local network)
- Manual fallback for edge cases (remote access, mDNS blocked)
- Native Android NSD API (no external dependencies)
- Improves first-run experience

**Alternatives Considered**:
- Manual only: More friction
- Cloud-based discovery: Out of scope, adds backend complexity

**Tradeoff**: mDNS not guaranteed to work (firewall, network issues)
**Acceptance**: Fallback covers edge cases

---

## Project Structure

```
apps/android/
├── app/
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/hdhomey/app/
│   │   │   │   ├── MainActivity.kt              # Single Activity
│   │   │   │   ├── ui/
│   │   │   │   │   ├── setup/
│   │   │   │   │   │   └── ServerSetupFragment.kt
│   │   │   │   │   ├── auth/
│   │   │   │   │   │   └── AuthenticationFragment.kt
│   │   │   │   │   └── success/
│   │   │   │   │       └── SuccessFragment.kt
│   │   │   │   ├── network/
│   │   │   │   │   ├── HdHomeyApi.kt           # API client
│   │   │   │   │   ├── DeviceCodeService.kt    # Device pairing logic
│   │   │   │   │   └── models/                 # Data classes
│   │   │   │   ├── discovery/
│   │   │   │   │   └── MdnsDiscovery.kt        # mDNS service
│   │   │   │   ├── storage/
│   │   │   │   │   ├── SecurePreferences.kt    # Android Keystore wrapper
│   │   │   │   │   └── AppPreferences.kt       # Server URL, etc.
│   │   │   │   └── util/
│   │   │   │       ├── DeviceTypeDetector.kt   # TV/Tablet/Phone detection
│   │   │   │       └── Constants.kt
│   │   │   ├── res/
│   │   │   │   ├── layout/                     # XML layouts
│   │   │   │   ├── navigation/
│   │   │   │   │   └── nav_graph.xml           # Navigation graph
│   │   │   │   ├── values/
│   │   │   │   │   ├── strings.xml
│   │   │   │   │   ├── themes.xml
│   │   │   │   │   └── dimens.xml
│   │   │   │   └── drawable/                   # Icons, images
│   │   │   └── AndroidManifest.xml
│   │   └── test/
│   │       └── java/com/hdhomey/app/
│   └── build.gradle.kts                        # App-level Gradle config
├── gradle/
│   └── libs.versions.toml                      # Version catalog
├── build.gradle.kts                            # Project-level Gradle config
├── settings.gradle.kts                         # Gradle settings
├── gradle.properties                           # Gradle properties
└── gradlew                                     # Gradle wrapper scripts
```

---

## Data Model

### Local Storage (Android)

#### AppPreferences (SharedPreferences)
```kotlin
data class ServerConfig(
    val serverUrl: String,           // e.g., "http://hd-homey.local:3000"
    val connectionType: ConnectionType, // LOCAL or REMOTE
    val lastConnected: Long          // Timestamp
)

enum class ConnectionType {
    LOCAL,    // http://hd-homey.local
    REMOTE    // https://homey.example.com
}
```

#### SecurePreferences (Android Keystore)
```kotlin
data class AuthToken(
    val jwt: String,                 // JWT session token
    val expiresAt: Long,             // Unix timestamp
    val userRole: String             // "admin" or "viewer"
)
```

### API Models (Network)

#### Device Code Flow
```kotlin
// POST /api/auth/device/code
data class DeviceCodeRequest(
    val deviceName: String,          // "Living Room TV", "John's Tablet"
    val deviceType: String           // "tv", "tablet", "phone"
)

data class DeviceCodeResponse(
    val code: String,                // "A8F2K9"
    val expiresAt: String,           // ISO 8601 timestamp
    val pairingUrl: String           // "http://hd-homey.local:3000/pair?code=A8F2K9"
)

// GET /api/auth/device/poll?code=A8F2K9
data class DevicePollResponse(
    val status: AuthStatus,          // PENDING, AUTHORIZED, EXPIRED, DENIED
    val token: String?,              // JWT (only if AUTHORIZED)
    val user: UserInfo?              // User details (only if AUTHORIZED)
)

enum class AuthStatus {
    PENDING,    // Waiting for user authorization
    AUTHORIZED, // User authorized device
    EXPIRED,    // Code expired (5 minutes)
    DENIED      // User denied authorization
}

data class UserInfo(
    val id: String,
    val username: String,
    val role: String                 // "admin" or "viewer"
)
```

---

## API Contracts

### Backend Endpoints (To Be Implemented in HD Homey 1.1.0)

#### 1. Generate Device Code
```http
POST /api/auth/device/code
Content-Type: application/json

Request:
{
  "deviceName": "Living Room TV",
  "deviceType": "tv"
}

Response (201 Created):
{
  "code": "A8F2K9",
  "expiresAt": "2025-12-12T12:35:00Z",
  "pairingUrl": "http://hd-homey.local:3000/pair?code=A8F2K9"
}

Errors:
- 500: Server error generating code
```

#### 2. Poll Authorization Status
```http
GET /api/auth/device/poll?code=A8F2K9

Response (200 OK) - Pending:
{
  "status": "pending"
}

Response (200 OK) - Authorized:
{
  "status": "authorized",
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_123",
    "username": "john",
    "role": "admin"
  }
}

Response (200 OK) - Expired:
{
  "status": "expired"
}

Response (200 OK) - Denied:
{
  "status": "denied"
}

Errors:
- 404: Invalid code
- 500: Server error
```

#### 3. Pairing Web Page
```http
GET /pair?code=A8F2K9

Response (200 OK):
HTML page with:
- Form to enter device code
- "Authorize Android TV?" confirmation
- User must be logged in (session required)

On approval:
- Marks code as authorized in backend
- Returns success page
```

---

## Implementation Phases (Phase 1 Breakdown)

### Phase 1.1: Project Setup (2-4 hours)
**Goal**: Create empty Android project in `apps/android/`

**Tasks**:
1. Initialize Android project with Android Studio
2. Configure `build.gradle.kts` with dependencies
3. Set up `libs.versions.toml` version catalog
4. Configure AndroidManifest.xml (permissions, theme)
5. Create basic MainActivity with empty layout
6. Verify app builds and runs (blank screen)

**Deliverable**: Empty Android app that launches

---

### Phase 1.2: Server Discovery (4-6 hours)
**Goal**: mDNS discovery + manual URL entry

**Tasks**:
1. Create `ServerSetupFragment` layout (XML)
2. Implement `MdnsDiscovery.kt` using Android NSD
3. Create "Discovering..." UI with spinner
4. Add manual URL entry form
5. Validate server connectivity (`GET /api/health`)
6. Store server URL in `AppPreferences`
7. Navigate to AuthenticationFragment on success

**Deliverable**: User can discover or manually enter HD Homey server URL

---

### Phase 1.3: Device Code Pairing (6-8 hours)
**Goal**: Display device code, poll for authorization, store JWT

**Tasks**:
1. Create `AuthenticationFragment` layout
2. Implement `DeviceCodeService.kt` (API client)
3. Call `POST /api/auth/device/code`
4. Display code prominently (large text for TV)
5. Poll `GET /api/auth/device/poll` every 3 seconds
6. Handle authorization statuses (pending, authorized, expired)
7. Store JWT in `SecurePreferences` (Android Keystore)
8. Navigate to SuccessFragment on authorized

**Deliverable**: User can authenticate using device code

---

### Phase 1.4: Backend Implementation (HD Homey 1.1.0) (6-10 hours)
**Goal**: Implement device pairing API in Next.js backend

**Tasks**:
1. Create device code storage (in-memory Map or database table)
2. Implement `POST /api/auth/device/code` endpoint
3. Implement `GET /api/auth/device/poll` endpoint
4. Create `/pair` Next.js page with form
5. Handle code validation and authorization
6. Generate JWT token for authorized devices
7. Add unit tests for endpoints
8. Update API documentation

**Deliverable**: Backend supports device pairing flow

---

### Phase 1.5: Navigation & Polish (3-5 hours)
**Goal**: Wire up navigation, error handling, polish UI

**Tasks**:
1. Set up Navigation Component with `nav_graph.xml`
2. Add error states (server unreachable, auth failed)
3. Add loading indicators
4. Handle back button navigation
5. Detect device type (TV/tablet/phone)
6. Apply Android TV theme (if TV detected)
7. Test on emulator (TV, tablet, phone)

**Deliverable**: Polished authentication flow with error handling

---

### Phase 1.6: Testing & Documentation (3-5 hours)
**Goal**: Unit tests, manual testing, documentation

**Tasks**:
1. Write unit tests for `DeviceCodeService`
2. Write unit tests for `MdnsDiscovery`
3. Manual testing on Android TV emulator
4. Manual testing on phone emulator
5. Document setup instructions in `apps/android/README.md`
6. Create user testing guide
7. Update CHANGELOG.md

**Deliverable**: Tested, documented Phase 1 implementation

---

## Acceptance Criteria

### Phase 1 Complete When:
- [ ] Android project builds successfully in `apps/android/`
- [ ] App launches on Android TV emulator
- [ ] App launches on phone emulator
- [ ] mDNS discovery finds HD Homey on local network
- [ ] Manual URL entry works
- [ ] Device code displayed prominently
- [ ] Polling detects authorization within 5 seconds
- [ ] JWT token stored securely in Android Keystore
- [ ] Backend endpoints return correct responses
- [ ] Error states handled gracefully
- [ ] All unit tests passing
- [ ] App works on Android 9+ (API 28+)

### User Stories Covered:
- ✅ **Story 1**: First-Time Setup on Android TV (device code method)
- ✅ **Story 5**: Automatic Server Discovery (mDNS)
- ⚠️ **Story 8**: Persistent Authentication (JWT stored, expiry not yet handled)

---

## Out of Scope for Phase 1

### Not in Phase 1:
- ❌ QR code pairing (Phase 2)
- ❌ Username/password authentication (Phase 2)
- ❌ WebView channel browsing (Phase 2)
- ❌ Video playback (Phase 2)
- ❌ D-pad navigation optimizations (Phase 2)
- ❌ Token refresh logic (Phase 3)
- ❌ Error recovery (WebView crashes, etc.) (Phase 3)

---

## Risks & Mitigations

### Risk 1: mDNS Discovery Unreliable
**Probability**: Medium  
**Impact**: High (bad first-run experience)

**Mitigation**:
- Provide clear manual URL entry fallback
- Show helpful error messages ("Can't find HD Homey? Enter URL manually")
- Test on multiple network configurations

---

### Risk 2: Android Keystore API Changes
**Probability**: Low  
**Impact**: Medium (security)

**Mitigation**:
- Use `androidx.security:security-crypto` library (abstracts Keystore)
- Test on multiple Android versions (9, 11, 13, 14)

---

### Risk 3: Backend Breaking Changes
**Probability**: Low  
**Impact**: High (app unusable)

**Mitigation**:
- Version API endpoints if needed (`/api/v1/auth/device/code`)
- Backend checks client version (User-Agent header)
- Graceful degradation (fallback to password auth)

---

## Testing Strategy

### Unit Tests
```kotlin
// DeviceCodeServiceTest.kt
- testGenerateDeviceCode_Success()
- testGenerateDeviceCode_NetworkError()
- testPollAuthorization_Pending()
- testPollAuthorization_Authorized()
- testPollAuthorization_Expired()

// MdnsDiscoveryTest.kt
- testDiscoverServer_Found()
- testDiscoverServer_Timeout()

// SecurePreferencesTest.kt
- testStoreToken_Success()
- testRetrieveToken_Success()
- testClearToken_Success()
```

### Manual Testing Scenarios
1. **Happy Path (TV)**:
   - Launch app on Android TV emulator
   - Wait for mDNS discovery
   - See device code
   - Authorize on browser
   - See success screen

2. **Manual URL Entry**:
   - Launch app
   - Wait for mDNS timeout
   - Enter manual URL
   - Complete device code flow

3. **Remote Access**:
   - Enter HTTPS URL manually
   - Complete device code flow over internet

4. **Error Cases**:
   - Server unreachable → Show error message
   - Code expires → Show "Code expired, try again"
   - Authorization denied → Show "Access denied"

---

## Version Requirements

### HD Homey Backend
- **Minimum**: 1.1.0 (device pairing API)
- **Recommended**: 1.1.0+

### Android App
- **Version**: 0.1.0-alpha (Phase 1)
- **Version Code**: 1

---

## Next Steps After Phase 1

### Phase 2: Channel Browsing & Video Playback
- WebView integration
- JavaScript bridge
- AndroidX Media3 player
- MPEG-2 with HLS fallback

### Phase 3: Advanced Features
- QR code pairing
- Username/password fallback
- Token refresh
- Error recovery
- D-pad navigation polish

---

## Estimated Timeline

**Phase 1 Total**: 24-38 hours (3-5 days)

Breakdown:
- Project setup: 2-4 hours
- Server discovery: 4-6 hours
- Device code pairing: 6-8 hours
- Backend implementation: 6-10 hours
- Navigation & polish: 3-5 hours
- Testing & docs: 3-5 hours

**Buffer**: +2 days for unexpected issues

**Target Completion**: 1 week (with full-time focus)

---

## Constitution Alignment

✅ **Simplicity First**: No unnecessary frameworks (no Compose, no RxJava)  
✅ **Latest Stable Versions**: Kotlin 2.1.0+, Gradle 8.9+, AndroidX latest  
✅ **No Code Duplication**: Android and web are separate (different languages)  
✅ **Security**: JWT in Android Keystore, HTTPS for remote  
✅ **Testing**: Unit tests for critical paths  
✅ **Documentation**: README, code comments, API docs

---

**Status**: Ready for implementation  
**Next**: Create `tasks.md` and begin Phase 1.1 (Project Setup)
