# Tasks: Android App Phase 1 - Foundation & Authentication

**Feature ID**: `013-android-app-phase1`  
**Status**: 🚧 In Progress  
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

## Phase 1.2: Multi-Server Management 🚧 Next

### Data Layer
- [ ] 1.2.1 - Create `Server` data class (id, name, url, jwt, username, role, timestamps)
- [ ] 1.2.2 - Create `ServerRepository.kt` with add/remove/list/update/setActive methods
- [ ] 1.2.3 - Create `AppPreferences.kt` for JSON serialization (Gson/Kotlinx Serialization)
- [ ] 1.2.4 - Add helper methods (getActiveServer, getServerById, etc.)

### Server List UI
- [ ] 1.2.5 - Rename `ServerSetupFragment` → `ServerListFragment`
- [ ] 1.2.6 - Create `fragment_server_list.xml` with RecyclerView + FAB
- [ ] 1.2.7 - Create `ServerListAdapter` with ViewHolder for server items
- [ ] 1.2.8 - Display server name, URL, and "last connected" timestamp
- [ ] 1.2.9 - Add "Add Server" FAB button → Navigate to AddServerFragment
- [ ] 1.2.10 - Add server item click → Connect to server (check JWT, navigate appropriately)
- [ ] 1.2.11 - Add swipe-to-delete or long-press menu for removing servers
- [ ] 1.2.12 - Show empty state when no servers ("Add your first server to get started")

### Add Server UI
- [ ] 1.2.13 - Create `AddServerFragment.kt` and `fragment_add_server.xml`
- [ ] 1.2.14 - Add EditText for server name (user-friendly label)
- [ ] 1.2.15 - Add EditText for server URL (http:// or https://)
- [ ] 1.2.16 - Add "Connect" button with loading state
- [ ] 1.2.17 - Implement URL validation (basic format, allow http/https)
- [ ] 1.2.18 - Auto-prepend "http://" if protocol missing
- [ ] 1.2.19 - Implement server health check (`GET /api/health` with OkHttp)
- [ ] 1.2.20 - On success: Create Server object → Navigate to AuthenticationFragment
- [ ] 1.2.21 - Add error states (invalid URL, duplicate name, server unreachable, network error)
- [ ] 1.2.22 - Test adding multiple servers on emulator

**Acceptance**: User can add multiple servers, view list, select server, and remove servers

---

## Phase 1.3: Device Code Pairing (Per-Server Auth)

- [x] 1.3.1 - Create `AuthenticationFragment.kt` with layout (`fragment_authentication.xml`)
- [x] 1.3.2 - Create large code display placeholder for 10-foot UI (96sp text, high contrast)
- [ ] 1.3.3 - Update AuthenticationFragment to receive `serverId` as navigation argument
- [ ] 1.3.4 - Create `HdHomeyApi.kt` with dynamic base URL (pass server URL to client)
- [ ] 1.3.5 - Create data models (`DeviceCodeRequest`, `DeviceCodeResponse`, `PollResponse`)
- [ ] 1.3.6 - Implement `DeviceCodeService.kt` with `generateCode()` method
- [ ] 1.3.7 - Call `POST /api/auth/device/code` with device name and type
- [ ] 1.3.8 - Display device code prominently on screen (96sp for TV)
- [ ] 1.3.9 - Display pairing URL below code (from server response)
- [ ] 1.3.10 - Implement polling logic (`GET /api/auth/device/poll`) every 3 seconds
- [ ] 1.3.11 - Handle poll responses: pending, authorized, expired, denied
- [ ] 1.3.12 - On authorized: Parse JWT, extract username and role from token
- [ ] 1.3.13 - Update Server in repository (jwt, username, role, expiresAt, lastConnected)
- [ ] 1.3.14 - Add countdown timer showing code expiration (5 minutes)
- [ ] 1.3.15 - Navigate to SuccessFragment with server name on authorization
- [ ] 1.3.16 - Add error handling (network errors, server errors, expired code)
- [ ] 1.3.17 - Test full pairing flow for multiple servers

**Acceptance**: User can authenticate to any server, JWT stored per-server

---

## Phase 1.4: App Launch Logic & Navigation

- [ ] 1.4.1 - Update `nav_graph.xml` with new fragments (ServerList, AddServer, Auth, Success)
- [ ] 1.4.2 - In MainActivity.onCreate: Check if servers exist in AppPreferences
- [ ] 1.4.3 - If no servers → Navigate to AddServerFragment ("Add Your First Server")
- [ ] 1.4.4 - If servers exist → Navigate to ServerListFragment
- [ ] 1.4.5 - Update SuccessFragment to show server name and "View Channels" button
- [ ] 1.4.6 - From SuccessFragment: Navigate back to ServerListFragment or main app (Phase 2)
- [ ] 1.4.7 - Handle back button navigation correctly (no back from ServerList if it's entry point)
- [ ] 1.4.8 - Add "Disconnect" action in main app (Phase 2) → Returns to ServerListFragment
- [ ] 1.4.9 - Test navigation flow: Add server → Auth → Success → List
- [ ] 1.4.10 - Test navigation flow: Select existing server → Main app

**Acceptance**: App routes to correct screen based on state (first launch vs returning user)

---

## Phase 1.5: Polish & Testing

### UI Polish
- [x] 1.5.1 - Apply Android TV theme if TV detected (large text, high contrast)
- [ ] 1.5.2 - Add loading indicators for async operations
- [ ] 1.5.3 - Add error states with retry buttons
- [ ] 1.5.4 - Add app icon and TV banner (320x180)
- [ ] 1.5.5 - Polish UI spacing and colors for 10-foot interface
- [ ] 1.5.6 - Test on phone emulator (portrait/landscape)
- [ ] 1.5.7 - Test on TV emulator (landscape, D-pad navigation)

### Unit Tests
- [ ] 1.5.8 - Write unit test for `ServerRepository` CRUD operations
- [ ] 1.5.9 - Write unit test for `DeviceCodeService.generateCode()`
- [ ] 1.5.10 - Write unit test for `DeviceCodeService.pollAuthorization()`
- [ ] 1.5.11 - Write unit test for URL validation helper
- [ ] 1.5.12 - Write unit test for AppPreferences JSON serialization

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
