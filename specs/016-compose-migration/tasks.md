# Compose Migration — Task List

**Feature**: `016-compose-migration`  
**Total Tasks**: 29  
**Waves**: 6 (W0–W5)  
**Parallel-safe tasks**: Marked `[P]`  

---

## Wave 0: Foundation (Must Complete First)

All tasks in this wave are sequential (each depends on the prior).

### T-001: Add Compose Dependencies to Version Catalog

**FR**: FR-001, FR-004–FR-017  
**Files**: `gradle/libs.versions.toml`, `app/build.gradle.kts`  
**Description**: Add Compose BOM (2026.06.00), `material3`, `navigation-compose`, `activity-compose`, `hilt-navigation-compose` (1.2.0), `coil-compose` (2.7.0), `lifecycle-viewmodel-compose`, `lifecycle-runtime-compose`, `material3-window-size-class`, `compose-ui`, `compose-ui-graphics`, `compose-ui-tooling-preview` (debug), `compose-ui-tooling` (debug), `compose-ui-test-manifest` (debug), `compose-ui-test-junit4` (test) to the version catalog.  

**Acceptance**: `./gradlew dependencies` resolves all new entries without errors.

**Dependencies**: None  

---

### T-002: Enable Compose Build Features and Kotlin Compose Plugin

**FR**: FR-002, FR-003  
**Files**: `app/build.gradle.kts`  
**Description**: 
1. Add `alias(libs.plugins.kotlin.compose)` to plugins block (requires creating `kotlin-compose` plugin entry in version catalog pointing to `org.jetbrains.kotlin.plugin.compose` at Kotlin version).  
2. Set `buildFeatures { compose = true }` in the android block.  
3. Keep `viewBinding = true` for now — it will be removed in W5 T-022.  
4. Add `kotlinCompilerExtensionVersion` is NOT needed — the Kotlin Compose plugin handles this.  

**Acceptance**: `./gradlew assembleDebug` compiles (even with no Compose code yet).

**Dependencies**: T-001  

---

### T-003: Create Theme Package

**FR**: FR-030–FR-035, FR-097  
**Files**: 
- `ui/theme/Color.kt` — all Color constants from DESIGN.md/colors.xml mapping  
- `ui/theme/Type.kt` — M3 Typography with phone defaults and TV oversizes  
- `ui/theme/Shape.kt` — M3 Shapes (small=4dp, medium=8dp, large=12dp)  
- `ui/theme/ExtendedColors.kt` — ExtendedColors data class + LocalExtendedColors CompositionLocal + `MaterialTheme.extendedColors` extension  
- `ui/theme/HdHomeyTheme.kt` — `HdHomeyTheme` composable wrapping `MaterialTheme` with `darkColorScheme`  

**Details**:
- `darkHdHomeyColorScheme()`: primary=#2563EB, secondary=#2563EB, background=#1A1A1A, surface=#2A2A2A, surfaceVariant=#3A3A3A, onBackground=#F0F0F0, onSurface=#F0F0F0, onSurfaceVariant=#B3B3B3, outline=#404040, error=#FF5555, errorContainer=#7F1D1D, onErrorContainer=#FECACA
- `ExtendedColors`: success=#10B981, successContainer=#064E3B, warning=#F59E0B, warningContainer=#78350F, info=#3B82F6, infoContainer=#1E3A8A, textTertiary=#909090, textDisabled=#666666
- `HdHomeyTheme` accepts optional `isTv` Boolean (defaults from `LocalConfiguration`)

**Acceptance**: Theme composable can be called from any test composable and provides correct color values via `MaterialTheme.colorScheme`.

**Dependencies**: T-002  

---

### T-004: Create Shared Components

**FR**: FR-041–FR-047 (shimmer), FR-085 (adaptive layout)  
**Files**: 
- `ui/components/AsyncStateContent.kt` — `AsyncState<T>` sealed interface + `AsyncStateContent` composable  
- `ui/components/ShimmerEffect.kt` — Reusable shimmer/skeleton composable (5 placeholder cards with alpha animation)  
- `ui/components/AdaptiveLayout.kt` — `AdaptiveValues` data class, `LocalAdaptiveValues` CompositionLocal, `ProvideAdaptiveValues` wrapper composable  

**Details**:
- `AsyncState<T>` is a sealed interface: `Loading`, `Success<T>`, `Error(message, cause)`
- `AsyncStateContent` composable takes state, onRetry, loadingContent, emptyCheck, emptyContent, content
- Shimmer uses `rememberInfiniteTransition` with `animateFloat` alpha (0.3f → 0.7f) on `surfaceVariant` colored boxes
- `AdaptiveValues` holds `horizontalMargin: Dp`, `cardShape: Shape`, `isTv: Boolean`, `minTouchTarget: Dp`

**Acceptance**: Components compile and can be used in any screen composable.

**Dependencies**: T-003  

---

### T-005: Create Navigation Infrastructure

**FR**: FR-036–FR-040, FR-037  
**Files**: 
- `ui/navigation/Routes.kt` — `@Serializable` route objects/data classes  
- `ui/navigation/NavGraph.kt` — `NavHost` composable with all route destinations (empty placeholders)  
- `ui/navigation/NavigationActions.kt` — Typed navigation helper functions  

**Routes** (FR-037):
```kotlin
@Serializable object ServerList
@Serializable object AddServer
@Serializable data class Authentication(val serverId: String)
@Serializable data class ChannelList(val serverId: String? = null)
@Serializable data class Player(val channelId: String, val channelName: String)
@Serializable object Success
```

**Back stack behavior** (FR-039): Implemented in each screen's navigation callbacks.

**Acceptance**: NavHost compiles with all routes. Navigating between empty screens works.

**Dependencies**: T-003, T-004  

---

### T-006: Rewrite MainActivity for Compose

**FR**: FR-040, FR-088  
**Files**: `MainActivity.kt` (rewrite)  
**Description**: 
- Change `AppCompatActivity` to `ComponentActivity`  
- Remove all Fragment/NavHostFragment references  
- Add `enableEdgeToEdge()`  
- `setContent { HdHomeyTheme { AppNavHost() } }`  
- Keep `@AndroidEntryPoint` annotation  
- Add `calculateCurrentWindowSizeClass()` call to provide window size info  
- Add TV intent handler for LEANBACK_LAUNCHER (still needed for TV discovery)  

**Acceptance**: App launches and shows an empty screen (placeholder ServerList composable) with correct dark theme applied.

**Dependencies**: T-005  

---

### T-007: Create ServerListViewModel

**FR**: FR-041–FR-047 (state management)  
**Files**: `ui/servers/ServerListViewModel.kt`  
**Description**: New `@HiltViewModel` that:
- Injects `ServerRepository` and `CurrentServerProvider`
- Exposes `StateFlow<AsyncState<List<Server>>>`  
- `loadServers()` method fetches from repository
- `refreshServers()` for re-fetch  
- `deleteServer(id)` with confirmation callback  
- `getActiveServer()` for navigation decisions

**Acceptance**: ViewModel works with existing unit test patterns; existing `ServerRepository` tests still pass.

**Dependencies**: T-003 (uses AsyncState, Theme colors)  

---

## Wave 1: Core Screens (Highest User Impact)

### T-008: Build ServerListScreen Composable  [P]

**FR**: FR-041–FR-047, FR-083, FR-084  
**Files**: `ui/servers/ServerListScreen.kt`  
**Description**: Full server list screen with:
- `Scaffold` + `TopAppBar` ("Your Servers")  
- `FloatingActionButton` (`+` icon → navigate to AddServer)  
- `LazyColumn` with server cards  
- `AsyncStateContent` for Loading/Error/Success/Empty  
- Loading: 5 skeleton shimmer cards  
- Error: message + retry button  
- Success: list of `Card` items — server name, URL, auth status dot (green/red/yellow), active badge, user info  
- Empty: welcome message + instructions  
- TV adaptation: 48dp margins, 12dp card radius, D-pad focus with elevation change  
- Settings icon in TopAppBar (placeholder)

**Acceptance**: Server list renders with all states. Clicking a server navigates to ChannelList or Authentication.

**Dependencies**: T-006, T-007  

---

### T-009: Build ChannelCard Composable

**FR**: FR-062–FR-069, FR-064  
**Files**: `ui/components/ChannelCard.kt`  
**Description**: Reusable card composable for channel items:
- `AsyncImage` (Coil) for channel logo with placeholder fallback  
- Channel number text  
- Channel name text  
- HD badge (styled `Surface` chip)  
- Favorite star toggle `IconButton`  
- TV adaptation: 12dp radius, `Modifier.onFocus` for elevation change  
- Phone adaptation: 8dp radius, `Modifier.clickable` with ripple  

**Acceptance**: Card renders with/without logo, with/without HD badge, favorite toggle calls callback.

**Dependencies**: T-003 (theme), T-004 (components)  

---

### T-010: Build ChannelListScreen Composable

**FR**: FR-062–FR-069, FR-083, FR-084, FR-086, FR-087  
**Files**: `ui/channels/ChannelListScreen.kt`  
**Description**: Full channel list screen with:
- Existing `ChannelListViewModel` via `hiltViewModel()` — no VM changes  
- Collect `uiState` via `collectAsStateWithLifecycle()`  
- `Scaffold` + `TopAppBar` (tuner name + refresh icon button)  
- `PullToRefreshBox` (ExperimentalMaterial3Api) wrapping `LazyColumn`  
- `AsyncState`-style rendering from `ChannelListUiState`:
  - `Loading` → shimmer skeleton for channel items  
  - `Error` → error message + retry button  
  - `Success` → `ChannelCard` list  
  - `Empty` → "No channels found" message  
- Channel click → navigate to `Player(channelId, channelName)`  
- Favorite toggle → call ViewModel  
- TV adaptation: larger margins, D-pad focus

**Acceptance**: Channel list loads, displays thumbnails, supports refresh and favorite toggle. Click navigates to Player.

**Dependencies**: T-007, T-009, T-006  

---

## Wave 2: Player Screen

### T-011: Build PlayerScreen Composable

**FR**: FR-070–FR-079, FR-086, FR-087  
**Files**: `ui/player/PlayerScreen.kt`  
**Description**: Full video player screen with:
- Dependencies: `AndroidView`, `PlayerView`, `ExoPlayer`, `DisposableEffect`  
- `Box` layout: `AndroidView(PlayerView)` in background, Compose controls overlay on top  
- ViewModel: existing `PlayerViewModel` via `hiltViewModel()` — no VM changes  
- Player lifecycle: `DisposableEffect(Unit)` → `onDispose { viewModel.releasePlayer() }`  
- Controls overlay:
  - Channel name/number (top, semi-transparent `Surface`)  
  - Play/pause button (center, visible on tap, auto-hide 3s `LaunchedEffect`)  
  - Exit button (top-left)  
- Three states: `Loading` → spinner, `Error` → retry, `Playing/Buffering` → video + controls  
- Exit confirmation `AlertDialog` via `BackHandler` when playing/buffering  
- Stream fallback: raw → HLS (handled by ViewModel, unchanged)

**File**: `ui/player/PlayerScreen.kt`

**Acceptance**: Player opens from channel click, video plays with correct controls, back button shows exit dialog during playback, controls auto-hide.

**Dependencies**: T-006, T-003, T-004  

---

### T-012: Test PlayerScreen ExoPlayer Integration

**FR**: FR-090, FR-092, FR-094  
**Files**: `src/test/java/.../ui/player/PlayerScreenTest.kt`  
**Description**: Compose UI test for PlayerScreen:
- Verify controls overlay renders  
- Verify play/pause icon toggles  
- Verify exit dialog appears on back press during active playback  
- Verify loading state shows spinner  
- Use `createComposeRule()` with Compose 1.11 v2 APIs (`advanceUntilIdle()`)

**Acceptance**: All PlayerScreen UI tests pass.

**Dependencies**: T-011  

---

## Wave 3: Secondary Screens

### T-013: Build AddServerViewModel  [P]

**FR**: FR-048–FR-053  
**Files**: `ui/servers/AddServerViewModel.kt`  
**Description**: New `@HiltViewModel` that:
- Injects `ServerRepository`, `ServerConnectivityChecker`  
- Exposes `StateFlow<AsyncState<Boolean>>` for connection test result  
- `testConnection(url)` method with timeout  
- `saveServer(name, url)` method  
- URL validation logic (scheme checks)  

**Acceptance**: ViewModel compiles and works with `AddServerScreen`.

**Dependencies**: T-003  

### T-014: Build AddServerScreen Composable  [P]

**FR**: FR-048–FR-053, FR-083, FR-084  
**Files**: `ui/servers/AddServerScreen.kt`  
**Description**: Server add/edit form screen with:
- `Column` layout with `OutlinedTextField` for server name and URL  
- URL field pre-filled with `http://`  
- Connect `Button` (primary, disabled while testing)  
- Cancel `OutlinedButton`  
- "Testing connection…" loading state  
- Inline error messages (not dialog)  
- TV adaptation: wider fields, larger text, D-pad focus chain

**Acceptance**: Form validates URL scheme, tests connectivity, saves on success, shows error inline on failure.

**Dependencies**: T-006, T-013  

---

### T-015: Build AuthenticationViewModel

**FR**: FR-054–FR-059  
**Files**: `ui/auth/AuthenticationViewModel.kt`  
**Description**: New `@HiltViewModel` that:
- Injects `DeviceCodeService`, `CurrentServerProvider`  
- Exposes `StateFlow<AuthenticationUiState>`  
- `AuthenticationUiState` data class: `deviceCode`, `qrCodeBitmap`, `expiresAt`, `isPolling`, `isExpired`, `isAuthorized`, `errorMessage`  
- `startPairing(serverId)` — fetches device code, starts polling  
- `cancelPolling()` — cancels coroutine  
- `retryPairing()` — restarts the flow  
- Polling uses `LaunchedEffect` in the screen, not the ViewModel (to allow cancellation by BackHandler)

**Acceptance**: ViewModel provides device code, QR bitmap, and polling state correctly.

**Dependencies**: T-003  

---

### T-016: Build AuthenticationScreen Composable  [P]

**FR**: FR-054–FR-059, FR-083, FR-084  
**Files**: `ui/auth/AuthenticationScreen.kt`  
**Description**: Device code pairing screen with:
- `Column` layout  
- Title: "Pair with {serverName}"  
- Device code in large monospace text (96sp, `FontFamily.Monospace`)  
- QR code rendered as `ImageBitmap` from ZXing `BitMatrix`  
- Expiry countdown timer (`LaunchedEffect` counting down)  
- "Try Again" button when code expires  
- `BackHandler` to cancel polling and navigate back  
- TV adaptation: 48dp margins, larger code text

**Acceptance**: QR code renders, device code displays, countdown timer works, polling cancels on back press.

**Dependencies**: T-006, T-015  

---

### T-017: Build SuccessScreen Composable  [P]

**FR**: FR-060, FR-061  
**Files**: `ui/success/SuccessScreen.kt`  
**Description**: Confirmation screen with:
- `Column` centered layout  
- Checkmark icon (`Icons.Default.CheckCircle`)  
- "You're Connected!" title  
- Server/user info text  
- "View Channels" primary button → `ChannelList(serverId)`  
- "Back to Servers" outlined button → `ServerList`  
- TV adaptation: centered with 48dp margins

**Acceptance**: Both buttons navigate correctly, screen displays after successful authentication.

**Dependencies**: T-006, T-003  

---

## Wave 4: Cleanup & Polish

### T-018: Add Compose UI Tests for ServerListScreen  [P]

**FR**: FR-090, FR-092, FR-094  
**Files**: `src/test/java/.../ui/servers/ServerListScreenTest.kt`  
**Description**: Compose UI tests for ServerListScreen:
- Verify shimmer loading state renders
- Verify error state with retry button  
- Verify success state with server items
- Verify empty state with welcome message  
- Use `createComposeRule()` with `advanceUntilIdle()`

**Acceptance**: All ServerList UI tests pass.

**Dependencies**: T-008  

---

### T-019: Add Compose UI Tests for ChannelListScreen  [P]

**FR**: FR-090, FR-092, FR-094  
**Files**: `src/test/java/.../ui/channels/ChannelListScreenTest.kt`  
**Description**: Compose UI tests for ChannelListScreen:
- Verify loading skeleton renders
- Verify error state with retry
- Verify channel cards render
- Verify empty state
- Verify navigation event on channel click

**Acceptance**: All ChannelList UI tests pass.

**Dependencies**: T-010  

---

### T-020: Add Compose UI Tests for AddServer and Authentication Screens  [P]

**FR**: FR-090, FR-092, FR-094  
**Files**: 
- `src/test/java/.../ui/servers/AddServerScreenTest.kt`  
- `src/test/java/.../ui/auth/AuthenticationScreenTest.kt`  
- `src/test/java/.../ui/success/SuccessScreenTest.kt`  

**Description**: Compose UI tests:
- AddServer: form renders, validation errors, connect button states
- Authentication: code display, QR renders, expiry message, retry
- Success: checkmark visible, both buttons clickable

**Acceptance**: All three test files pass.

**Dependencies**: T-014, T-016, T-017  

---

### T-021: Delete All Legacy View System Files

**FR**: FR-095, FR-096, FR-097, AC-004, AC-005  
**Files**: Delete all files listed in the spec's deletion tables:
- 12 XML layouts in `res/layout/`  
- 5 XML drawables (bg_player_controls, bg_refresh_button, ic_player_exit, ic_player_pause, ic_player_play, shimmer_background) — 6 total  
- `res/animator/card_lift.xml`  
- `res/navigation/nav_graph.xml`  
- `res/values/themes.xml`  
- `res/values/colors.xml`  
- `res/values/dimens.xml`  
- `res/menu/server_context_menu.xml`  
- All Fragment classes (ServerListFragment, AddServerFragment, AuthenticationFragment, ChannelListFragment, SuccessFragment)  
- ServerListAdapter.kt, ChannelAdapter.kt  
- PlayerActivity.kt, PlayerControlsView.kt  
- `res/drawable/ic_launcher_foreground.png`, `res/drawable/banner` — KEEP (app icons)  

**Acceptance**: Zero XML layout files remain. Zero Fragment subclasses remain.

**Dependencies**: All W1–W3 tasks (must have Compose replacements working first)  

---

### T-022: Remove viewBinding and Legacy Dependencies

**FR**: FR-003, FR-018–FR-029, AC-006, AC-007, AC-008  
**Files**: `app/build.gradle.kts`, `gradle/libs.versions.toml`  
**Description**:
- Remove `viewBinding = true` from `buildFeatures`  
- Remove from version catalog: `appcompat`, `constraintlayout`, `recyclerview`, `cardview`, `coordinatorlayout`, `leanback`, `material` (MDC), `navigation-fragment-ktx`, `navigation-ui-ktx`, `hilt-navigation-fragment`, `coil` (plain), `fragment-ktx`  
- Remove from build.gradle.kts all the above `implementation` lines  
- Add `coil-compose` if not already added (should be added in T-001)  

**Acceptance**: `./gradlew assembleDebug` compiles without these dependencies.

**Dependencies**: T-021  

---

### T-023: Update AndroidManifest for Compose

**File**: `AndroidManifest.xml`  
**Description**:
- Remove `<uses-feature android:name="android.software.leanback" />` (no longer needed)  
- Change `MainActivity` `screenOrientation` from `"landscape"` to `"fullSensor"` (auto-rotate on phones, landscape on TV will be managed via `requestedOrientation` in Compose)  
- Remove `PlayerActivity` `<activity>` declaration entirely (player is now a composable in NavHost)  
- Update `android:theme="@style/Theme.HdHomey"` to point to a minimal Compose-compatible theme — or remove `android:theme` entirely since `HdHomeyTheme` is applied in `setContent()`. (Keep a minimal `Theme.HdHomey` parented to `Theme.Material3.Dark.NoActionBar` as a fallback for the splash screen / system UI chrome.)  

**Acceptance**: Manifest is clean, no references to Fragments or PlayerActivity.

**Dependencies**: T-021  

---

### T-024: Remove Old Instrumentation Tests

**FR**: FR-090, FR-094  
**Files**: Delete existing Espresso instrumentation tests:
- `src/androidTest/java/.../ui/channels/ChannelSelectionTest.kt`
- `src/androidTest/java/.../ui/channels/ErrorStateTest.kt`
- `src/androidTest/java/.../ui/channels/ChannelListNavigationTest.kt`

Replace with Compose-based instrumentation tests:
- `src/androidTest/java/.../ui/navigation/NavigationTest.kt` — verify route transitions using `createAndroidComposeRule<MainActivity>()`

**Acceptance**: Old Espresso tests removed, new Compose instrumentation tests pass.

**Dependencies**: T-021  

---

### T-025: Add Animation Polish

**FR**: NFR-007, DESIGN.md §8  
**Files**: Updates to screen composables  
**Description**:
- Add `AnimatedVisibility` for skeleton shimmer appearance/disappearance  
- Add `animateFloatAsState` for card elevation on TV focus  
- Navigation transitions: `enterTransition`/`exitTransition` in `NavHost` using `fadeIn`/`fadeOut` (150ms, DESIGN.md §8.1)  
- `AnimatedContent` for state transitions (Loading→Success→Error) where smooth  

**Acceptance**: Animations are subtle, not jarring. No performance regression measured in Layout Inspector.

**Dependencies**: All screen composables exist  

---

## Wave 5: Verification

### T-026: Run Full Unit Test Suite

**FR**: FR-091, AC-010, AC-013  
**Description**: 
- Run `./gradlew testDebug`  
- All 18 existing unit tests MUST pass  
- All new Compose UI tests MUST pass  
- Fix any failures  

**Acceptance**: `./gradlew testDebug` exits with zero failures.

**Dependencies**: All W0–W4 tasks  

---

### T-027: Run Android Instrumentation Tests on Emulator

**FR**: AC-013, AC-021–AC-027  
**Description**:
- Start emulator (`test_avd`, API 35)  
- Run `./gradlew connectedDebugAndroidTest`  
- Verify navigation tests pass on the emulator  
- Verify TV adaptation on TV emulator category  
- Fix any failures  

**Acceptance**: `./gradlew connectedDebugAndroidTest` passes.

**Dependencies**: T-024, T-026  

---

### T-028: Build Verification and APK Size Check

**FR**: AC-001–AC-003, AC-028, AC-029, NFR-011, NFR-012  
**Description**:
- `./gradlew assembleDebug` — zero errors  
- `./gradlew lintDebug` — zero errors, zero warnings  
- `./gradlew kspKotlinDebug` — Hilt processing succeeds  
- Verify debug APK is under 25MB (NFR-011: +2MB max from baseline)  
- Verify build time increase < 30s (NFR-012)  

**Acceptance**: All build commands pass, APK size OK.

**Dependencies**: T-026  

---

### T-029: Final Code Quality Pass and Documentation Updates

**NFR**: NFR-007–NFR-010  
**Description**:
- Verify no `Fragment` subclasses remain (grep check)  
- Verify no `viewBinding` usages remain  
- Verify no `LayoutInflater` / `ViewGroup` references in new code  
- Update `README.md` if needed  
- Update `apps/docs/` if Android feature documentation exists  
- Update CHANGELOG.md  
- Commit and push to PR #39  

**Acceptance**: Codebase is clean, documentation is up to date.

**Dependencies**: T-028  

---

## Task Dependency Graph

```
T-001 (version catalog)
  └─► T-002 (compose plugin)
        └─► T-003 (theme)
              ├─► T-004 (shared components)
              │     └─► T-005 (nav routes)
              │           └─► T-006 (MainActivity)
              │                 ├─► T-007 (ServerListVM)
              │                 │     └─► T-008 (ServerListScreen) ──► T-018 (ServerList tests)
              │                 ├─► T-009 (ChannelCard)
              │                 │     └─► T-010 (ChannelListScreen) ──► T-019 (ChannelList tests)
              │                 ├─► T-011 (PlayerScreen) ──► T-012 (Player tests)
              │                 ├─► T-013 (AddServerVM)
              │                 │     └─► T-014 (AddServerScreen) ──┐
              │                 ├─► T-015 (AuthVM)                  ├─► T-020 (secondary tests)
              │                 │     └─► T-016 (AuthScreen) ──────┘
              │                 └─► T-017 (SuccessScreen) ──────────┘
              │                       │
              │                       ▼
              │                 T-021 (DELETE legacy files)
              │                       │
              │                       ├─► T-022 (remove deps)
              │                       ├─► T-023 (AndroidManifest)
              │                       └─► T-024 (remove old tests)
              │                             │
              │                             ▼
              │                       T-025 (animations)
              │                             │
              │                             ▼
              │                       T-026 (unit tests)
              │                             │
              │                             ├─► T-027 (instrumentation tests)
              │                             └─► T-028 (build verification)
              │                                   │
              │                                   ▼
              │                             T-029 (final pass)
              └─► T-003 ──► ... (parallel tracks merged at T-006)
```

---

## Wave Summary

| Wave | Tasks | Est. Effort | Parallel |
|------|-------|-------------|----------|
| W0: Foundation | T-001–T-006 | 6 tasks | Sequential |
| W1: Core Screens | T-007–T-010 | 4 tasks | T-008, T-010 parallel |
| W2: Player | T-011–T-012 | 2 tasks | Sequential |
| W3: Secondary | T-013–T-017 | 5 tasks | T-014, T-016, T-017 parallel |
| W4: Cleanup | T-018–T-025 | 8 tasks | T-018/T-019/T-020 parallel; T-021→T-024 sequential |
| W5: Verification | T-026–T-029 | 4 tasks | Sequential |
| **Total** | **T-001–T-029** | **29 tasks** | |
