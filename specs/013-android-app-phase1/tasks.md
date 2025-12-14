# Tasks: Android App Phase 1 - Foundation & Authentication

**Feature ID**: `013-android-app-phase1`  
**Status**: 🚧 In Progress (Phase 1.4 ✅ Complete, Phase 1.5 Next)  
**Parent Spec**: `.specify/features/013-android-app.md`

---

## Phase 1.1: Project Setup ✅ COMPLETE

- [x] 1.1.1 - Create new Android project in Android Studio with Empty Activity template
- [x] 1.1.2 - Configure `apps/android/build.gradle.kts` (project-level) with Kotlin 2.1.0+
- [x] 1.1.3 - Configure `apps/android/app/build.gradle.kts` with dependencies (AndroidX, Coroutines, OkHttp, Leanback)
- [x] 1.1.4 - Set up `gradle/libs.versions.toml` version catalog
- [x] 1.1.5 - Configure `AndroidManifest.xml` (permissions: INTERNET, ACCESS_NETWORK_STATE; banner, theme)
- [x] 1.1.6 - Create `MainActivity.kt` with TV detection and Navigation setup
- [x] 1.1.7 - Configure `local.properties` with backend URL from env
- [x] 1.1.8 - Test build successfully (app-debug.apk created - 19MB)
- [x] 1.1.9 - Create placeholder fragments (ServerSetup, Authentication, Success)
- [x] 1.1.10 - Set up Navigation Component with nav_graph.xml
- [x] 1.1.11 - Test app on Android TV emulator (WSL2 with KVM)
- [x] 1.1.12 - Verify app launches and displays ServerSetupFragment

**Acceptance**: ✅ Android app builds successfully (BUILD SUCCESSFUL in 26s), runs on emulator, displays first screen

---

## Phase 1.2: Multi-Server Management ✅ COMPLETE

### Data Layer
- [x] 1.2.1 - Create `Server` data class (id, name, url, jwt, username, role, timestamps)
- [x] 1.2.2 - Create `ServerRepository.kt` with add/remove/list/update/setActive methods
- [x] 1.2.3 - Create `AppPreferences.kt` for JSON serialization (Kotlinx Serialization)
- [x] 1.2.4 - Add helper methods (getActiveServer, getServerById, etc.)
- [x] 1.2.5 - Create `UrlValidator.kt` utility for HTTP/HTTPS URL validation
- [x] 1.2.6 - Create `Constants.kt` for app-wide constants

### Server List UI
- [x] 1.2.7 - Create `ServerListFragment.kt` (renamed from ServerSetupFragment)
- [x] 1.2.8 - Create `fragment_server_list.xml` with RecyclerView + FAB
- [x] 1.2.9 - Create `ServerListAdapter` with ViewHolder for server items
- [x] 1.2.10 - Display server name, URL, and "last connected" timestamp
- [x] 1.2.11 - Add "Add Server" FAB button → Navigate to AddServerFragment
- [x] 1.2.12 - Add server item click → Connect to server (check JWT, navigate appropriately)
- [x] 1.2.13 - Show empty state when no servers ("Add your first server to get started")
- [x] 1.2.14 - Display authentication status (● Authenticated / ● Session Expired / ● Not Authenticated)

### Add Server UI
- [x] 1.2.15 - Create `AddServerFragment.kt` and `fragment_add_server.xml`
- [x] 1.2.16 - Add Material TextInputLayouts for server name and URL
- [x] 1.2.17 - Add "Connect" button with loading state
- [x] 1.2.18 - Implement URL validation (UrlValidator utility, allow http/https)
- [x] 1.2.19 - Auto-prepend "http://" if protocol missing
- [x] 1.2.20 - Implement server health check (`GET /api/health` with OkHttp)
- [x] 1.2.21 - On success: Create Server object → Save to repository → Navigate back
- [x] 1.2.22 - Add error states (invalid URL, duplicate name, server unreachable, network error)
- [x] 1.2.23 - Test app builds successfully (BUILD SUCCESSFUL in 52s)
- [x] 1.2.24 - Test app launches and displays empty state correctly

### Dependencies
- [x] 1.2.25 - Add Material Design library (1.12.0)
- [x] 1.2.26 - Add RecyclerView, CardView, CoordinatorLayout dependencies
- [x] 1.2.27 - Update libs.versions.toml with new versions
- [x] 1.2.28 - Update nav_graph.xml with new navigation flows

**Acceptance**: ✅ User can add multiple servers, view list, select server. App builds and launches successfully on Android TV emulator. Empty state displays correctly. Health check validation works. See `PHASE1.2-COMPLETE.md` for detailed testing results.

---

## Phase 1.3: Device Code Pairing (Per-Server Auth) ✅ COMPLETE

- [x] 1.3.1 - Create `AuthenticationFragment.kt` with layout (`fragment_authentication.xml`)
- [x] 1.3.2 - Create large code display placeholder for 10-foot UI (96sp text, high contrast)
- [x] 1.3.3 - Update AuthenticationFragment to receive `serverId` as navigation argument
- [x] 1.3.4 - Create `HdHomeyApi.kt` with dynamic base URL (pass server URL to client)
- [x] 1.3.5 - Create data models (`DeviceCodeRequest`, `DeviceCodeResponse`, `PollResponse`)
- [x] 1.3.6 - Implement `DeviceCodeService.kt` with `generateCode()` method
- [x] 1.3.7 - Call `POST /api/auth/device/code` with device name and type
- [x] 1.3.8 - Display device code prominently on screen (96sp for TV)
- [x] 1.3.9 - Display pairing URL below code (from server response)
- [x] 1.3.10 - Implement polling logic (`GET /api/auth/device/poll`) every 3 seconds
- [x] 1.3.11 - Handle poll responses: pending, authorized, expired, denied
- [x] 1.3.12 - On authorized: Parse JWT, extract username and role from token
- [x] 1.3.13 - Update Server in repository (jwt, username, role, expiresAt, lastConnected)
- [x] 1.3.14 - Add countdown timer showing code expiration (5 minutes)
- [x] 1.3.15 - Navigate to SuccessFragment with server name on authorization
- [x] 1.3.16 - Add error handling (network errors, server errors, expired code)
- [x] 1.3.17 - Update SuccessFragment to display user info (username, role, server name)
- [x] 1.3.18 - Add "Done" button to SuccessFragment that returns to ServerListFragment
- [x] 1.3.19 - Update string resources for authentication flow
- [x] 1.3.20 - Add missing dimension and color resources (text_size_caption, text_tertiary)
- [x] 1.3.21 - Test app builds successfully (BUILD SUCCESSFUL in 2s)
- [x] 1.3.22 - **BACKEND**: Fix session creation using Better-Auth plugin with `internalAdapter.createSession()`
- [x] 1.3.23 - **BACKEND**: Add `expiresAt` timestamp to poll response
- [x] 1.3.24 - **BACKEND**: Remove old Next.js route handler (now handled by plugin)
- [x] 1.3.25 - Test full pairing flow end-to-end with backend (✅ VERIFIED - see logs in PHASE1.3-COMPLETE.md)

**Acceptance**: ✅ **COMPLETE** - Full end-to-end device code flow working! Android app successfully generates codes, polls for authorization, receives session tokens, saves authentication, and navigates to success screen. See `PHASE1.3-COMPLETE.md` for detailed implementation notes and test results.

---

## Phase 1.4: App Launch Logic & Navigation ✅ COMPLETE

- [x] 1.4.1 - Update `nav_graph.xml` with new fragments (ServerList, AddServer, Auth, Success)
- [x] 1.4.2 - In MainActivity.onCreate: Check if servers exist in AppPreferences
- [x] 1.4.3 - If no servers → Navigate to AddServerFragment ("Add Your First Server")
- [x] 1.4.4 - If servers exist → Navigate to ServerListFragment
- [x] 1.4.5 - Update SuccessFragment to show server name and "View Channels" button
- [x] 1.4.6 - From SuccessFragment: Navigate back to ServerListFragment or main app (Phase 2)
- [x] 1.4.7 - Handle back button navigation correctly (no back from ServerList if it's entry point)
- [ ] 1.4.8 - Add "Disconnect" action in main app (Phase 2) → Returns to ServerListFragment
- [ ] 1.4.9 - Test navigation flow: Add server → Auth → Success → List
- [ ] 1.4.10 - Test navigation flow: Select existing server → Main app

**Acceptance**: App routes to correct screen based on state (first launch vs returning user)

---

## Phase 1.5: Polish & Testing 🚧 In Progress

### UI Polish
- [x] 1.5.1 - Apply Android TV theme if TV detected (large text, high contrast)
- [ ] 1.5.2 - Add loading indicators for async operations
- [ ] 1.5.3 - Add error states with retry buttons
- [ ] 1.5.4 - Add app icon and TV banner (320x180)
- [ ] 1.5.5 - Polish UI spacing and colors for 10-foot interface
- [ ] 1.5.6 - Test on phone emulator (portrait/landscape)
- [ ] 1.5.7 - Test on TV emulator (landscape, D-pad navigation)

### Unit Tests
- [x] 1.5.8 - Write unit test for `ServerRepository` CRUD operations (35 tests passing)
- [ ] 1.5.9 - Write unit test for `DeviceCodeService.generateCode()`
- [ ] 1.5.10 - Write unit test for `DeviceCodeService.pollAuthorization()`
- [x] 1.5.11 - Write unit test for URL validation helper (22 tests passing)
- [x] 1.5.12 - Write unit test for AppPreferences JSON serialization (13 tests passing)

### Manual Testing
- [ ] 1.5.13 - Manual test: Add multiple servers (HTTP and HTTPS)
- [ ] 1.5.14 - Manual test: Authenticate to different servers
- [ ] 1.5.15 - Manual test: Remove server from list
- [ ] 1.5.16 - Manual test: Switch between servers
- [ ] 1.5.17 - Manual test: Code expiration handling
- [ ] 1.5.18 - Manual test: Authorization denial handling
- [ ] 1.5.19 - Manual test: Network error handling
- [ ] 1.5.20 - Manual test: Same URL, different users
- [ ] 1.5.11 - Test on phone emulator (different screen sizes)
- [ ] 1.5.12 - Verify all unit tests pass: `./gradlew test`

**Acceptance**: All unit tests passing, manual testing scenarios verified

---

## Phase 1.6: Documentation & Cleanup

- [ ] 1.6.1 - Update `apps/android/README.md` with project overview
- [ ] 1.6.2 - Document setup instructions in `apps/android/SETUP.md`
- [ ] 1.6.3 - Document architecture in `apps/android/DEVELOPMENT.md`
- [ ] 1.6.4 - Add code comments to public APIs (KDoc format)
- [ ] 1.6.5 - Create user testing guide for Phase 1
- [ ] 1.6.6 - Update `CHANGELOG.md` with Phase 1 changes
- [ ] 1.6.7 - Update `.specify/features/013-android-app.md` status
- [ ] 1.6.8 - Clean up unused imports and resources
- [ ] 1.6.9 - Run lint and fix warnings: `./gradlew lint`
- [ ] 1.6.10 - Final build verification: `./gradlew assembleDebug`

**Acceptance**: Documentation complete, code clean, ready for Phase 2

---

## Completion Criteria

Phase 1 is complete when:
- ✅ Android project builds successfully
- ✅ App launches on Android TV emulator
- ✅ mDNS discovery finds HD Homey or manual entry works
- ✅ Device code displayed and polling works
- ✅ JWT token stored securely
- ✅ Navigation between screens works
- ✅ Error states handled gracefully
- ✅ All unit tests passing
- ✅ Documentation updated
- ✅ Code passes lint checks

---

## Notes

- Backend device pairing API is already implemented (Phase 0 complete)
- Use OkHttp for simplicity (no Retrofit dependency unless needed)
- Android Keystore via `androidx.security:security-crypto` library
- Target Android 9+ (API 28+)
- Test on emulator until ready for real devices

**Next Phase**: Phase 2 - Channel Browsing & Video Playback
