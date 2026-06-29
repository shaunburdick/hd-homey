# Feature Specification: Jetpack Compose + Material 3 Migration

**Feature ID**: `016-compose-migration`  
**Created**: 2026-06-29  
**Status**: Specification  
**Owner**: HD Homey Core Team  
**Version**: 1.0  
**Dependencies**: None (builds on existing `013-android-app` Phase 2 state)

## Overview

The HD Homey Android app (`apps/android/`) is currently built with the legacy View system: XML layouts, Fragments, RecyclerView, CardView, and viewBinding. This spec defines a **full migration to Jetpack Compose + Material 3**, removing all XML layouts, Fragments, and viewBinding — no coexistence.

**Migration strategy**: All screens, drawables, navigation, and theming are converted to Compose in a single, ordered migration. The existing data layer (ViewModel, Repository, API, DI modules) requires minimal changes. The architecture shifts from Fragment-based MVVM to Compose-based MVVM with Navigation Compose, type-safe routes, and `hiltViewModel()`.

**Key architectural changes**:
- Fragment navigation → Navigation Compose with `@Serializable` route objects
- XML themes → `HdHomeyTheme` composable wrapping `MaterialTheme`
- View-based layouts → Composable functions with `LazyColumn`, `Card`, `Scaffold`, etc.
- `viewBinding` → Compose `@Composable` references
- `hilt-navigation-fragment` → `hilt-navigation-compose`
- Leanback theme → `WindowSizeClass`-based adaptive layout (no Leanback dependency)
- Coil (plain) → `coil-compose` (`AsyncImage`)
- `PlayerActivity` (separate Activity) → Composable destination in NavHost
- Drawables (XML/PNG) → Material Icons / Compose-drawn equivalents

### Is This a New Feature or an Extension of 013?

This is a **genuinely new feature** — it has a distinct problem statement (migrate UI framework), a distinct user base (developers/maintainers), and a distinct domain (UI architecture). It does **not** add new business capabilities; it replaces the UI rendering layer underneath existing capabilities. Numbered as 016 rather than extending 013 because:
- 013's scope is the Android app's functional capabilities (server management, channel browsing, streaming)
- 016's scope is the UI framework replacement that supports those capabilities
- They can be planned and implemented independently

### Migration Principles

1. **No coexistence period** — All XML layouts and Fragments are deleted in one sweep. The migration produces a working Compose app before delivery.
2. **Feature parity, not feature expansion** — Every existing screen, state, and interaction works identically after migration. No new user-facing features.
3. **Data layer remains unchanged** — ViewModels, Repositories, API interfaces, DI modules, and domain models are preserved. Only `hiltViewModel()` replaces `hiltNavGraphViewModels()` / by `viewModels()` in Fragments.
4. **Constitutional alignment** — Simplicity First (§I): Compose reduces code volume and eliminates XML/Fragment boilerplate. Code Quality (§III): Compose enables stronger compile-time checks and testability.

---

## Current Architecture (Pre-Migration)

### View System Files to Delete

| File | Type | Replacement |
|------|------|-------------|
| `res/layout/activity_main.xml` | XML | `MainActivity.kt` (Compose content) |
| `res/layout/activity_player.xml` | XML | `PlayerScreen.kt` composable |
| `res/layout/fragment_add_server.xml` | XML | `AddServerScreen.kt` composable |
| `res/layout/fragment_authentication.xml` | XML | `AuthenticationScreen.kt` composable |
| `res/layout/fragment_channel_list.xml` | XML | `ChannelListScreen.kt` composable |
| `res/layout/fragment_server_list.xml` | XML | `ServerListScreen.kt` composable |
| `res/layout/fragment_server_setup.xml` | XML | Removed (legacy screen, folded into AddServer) |
| `res/layout/fragment_success.xml` | XML | `SuccessScreen.kt` composable |
| `res/layout/item_channel.xml` | XML | Inline in `ChannelListScreen.kt` |
| `res/layout/item_server.xml` | XML | Inline in `ServerListScreen.kt` |
| `res/layout/item_server_skeleton.xml` | XML | Inline in `ServerListScreen.kt` |
| `res/layout/player_controls.xml` | XML | Inline in `PlayerScreen.kt` |
| `res/drawable/bg_player_controls.xml` | XML drawable | Compose `Surface` with alpha background |
| `res/drawable/bg_refresh_button.xml` | XML drawable | `IconButton` with Material style |
| `res/drawable/ic_player_exit.xml` | XML drawable | Material `Icons.Default.ArrowBack` |
| `res/drawable/ic_player_pause.xml` | XML drawable | Material `Icons.Default.Pause` |
| `res/drawable/ic_player_play.xml` | XML drawable | Material `Icons.Default.PlayArrow` |
| `res/drawable/shimmer_background.xml` | XML drawable | Compose `Modifier.shimmer()` custom animation |
| `res/animator/card_lift.xml` | Animator | Compose `animateFloatAsState` for elevation |
| `res/navigation/nav_graph.xml` | XML | Navigation Compose `NavHost` in code |
| `res/values/themes.xml` | XML | Compose `HdHomeyTheme` |
| `res/values/colors.xml` | XML | Compose `Color` objects in theme |
| `res/values/dimens.xml` | XML | Compose `dp` values (remove resource lookups) |

### Source Files to Modify/Delete

| File | Type | Action |
|------|------|--------|
| `MainActivity.kt` | Activity | Rewrite — `setContent {}` with `HdHomeyTheme` + `NavHost` |
| `ui/servers/ServerListFragment.kt` | Fragment | Delete → `ui/servers/ServerListScreen.kt` composable |
| `ui/servers/AddServerFragment.kt` | Fragment | Delete → `ui/servers/AddServerScreen.kt` composable |
| `ui/servers/ServerListAdapter.kt` | RecyclerView Adapter | Delete → inline `LazyColumn` items |
| `ui/auth/AuthenticationFragment.kt` | Fragment | Delete → `ui/auth/AuthenticationScreen.kt` composable |
| `ui/success/SuccessFragment.kt` | Fragment | Delete → `ui/success/SuccessScreen.kt` composable |
| `ui/channels/ChannelListFragment.kt` | Fragment | Delete → `ui/channels/ChannelListScreen.kt` composable |
| `ui/channels/ChannelAdapter.kt` | RecyclerView Adapter | Delete → inline `LazyColumn` items |
| `ui/channels/ChannelListViewModel.kt` | ViewModel | Keep (minor: remove Fragment lifecycle refs) |
| `ui/channels/ChannelListUiState.kt` | Data class | Keep (minor: may need `Parcelable` → non-`Parcelable`) |
| `ui/player/PlayerActivity.kt` | Activity | Delete → `ui/player/PlayerScreen.kt` composable |
| `ui/player/PlayerViewModel.kt` | ViewModel | Keep |
| `ui/player/PlayerUiState.kt` | Data class | Keep |
| `ui/player/PlayerControlsView.kt` | Custom View | Delete → inline in `PlayerScreen.kt` |
| `HdHomeyApplication.kt` | Application | Keep (Hilt entry point) |

### Files to Keep (Unchanged)

- All `api/` interfaces (Retrofit)
- All `data/` models and repositories
- All `di/` Hilt modules
- All `domain/` domain models
- All `player/` helpers (`HdHomeyMediaSource`, `PlayerEventListener`)
- All `storage/` DataStore / encrypted prefs
- All `util/` utilities
- `HdHomeyApplication.kt`
- `res/values/strings.xml` (keep as string resource)
- `res/mipmap-*` and `res/drawable/ic_launcher_foreground.png` (app icons)
- `res/drawable/banner` (TV banner)
- `proguard-rules.pro`, `settings.gradle.kts`, `gradle.properties`, `local.properties`

---

## User Stories

### Story 1: Developer Completes Migration (Priority: P1 — Foundation)

**As a** maintainer  
**I want** the full Android app converted to Jetpack Compose + Material 3 with no remaining XML layouts  
**So that** the codebase is modern, testable, and maintainable

**Why this priority**: Foundation for all other stories; no partial migration

**Acceptance Criteria**:
- **Given** the migration is complete, **When** I search the project, **Then** zero `.xml` layout files remain in `res/layout/`
- **Given** the migration is complete, **When** I search the project, **Then** zero `Fragment` subclasses remain
- **Given** the migration is complete, **When** I check the build config, **Then** `viewBinding = true` is removed
- **Given** the migration is complete, **When** I check dependencies, **Then** `compose-bom` replaces all View-system dependencies
- **Given** the migration is complete, **When** I run `./gradlew assembleDebug`, **Then** it succeeds with zero errors

---

### Story 2: User Experiences Parity (Priority: P1)

**As a** user (TV, tablet, or phone)  
**I want** every screen and interaction to work exactly as before the migration  
**So that** I notice no difference in functionality, only improved polish

**Why this priority**: Zero-regression is non-negotiable for a UI framework replacement

**Acceptance Criteria**:
- **Given** I launch the app, **When** I see the server list, **Then** it displays the same servers, loading, and empty states as before
- **Given** I add a server, **When** I complete the form, **Then** the server appears in the list
- **Given** I select a server, **When** I complete authentication (QR/code/password), **Then** I reach the success screen and can navigate to channels
- **Given** I see the channel list, **When** it loads, **Then** channels display with thumbnails, names, numbers, HD badges, and favorite icons
- **Given** I select a channel to watch, **When** the player opens, **Then** video plays with correct controls (play/pause/exit)
- **Given** a screen has no data, **When** it loads, **Then** it shows the appropriate empty state
- **Given** a network error occurs, **When** any API call fails, **Then** an error state with retry is shown

---

### Story 3: TV Remote Navigation (Priority: P1)

**As an** Android TV user  
**I want** full D-pad navigation via `WindowSizeClass` adaptation  
**So that** I can navigate the app with my TV remote without Leanback

**Why this priority**: TV is a primary target device; D-pad support must not regress

**Acceptance Criteria**:
- **Given** I'm on Android TV (large screen, non-touch input), **When** I use D-pad up/down, **Then** focus moves between items with visible focus indicators
- **Given** focus is on a selectable item, **When** I press D-pad center/OK, **Then** the action triggers (e.g., navigate, play)
- **Given** a list of channels, **When** I scroll with D-pad, **Then** the list scrolls smoothly without the focus leaving visible items
- **Given** I press back on the remote, **When** not at root, **Then** I navigate to the previous screen
- **Given** I press back on the remote, **When** at the server list root, **Then** the app exits

---

### Story 4: Phone and Tablet UX (Priority: P1)

**As a** phone or tablet user  
**I want** proper touch-optimized layouts via `WindowSizeClass` adaptation  
**So that** the app feels native on my device

**Why this priority**: The app targets all form factors; touch UX must be excellent

**Acceptance Criteria**:
- **Given** I'm on a phone (compact width), **When** I open any screen, **Then** layouts use mobile-appropriate spacing (16dp, not 48dp)
- **Given** I'm on a tablet (medium/expanded width), **When** I open any screen, **Then** layouts use more generous spacing and larger touch targets
- **Given** I'm on any non-TV device, **When** I interact with lists, **Then** touch scrolling works naturally with no D-pad focus artifacts
- **Given** I rotate phone/tablet, **When** screen orientation changes, **Then** layout reflows correctly

---

## Requirements

### Functional Requirements

#### Build Configuration
- **FR-001**: Gradle version catalog MUST add `compose-bom = "2026.06.00"` for Compose Bill of Materials
- **FR-002**: Gradle MUST add `org.jetbrains.kotlin.plugin.compose` plugin (version matches Kotlin `2.2.10`)
- **FR-003**: Gradle `buildFeatures` MUST set `viewBinding = false` (remove legacy system)
- **FR-004**: Gradle MUST add `androidx.compose.material3:material3` dependency (via BOM)
- **FR-005**: Gradle MUST add `androidx.compose.ui:ui` dependency (via BOM)
- **FR-006**: Gradle MUST add `androidx.compose.ui:ui-graphics` dependency (via BOM)
- **FR-007**: Gradle MUST add `androidx.compose.ui:ui-tooling-preview` dependency (via BOM, debug only)
- **FR-008**: Gradle MUST add `androidx.compose.ui:ui-tooling` dependency (via BOM, debug only)
- **FR-009**: Gradle MUST add `androidx.compose.ui:ui-test-manifest` dependency (debug only, for test activity)
- **FR-010**: Gradle MUST replace `androidx.navigation:navigation-fragment-ktx` with `androidx.navigation:navigation-compose`
- **FR-011**: Gradle MUST replace `androidx.hilt:hilt-navigation-fragment` with `androidx.hilt:hilt-navigation-compose` version `1.2.0`
- **FR-012**: Gradle MUST replace `io.coil-kt:coil` with `io.coil-kt:coil-compose` version `2.7.0`
- **FR-013**: Gradle MUST add `androidx.compose.material3:material3-window-size-class` for adaptive layout (via BOM)
- **FR-014**: Gradle MUST add `androidx.compose.ui:ui-test-junit4` for Compose UI testing (test dependency, via BOM)
- **FR-015**: Gradle MUST add `androidx.activity:activity-compose` for `setContent` and `rememberLauncherForActivityResult` (via BOM)
- **FR-016**: Gradle MUST add `androidx.lifecycle:lifecycle-viewmodel-compose` for `hiltViewModel()` and `collectAsStateWithLifecycle` (see lifecycle version)
- **FR-017**: Gradle MUST add `androidx.lifecycle:lifecycle-runtime-compose` for `collectAsStateWithLifecycle` (see lifecycle version)

#### Dependency Removal
- **FR-018**: Gradle MUST remove `androidx.appcompat` (no longer needed; Activity 1.9.3 Compose APIs suffice)
- **FR-019**: Gradle MUST remove `androidx.constraintlayout` (replaced by Compose `ConstraintLayout` if needed)
- **FR-020**: Gradle MUST remove `androidx.recyclerview` (replaced by Compose `LazyColumn`)
- **FR-021**: Gradle MUST remove `androidx.cardview` (replaced by Compose `Card`)
- **FR-022**: Gradle MUST remove `androidx.coordinatorlayout` (replaced by Compose `Scaffold`)
- **FR-023**: Gradle MUST remove `androidx.leanback` (replaced by `WindowSizeClass` adaptation)
- **FR-024**: Gradle MUST remove `com.google.android.material:material` (MDC, replaced by Material 3 Compose)
- **FR-025**: Gradle MUST remove `androidx.navigation:navigation-fragment-ktx` (replaced by navigation-compose)
- **FR-026**: Gradle MUST remove `androidx.navigation:navigation-ui-ktx` (replaced by navigation-compose)
- **FR-027**: Gradle MUST remove `androidx.hilt:hilt-navigation-fragment` (replaced by hilt-navigation-compose)
- **FR-028**: Gradle MUST remove `io.coil-kt:coil` (replaced by `coil-compose`)
- **FR-029**: Gradle MUST remove `androidx.fragment:fragment-ktx` (Fragments eliminated)

#### Theme System
- **FR-030**: App MUST define a `HdHomeyTheme` composable wrapping `MaterialTheme` with a custom `darkColorScheme`
- **FR-031**: `darkColorScheme` MUST use the canonical HD Homey color values from `DESIGN.md`:
  - `primary` = `#2563eb` (hd_homey_blue)
  - `onPrimary` = `#ffffff`
  - `primaryContainer` = `#1e3a8a`
  - `onPrimaryContainer` = `#dbeafe`
  - `secondary` = `#2563eb` (same as primary; single accent)
  - `onSecondary` = `#ffffff`
  - `background` = `#1a1a1a` (background_dark)
  - `onBackground` = `#f0f0f0` (text_primary)
  - `surface` = `#2a2a2a` (surface_dark)
  - `onSurface` = `#f0f0f0` (text_primary)
  - `surfaceVariant` = `#3a3a3a` (surface_dark_elevated)
  - `onSurfaceVariant` = `#b3b3b3` (text_secondary)
  - `outline` = `#404040` (color_border)
  - `error` = `#ff5555` (error_red)
  - `onError` = `#ffffff`
  - `errorContainer` = `#7f1d1d` (color_error_bg)
  - `onErrorContainer` = `#fecaca`
- **FR-032**: `HdHomeyTheme` MUST define `ExtendedColors` object for non-M3-standard colors:
  - `success` = `#10b981`
  - `successContainer` = `#064e3b`
  - `warning` = `#f59e0b`
  - `warningContainer` = `#78350f`
  - `info` = `#3b82f6`
  - `infoContainer` = `#1e3a8a`
  - `textTertiary` = `#909090`
  - `textDisabled` = `#666666`
- **FR-033**: `ExtendedColors` MUST be accessible via `MaterialTheme.extendedColors` using `CompositionLocal`
- **FR-034**: `HdHomeyTheme` MUST set `MaterialTheme.typography` with M3 type scale mapped from `DESIGN.md`:
  - `headlineLarge` = 48sp → TV screen titles
  - `headlineMedium` = 32sp → channel names, section titles
  - `headlineSmall` = 24sp → card titles, sub-headings
  - `titleLarge` = 20sp → server/channel names (card titles)
  - `titleMedium` = 16sp → body text
  - `titleSmall` = 14sp → captions, labels
  - `bodyLarge` = 16sp → body text
  - `bodyMedium` = 14sp → secondary text
  - `bodySmall` = 12sp → timestamps, fine print
  - `labelLarge` = 14sp → button text
  - `labelMedium` = 12sp → badges, helper text
  - `labelSmall` = 10sp → overlines, tiny labels
- **FR-035**: `HdHomeyTheme` MUST set `MaterialTheme.shapes` with custom `RoundedCornerShape` values:
  - `small` = `RoundedCornerShape(4.dp)` → badges, tags
  - `medium` = `RoundedCornerShape(8.dp)` → cards, inputs, buttons
  - `large` = `RoundedCornerShape(12.dp)` → dialogs, modals (TV: 12dp for channel cards)

#### Navigation
- **FR-036**: App MUST use Navigation Compose (`NavHost`, `composable`, `rememberNavController`)
- **FR-037**: All route definitions MUST be type-safe `@Serializable` objects/data classes:
  ```kotlin
  @Serializable object ServerList
  @Serializable object AddServer
  @Serializable data class ServerSetup(val serverId: String)
  @Serializable data class Authentication(val serverId: String)
  @Serializable data class ChannelList(val serverId: String? = null)
  @Serializable data class Player(val channelId: String, val channelName: String)
  @Serializable object Success
  ```
- **FR-038**: `PlayerActivity` MUST be removed; the player screen MUST be a composable destination within the `NavHost`
- **FR-039**: Back stack management MUST match current behavior:
  - `ServerList` → back exits app
  - `AddServer` → back returns to `ServerList`
  - `Authentication` → back returns to `ServerList`
  - `Success` → back returns to either `ServerList` or `ChannelList` (based on origin)
  - `ChannelList` → back returns to `ServerList`
  - `Player` → back returns to `ChannelList`
- **FR-040**: `MainActivity` MUST use `setContent { HdHomeyTheme { NavHost(...) } }` with `ComponentActivity.setContent` (from activity-compose)

#### Screen Migration: ServerList
- **FR-041**: `ServerListScreen` MUST be a `@Composable` function in `ui/servers/ServerListScreen.kt`
- **FR-042**: MUST display servers in a `LazyColumn` with each server as a `Card` with:
  - Server name (title)
  - Server URL (secondary text)
  - Authentication status indicator (colored dot: green=authenticated, red=not, yellow=expired)
  - Active server badge
  - User info line ("username (role)")
- **FR-043**: MUST support three states via sealed interface (`AsyncState<T>` pattern):
  - `Loading` → skeleton shimmer (5 placeholder cards)
  - `Error` → error message + retry button
  - `Success` → server list or empty state
- **FR-044**: Empty state MUST show welcome message, instructions, and hint about the + FAB
- **FR-045**: FAB (`+` icon) MUST navigate to `AddServer` route
- **FR-046**: Clicking a server card MUST navigate to `ChannelList(serverId)` if authenticated, or `Authentication(serverId)` if not
- **FR-047**: MUST have a top app bar with title "Your Servers" and settings icon (future use)

#### Screen Migration: AddServer
- **FR-048**: `AddServerScreen` MUST be a `@Composable` function in `ui/servers/AddServerScreen.kt`
- **FR-049**: MUST show a form with:
  - Server name text field (outlined)
  - Server URL text field (outlined, pre-filled with `http://` or `https://`)
  - Connect button (primary, disabled while testing)
  - Cancel button (outlined)
- **FR-050**: Connect button MUST test connectivity before saving; show "Testing connection…" state
- **FR-051**: On success, MUST save server and navigate back to `ServerList`
- **FR-052**: On failure, MUST show error inline (not dialog) without losing form data
- **FR-053**: URL validation MUST check scheme (`http://` or `https://`) before connecting

#### Screen Migration: Authentication
- **FR-054**: `AuthenticationScreen` MUST be a `@Composable` function in `ui/auth/AuthenticationScreen.kt`
- **FR-055**: MUST display pairing options in a column/column-based layout:
  - Title: "Pair with {serverName}"
  - Device code display (large monospace text, e.g., 96sp)
  - QR code generated with ZXing (rendered as `ImageBitmap`)
  - Expiry countdown timer
  - "Try Again" button when code expires
- **FR-056**: MUST poll backend `/api/auth/device/poll` every 3 seconds until authorized, expired, or cancelled
- **FR-057**: On authorization success, MUST navigate to either `Success` (from server list) or `ChannelList(serverId)` (from setup)
- **FR-058**: Back press during polling MUST cancel the polling coroutine and return to `ServerList`
- **FR-059**: Code expiry MUST be handled gracefully — show message "Code expired. Please try again." with retry option

#### Screen Migration: Success
- **FR-060**: `SuccessScreen` MUST be a `@Composable` function in `ui/success/SuccessScreen.kt`
- **FR-061**: MUST show confirmation UI: checkmark icon, "You're Connected!" title, user/server info, and action buttons:
  - "View Channels" (primary) → navigates to `ChannelList(serverId)`
  - "Back to Servers" (outlined) → navigates to `ServerList`

#### Screen Migration: ChannelList
- **FR-062**: `ChannelListScreen` MUST be a `@Composable` function in `ui/channels/ChannelListScreen.kt`
- **FR-063**: MUST use `ChannelListViewModel` (existing, unchanged) via `hiltViewModel()`
- **FR-064**: MUST display channels in a `LazyColumn` with each channel as a `Card` showing:
  - Channel logo loaded via `coil-compose` `AsyncImage` (placeholder fallback)
  - Channel number
  - Channel name
  - HD badge (styled chip, if applicable)
  - Favorite star icon (toggleable, if favorites feature is active)
- **FR-065**: MUST support three states via `AsyncState<ChannelListUiState>`:
  - `Loading` → shimmer skeleton for channel items
  - `Error` → error message with retry button
  - `Success` → channel list or empty state
- **FR-066**: Empty state MUST show "No channels found" with refresh suggestion
- **FR-067**: Top app bar MUST show tuner/server name and a refresh icon button
- **FR-068**: Channel click MUST navigate to `Player(channelId, channelName)` with stream token generation
- **FR-069**: Favorite toggle MUST call ViewModel to persist preference

#### Screen Migration: Player
- **FR-070**: `PlayerScreen` MUST be a `@Composable` function in `ui/player/PlayerScreen.kt` (replaces `PlayerActivity`)
- **FR-071**: MUST use `PlayerViewModel` (existing, unchanged) via `hiltViewModel()` scoped to the NavBackStackEntry
- **FR-072**: MUST embed ExoPlayer `PlayerView` via `AndroidView` interop with `remember` for `ExoPlayer` instance
- **FR-073**: Player controls overlay MUST be Composable layers on top of `AndroidView`:
  - Channel name/number overlay (top, semi-transparent)
  - Play/pause button overlay (center, visible on tap)
  - Exit button overlay (top-left, always visible)
  - Auto-hide controls after 3 seconds of inactivity (tap to show)
- **FR-074**: Player lifecycle MUST be managed via `DisposableEffect` — player created in `LaunchedEffect`, released in `DisposableEffect.onDispose`
- **FR-075**: MUST support MPEG-2 TS primary stream with automatic fallback to HLS on `ERROR_CODE_DECODER_INIT_FAILED` (same logic as current `PlayerActivity`)
- **FR-076**: Back press MUST stop playback, release player, and navigate back to `ChannelList`
- **FR-077**: Loading state MUST show buffering spinner
- **FR-078**: Error state MUST show error message with retry button
- **FR-079**: Exit dialog (confirmation) MUST show as a `Dialog` composable when user presses back during active playback

#### Android TV Adaptation via WindowSizeClass
- **FR-080**: App MUST use `calculateCurrentWindowSizeClass()` from `material3-window-size-class` to detect form factor
- **FR-081**: App MUST use `LocalConfiguration` to check if device is TV via `Configuration.UI_MODE_TYPE_TELEVISION`
- **FR-082**: TV detection strategy:
  ```kotlin
  val isTv = LocalConfiguration.current.uiMode and
      Configuration.UI_MODE_TYPE_MASK == Configuration.UI_MODE_TYPE_TELEVISION
  ```
- **FR-083**: TV layout adjustments MUST include:
  - Larger margins (48dp for screen edges, 32dp between sections)
  - Larger text (use `headlineMedium` for titles, `titleLarge` for card text)
  - Card corner radius 12dp (vs 8dp on mobile)
  - `Modifier.onFocus { }` for elevation-based focus indicators
  - Minimum touch targets 48dp enforced via `Modifier.defaultMinSize(minWidth = 48.dp, minHeight = 48.dp)`
- **FR-084**: Phone/tablet layout adjustments MUST include:
  - Standard 16dp margins
  - M3 default type scale (no size amplification)
  - `Modifier.clickable` with ripple (no D-pad focus management)
- **FR-085**: Adaptive layout decision MUST be encapsulated in a composable wrapper or `ProvideAdaptiveValues` `CompositionLocal`

#### DI Changes
- **FR-086**: ViewModels in Compose screens MUST use `hiltViewModel()` instead of `by viewModels()` or `hiltNavGraphViewModels()`
- **FR-087**: `hiltViewModel()` MUST be called with the appropriate `NavBackStackEntry` scope to match Fragment lifecycle scoping
- **FR-088**: Hilt `@AndroidEntryPoint` remains on `MainActivity` and `HdHomeyApplication`; Fragments removed means only Activity-level and Application-level components remain
- **FR-089**: All fragment-scoped Hilt injection points MUST be migrated to composable-scoped injection via `hiltViewModel()`

#### Testing
- **FR-090**: Compose UI tests MUST use `createComposeRule()` from `androidx.compose.ui.test.junit4`
- **FR-091**: Existing ViewModel unit tests MUST continue to pass without modification
- **FR-092**: Each screen composable MUST have at least a basic Compose UI test verifying:
  - Composables render without crash
  - Key UI elements are visible
  - Empty/error/loading states display correctly
- **FR-093**: Navigation tests MUST verify route transitions match current `nav_graph.xml` behavior
- **FR-094**: `createComposeRule` MUST be configured with `useUnrestrictedCompose = true` for test compatibility with Compose 1.11 (v2 testing APIs are default)

#### Cleanup
- **FR-095**: All files listed in the "Current Architecture (Pre-Migration)" deletion tables MUST be deleted from version control
- **FR-096**: `res/values/themes.xml` MUST be deleted (replaced by Compose `HdHomeyTheme`)
- **FR-097**: `res/values/colors.xml` and `res/values/dimens.xml` MAY remain as string resources are still accessed via `R.string.*` (for string resources only); if they contain only Compose-replaced values they MUST be deleted
- **FR-098**: After cleanup, `./gradlew assembleDebug` MUST succeed with no resource-not-found errors

### Non-Functional Requirements

#### Performance
- **NFR-001**: Cold start time MUST NOT increase by more than 200ms compared to pre-migration baseline
- **NFR-002**: Channel list scroll performance MUST maintain 60fps (profile with Compose Layout Inspector)
- **NFR-003**: Video player startup MUST remain under 3 seconds (no regression from current Media3 ExoPlayer)

#### Compatibility
- **NFR-004**: App MUST continue to support Android 9+ (API level 28+) — no minSdk change
- **NFR-005**: App MUST continue to work on Android TV, tablets (7"+), and phones (4"+)
- **NFR-006**: Landscape orientation MUST remain default on TV; portrait MUST work on phones

#### Code Quality
- **NFR-007**: Compose code MUST use `@Composable` annotations and follow Compose conventions (state hoisting, no side effects in composition)
- **NFR-008**: All composable functions MUST have preview annotations (`@Preview`, `@Preview(uiMode = Configuration.UI_MODE_NIGHT_YES)`)
- **NFR-009**: No `Fragment` subclasses or `FragmentManager` references in new code
- **NFR-010**: No `LayoutInflater`, `ViewGroup`, `viewBinding` usage in new code

#### Build
- **NFR-011**: Debug APK size MUST NOT increase by more than 2MB (Compose adds ~1.5MB to APK)
- **NFR-012**: Build time MUST NOT increase by more than 30 seconds

### Architecture Overview (Post-Migration)

```
apps/android/app/src/main/java/com/hdhomey/app/
├── api/                        [KEEP — no changes]
├── data/                       [KEEP — no changes]
├── di/                         [KEEP — no changes]
├── domain/                     [KEEP — no changes]
├── player/                     [KEEP — no changes]
├── storage/                    [KEEP — no changes]
├── ui/
│   ├── theme/
│   │   ├── HdHomeyTheme.kt     [NEW — MaterialTheme wrapper]
│   │   ├── Color.kt            [NEW — Color definitions from DESIGN.md]
│   │   ├── Type.kt             [NEW — M3 Typography scale]
│   │   ├── Shape.kt            [NEW — M3 Shapes]
│   │   └── ExtendedColors.kt   [NEW — success/warning/info + CompositionLocal]
│   ├── components/
│   │   ├── ShimmerEffect.kt    [NEW — reusable skeleton loading]
│   │   ├── AsyncStateContent.kt[NEW — sealed-class state handler]
│   │   ├── AdaptiveLayout.kt   [NEW — WindowSizeClass composition locals]
│   │   └── ChannelCard.kt      [NEW — reusable channel card]
│   ├── navigation/
│   │   ├── Routes.kt           [NEW — @Serializable route definitions]
│   │   ├── NavGraph.kt         [NEW — NavHost setup with composable() calls]
│   │   └── NavigationActions.kt[NEW — typed navigation helper functions]
│   ├── servers/
│   │   ├── ServerListScreen.kt [NEW — composable replacing Fragment]
│   │   ├── AddServerScreen.kt  [NEW — composable replacing Fragment]
│   │   └── ServerListAdapter.kt[DELETE]
│   │   ├── ServerListFragment.kt[DELETE]
│   │   └── AddServerFragment.kt[DELETE]
│   ├── auth/
│   │   ├── AuthenticationScreen.kt[NEW — composable replacing Fragment]
│   │   └── AuthenticationFragment.kt[DELETE]
│   ├── success/
│   │   ├── SuccessScreen.kt    [NEW — composable replacing Fragment]
│   │   └── SuccessFragment.kt  [DELETE]
│   ├── channels/
│   │   ├── ChannelListScreen.kt[NEW — composable replacing Fragment]
│   │   ├── ChannelListFragment.kt[DELETE]
│   │   └── ChannelAdapter.kt    [DELETE]
│   │   ├── ChannelListViewModel.kt[KEEP]
│   │   └── ChannelListUiState.kt[KEEP]
│   └── player/
│       ├── PlayerScreen.kt     [NEW — composable replacing PlayerActivity]
│       ├── PlayerActivity.kt   [DELETE]
│       ├── PlayerControlsView.kt[DELETE]
│       ├── PlayerViewModel.kt  [KEEP]
│       └── PlayerUiState.kt   [KEEP]
├── util/                       [KEEP — no changes]
├── HdHomeyApplication.kt       [KEEP — no changes]
└── MainActivity.kt             [REWRITE — setContent + NavHost]
```

### Key Architectural Patterns

#### AsyncState Pattern (replaces Fragment-based state management)
```kotlin
sealed interface AsyncState<out T> {
    data object Loading : AsyncState<Nothing>
    data class Success<T>(val data: T) : AsyncState<T>
    data class Error(val message: String, val cause: Throwable? = null) : AsyncState<Nothing>
}

@Composable
fun <T> AsyncStateContent(
    state: AsyncState<T>,
    onRetry: () -> Unit,
    loadingContent: @Composable () -> Unit = { ShimmerEffect() },
    emptyCheck: (T) -> Boolean = { false },
    emptyContent: @Composable () -> Unit,
    content: @Composable (T) -> Unit
) {
    when (state) {
        is AsyncState.Loading -> loadingContent()
        is AsyncState.Error -> ErrorContent(message = state.message, onRetry = onRetry)
        is AsyncState.Success -> {
            if (emptyCheck(state.data)) emptyContent()
            else content(state.data)
        }
    }
}
```

#### Adaptive Layout via WindowSizeClass
```kotlin
@Composable
fun AdaptiveMargins(
    content: @Composable (PaddingValues) -> Unit
) {
    val windowSizeClass = currentWindowAdaptiveInfo().windowSizeClass
    val isTv = LocalConfiguration.current.uiMode and
        Configuration.UI_MODE_TYPE_MASK == Configuration.UI_MODE_TYPE_TELEVISION
    
    val horizontalMargin = when {
        isTv -> 48.dp
        windowSizeClass.windowWidthSizeClass == WindowWidthSizeClass.Compact -> 16.dp
        else -> 24.dp
    }
    
    content(PaddingValues(horizontal = horizontalMargin, vertical = 16.dp))
}
```

#### CompositionLocal for Extended Colors
```kotlin
data class ExtendedColors(
    val success: Color,
    val successContainer: Color,
    val warning: Color,
    val warningContainer: Color,
    val info: Color,
    val infoContainer: Color,
    val textTertiary: Color,
    val textDisabled: Color
)

val LocalExtendedColors = staticCompositionLocalOf {
    ExtendedColors(
        success = Color.Unspecified,
        successContainer = Color.Unspecified,
        warning = Color.Unspecified,
        warningContainer = Color.Unspecified,
        info = Color.Unspecified,
        infoContainer = Color.Unspecified,
        textTertiary = Color.Unspecified,
        textDisabled = Color.Unspecified
    )
}

val MaterialTheme.extendedColors: ExtendedColors
    get() = LocalExtendedColors.current
```

#### ExoPlayer AndroidView Interop
```kotlin
@Composable
fun ExoPlayerView(
    player: ExoPlayer,
    modifier: Modifier = Modifier
) {
    AndroidView(
        factory = { context ->
            PlayerView(context).apply {
                this.player = player
                useController = false  // We supply our own Compose controls overlay
            }
        },
        modifier = modifier.fillMaxSize()
    )
}
```

---

## Screen Migration Order (Dependency-Ordered)

### Wave 1: Foundation (must complete first)
| Step | Component | Dependencies | Files Created |
|------|-----------|--------------|---------------|
| 1.1 | Build config changes | None (start immediately) | `build.gradle.kts`, `libs.versions.toml` |
| 1.2 | Theme system | 1.1 | `Color.kt`, `Type.kt`, `Shape.kt`, `ExtendedColors.kt`, `HdHomeyTheme.kt` |
| 1.3 | Shared components | 1.2 | `ShimmerEffect.kt`, `AsyncStateContent.kt`, `AdaptiveLayout.kt` |
| 1.4 | Navigation routes | 1.1 | `Routes.kt`, `NavGraph.kt`, `NavigationActions.kt` |
| 1.5 | MainActivity rewrite | 1.2, 1.3, 1.4 | `MainActivity.kt` (rewrite) |

**Rationale**: Theme, components, and navigation are prerequisites for every screen. Without these, no screen can compile.

### Wave 2: Core Screens (highest user impact)
| Step | Component | Dependencies | Files Created |
|------|-----------|--------------|---------------|
| 2.1 | ServerListScreen | 1.2, 1.3, 1.5 | `ServerListScreen.kt` |
| 2.2 | ChannelListScreen | 1.2, 1.3, 1.5 | `ChannelListScreen.kt`, `ChannelCard.kt` |

**Rationale**: Server list is the launch screen; channel list is the primary content screen. These must work first for end-to-end testing.

### Wave 3: Player (requires ChannelList)
| Step | Component | Dependencies | Files Created |
|------|-----------|--------------|---------------|
| 3.1 | PlayerScreen | 1.2, 1.3, 1.5 | `PlayerScreen.kt` |

**Rationale**: Player depends on ChannelList (navigation from channel click). Video playback is the core feature that needs the most careful migration.

### Wave 4: Secondary Screens
| Step | Component | Dependencies | Files Created |
|------|-----------|--------------|---------------|
| 4.1 | AddServerScreen | 1.2, 1.3, 1.5 | `AddServerScreen.kt` |
| 4.2 | AuthenticationScreen | 1.2, 1.3, 1.5 | `AuthenticationScreen.kt` |
| 4.3 | SuccessScreen | 1.2, 1.3, 1.5 | `SuccessScreen.kt` |

**Rationale**: These are standard forms with no dependencies on core screens. Can be done in any order.

### Wave 5: Cleanup
| Step | Component | Dependencies | Files Created/Deleted |
|------|-----------|--------------|----------------------|
| 5.1 | Delete old layouts | All waves complete | Deletes: 12 XML layouts |
| 5.2 | Delete old drawables | All waves complete | Deletes: 5 XML drawables |
| 5.3 | Delete navigation XML | All waves complete | Deletes: nav_graph.xml |
| 5.4 | Delete animator | All waves complete | Deletes: card_lift.xml |
| 5.5 | Delete themes.xml | All waves complete | Deletes: themes.xml |
| 5.6 | Remove buildFeatures viewBinding | All waves complete | Modifies: build.gradle.kts |
| 5.7 | Remove unused dependencies | All waves complete | Modifies: libs.versions.toml, build.gradle.kts |
| 5.8 | Run full test suite | All waves complete | Verify: all tests pass |

---

## Acceptance Criteria

### Build and Compilation
- [ ] **AC-001**: `./gradlew assembleDebug` compiles with zero errors
- [ ] **AC-002**: `./gradlew lintDebug` passes with zero errors
- [ ] **AC-003**: `./gradlew kspKotlinDebug` completes (Hilt processing succeeds)
- [ ] **AC-004**: No XML layout files remain in `res/layout/`
- [ ] **AC-005**: No Fragment subclasses remain in source tree
- [ ] **AC-006**: `viewBinding = true` removed from `build.gradle.kts`
- [ ] **AC-007**: `Leanback`, `AppCompat`, `RecyclerView`, `CardView`, `CoordinatorLayout`, `ConstraintLayout`, `navigation-fragment-ktx`, `navigation-ui-ktx`, `hilt-navigation-fragment`, and `coil` (plain) removed from dependencies
- [ ] **AC-008**: `compose-bom`, `material3`, `navigation-compose`, `coil-compose`, `activity-compose`, `hilt-navigation-compose`, and `material3-window-size-class` added to dependencies
- [ ] **AC-009**: `org.jetbrains.kotlin.plugin.compose` plugin added

### Tests
- [ ] **AC-010**: All existing ViewModel unit tests pass (`./gradlew testDebug`)
- [ ] **AC-011**: Compose UI tests exist for each screen composable and pass
- [ ] **AC-012**: Navigation tests verify all route transitions work correctly
- [ ] **AC-013**: Full test suite passes: `./gradlew testDebug`

### Functional Parity
- [ ] **AC-014**: Server list displays, loads, and handles empty/error states identically to pre-migration
- [ ] **AC-015**: Add server form works (validation, test connection, save)
- [ ] **AC-016**: Authentication flow (QR, device code, code expiry, success) works
- [ ] **AC-017**: Channel list loads, displays thumbnails, supports refresh
- [ ] **AC-018**: Video player opens, plays stream, controls work (play/pause/exit)
- [ ] **AC-019**: Back navigation matches pre-migration behavior at every screen
- [ ] **AC-020**: All three state patterns (loading/error/success) display correctly on every data-driven screen

### TV Adaptation
- [ ] **AC-021**: App runs on Android TV emulator with D-pad navigation working
- [ ] **AC-022**: Focus indicators visible on TV
- [ ] **AC-023**: TV uses larger margins and text sizes
- [ ] **AC-024**: Leanback theme is not referenced anywhere

### Phone/Tablet Adaptation
- [ ] **AC-025**: App runs on phone emulator with touch navigation working
- [ ] **AC-026**: App runs on tablet emulator (600dp+ width) with adapted layout
- [ ] **AC-027**: Orientation change does not crash (portrait and landscape)

### APK and Size
- [ ] **AC-028**: Debug APK builds and is under 25MB
- [ ] **AC-029**: Release APK with minification succeeds

---

## Edge Cases

### Player Lifecycle
- **Scenario**: User navigates away (back) while video is playing
- **Handling**: Show exit confirmation dialog ("Stop Watching?"). If confirmed, release player and navigate back. If cancelled, stay on player.

### Authentication During Polling
- **Scenario**: User presses back while authentication polling is active
- **Handling**: Cancel the polling coroutine via `DisposableEffect` cleanup. Navigate back to server list.

### WindowSizeClass Transition
- **Scenario**: User resizes a freeform window or changes DPI settings
- **Handling**: `WindowSizeClass` recalculates automatically; layouts reflow via state-driven recomposition.

### ServerSetupFragment Legacy
- **Scenario**: The current `ServerSetupFragment` is a legacy screen from Phase 1 that was superseded by `AddServerFragment` + `AuthenticationFragment`
- **Handling**: Do not migrate `ServerSetupFragment`. Remove it entirely. The `fragment_server_setup.xml` layout and `discovering_server`, `manual_setup` strings in `strings.xml` are also deleted.

### No Longer Needed Screens
- **Scenario**: `item_server_skeleton.xml` is a skeleton loading view used by the old RecyclerView adapter
- **Handling**: Replace with Compose `ShimmerEffect` composable — no equivalent XML/drawable needed.

### HiltViewModel Scoping
- **Scenario**: `ChannelListViewModel` is currently scoped via `hiltNavGraphViewModels()` in the Fragment
- **Handling**: Use `hiltViewModel<ChannelListViewModel>()` in the composable. The ViewModel is automatically scoped to the `NavBackStackEntry`. No additional Hilt configuration needed.

### ExoPlayer Instance Cleanup
- **Scenario**: User navigates away from player without explicit exit (e.g., system kills the activity)
- **Handling**: `DisposableEffect` in `PlayerScreen` handles `onDispose` to release the `ExoPlayer` instance and cancel any in-flight stream token requests.

### Compose 1.11 v2 Testing API
- **Scenario**: UI tests fail because coroutines no longer execute immediately (v2 APIs default in Compose 1.11)
- **Handling**: Tests MUST use `advanceUntilIdle()` or `runOnIdle` to advance the virtual clock. See [Compose testing migration guide](https://developer.android.com/develop/ui/compose/testing/migrations/testing-v2).

---

## Out of Scope

- ❌ **New user-facing features** — No behavior changes beyond what's needed for Compose migration
- ❌ **ViewModel refactoring** — ViewModels keep their existing APIs; only the UI layer changes
- ❌ **Data layer changes** — No changes to repositories, API interfaces, domain models, or storage
- ❌ **Performance optimization** — Do not introduce performance regressions, but no dedicated optimization work
- ❌ **Fire TV / Amazon adaptation** — Not adding Fire TV support (see 013 out of scope)
- ❌ **PiP mode** — Legacy `PlayerActivity` had PiP; not re-implementing in Compose (out of scope per 013)
- ❌ **Leanback migration** — Option A: WindowSizeClass, not Leanback. Confirmed.

---

## Dependencies

### Prerequisites (Already Complete)
- ✅ **013-android-app Phase 1** — Server management, authentication, app structure complete
- ✅ **013-android-app Phase 2** — Channel browsing, streaming, ViewModels, ExoPlayer integrated
- ✅ **DESIGN.md v1** — Canonical design language documented
- ✅ **Kotlin 2.2.10** — Compose compiler built into Kotlin plugin (no separate version management)
- ✅ **AGP 9.2.1** — Compatible with Compose 1.11
- ✅ **Gradle version catalog** — Already uses `libs.versions.toml`

### Blocks
- None — this migration is self-contained within the Android app

### Related To
- **SPEC-013** — Android App (this is the Compose migration of that app's UI layer)
- **DESIGN.md** — Source of truth for color tokens mapped to Compose theme
- **SPEC-015** — Signal Monitoring (future feature that will build on Compose UI)

---

## Technical Decisions & Rationale

### Why Compose BOM 2026.06.00 (Compose 1.11)?
**Decision**: Use the latest stable Compose BOM (`2026.06.00`) which maps to Compose 1.11.0 core modules.

**Rationale**:
- ✅ Compose 1.11 is the current stable release (April 2026)
- ✅ BOM ensures all Compose libraries are version-compatible
- ✅ Kotlin 2.2.10 (in use) is fully compatible with the Compose Compiler plugin (built into Kotlin since 2.0)
- ✅ `material3-window-size-class` is stable and production-ready
- ⚠️ Note: Compose 1.11 v2 testing APIs are default — ensure tests use `advanceUntilIdle()`

### Why WindowSizeClass over Leanback?
**Decision**: Use `WindowSizeClass` + `Configuration.UI_MODE_TYPE_TELEVISION` detection, not Leanback.

**Rationale**:
- ✅ Leanback is a View/Fragment-era library with no Compose-native support
- ✅ `WindowSizeClass` is the modern, Google-recommended approach for adaptive Compose layouts
- ✅ No `Theme.Leanback` dependency avoids issues with Android TV theming conflicts
- ✅ Single APK works on TV, tablet, and phone without separate Leanback module
- ✅ Eliminates ~500KB of Leanback library code from the APK
- ✅ Aligned with DESIGN.md §9.1 (Platform-Specific Adaptations)

### Why No Coexistence Period?
**Decision**: Delete all XML layouts and Fragments simultaneously with the Compose migration.

**Rationale**:
- ✅ Simpler mental model — no "which screens are migrated?" tracking
- ✅ No need to maintain two UI frameworks and their interaction
- ✅ Build breaks if any View-based code remains (strong enforcement)
- ✅ The migration is relatively small (10 screens) and can be completed in one wave
- ✅ `FragmentContainerView` + Compose interop adds complexity without benefit

**Tradeoff**:
- ❌ Larger single PR — but the migration is systematic and well-defined

### Why Preserve ViewModels As-Is?
**Decision**: Do not refactor ViewModels — only change how the UI consumes them.

**Rationale**:
- ✅ ViewModels already return `StateFlow` and are `@HiltViewModel`
- ✅ Fragments use `hiltNavGraphViewModels()` → composables use `hiltViewModel()` — same semantics
- ✅ Minimizes risk: data layer + state management unchanged
- ✅ If `ChannelListUiState` uses `@Parcelize`, it can become a plain data class (Compose doesn't require `Parcelable`)

### Why Kotlin Compose Plugin (Not `composeOptions`)?
**Decision**: Use `org.jetbrains.kotlin.plugin.compose` instead of the old `composeOptions { kotlinCompilerExtensionVersion }`.

**Rationale**:
- ✅ Kotlin 2.0+ moved the Compose compiler into the Kotlin repository
- ✅ The Kotlin Compose plugin (`kotlin("plugin.compose")`) ties the Compose compiler to the Kotlin version
- ✅ Eliminates version mismatch between Kotlin and Compose compiler
- ✅ Simpler configuration: `alias(libs.plugins.kotlin.compose)` is all that's needed

---

## Design Alignment

### Color Mapping: XML values → Compose `Color` Objects

| XML Resource (old) | Compose Color (new) | DESIGN.md Token |
|--------------------|---------------------|-----------------|
| `@color/hd_homey_blue` | `Color(0xFF2563EB)` | `--color-accent` |
| `@color/hd_homey_blue_dark` | `Color(0xFF1D4ED8)` | `--color-accent-hover` |
| `@color/background_dark` | `Color(0xFF1A1A1A)` | `--color-bg-primary` |
| `@color/surface_dark` | `Color(0xFF2A2A2A)` | `--color-bg-secondary` |
| `@color/surface_dark_elevated` | `Color(0xFF3A3A3A)` | `--color-bg-tertiary` |
| `@color/text_primary` | `Color(0xFFF0F0F0)` | `--color-text-primary` |
| `@color/text_secondary` | `Color(0xFFB3B3B3)` | `--color-text-secondary` |
| `@color/text_tertiary` | `Color(0xFF909090)` | `--color-text-tertiary` |
| `@color/color_border` | `Color(0xFF404040)` | `--color-border` |
| `@color/color_border_hover` | `Color(0xFF505050)` | `--color-border-hover` |
| `@color/color_text_disabled` | `Color(0xFF666666)` | `--color-text-disabled` |
| `@color/success_green` | `Color(0xFF10B981)` | `--color-success` |
| `@color/error_red` | `Color(0xFFFF5555)` | `--color-error` |
| `@color/warning_yellow` | `Color(0xFFF59E0B)` | `--color-warning` |
| `@color/color_success_bg` | `Color(0xFF064E3B)` | success background |
| `@color/color_error_bg` | `Color(0xFF7F1D1D)` | error background |
| `@color/color_warning_bg` | `Color(0xFF78350F)` | warning background |
| `@color/color_info` | `Color(0xFF3B82F6)` | info color |
| `@color/color_info_bg` | `Color(0xFF1E3A8A)` | info background |

All values are already aligned with `DESIGN.md` per the FR-029..FR-045 changes applied in SPEC-013 v1.5.

### Theme XML → Compose Theme

| XML File | Compose Replacement |
|----------|---------------------|
| `Base.Theme.HdHomey` (AppCompat theme) | `HdHomeyTheme` → `MaterialTheme(colorScheme = darkHdHomeyColorScheme(), ...)` |
| `Theme.HdHomey.Leanback` (Leanback theme) | Deleted — adaptation via `WindowSizeClass` runtime check |
| `TextAppearance.HdHomey.Title` | `MaterialTheme.typography.headlineMedium` |
| `TextAppearance.HdHomey.Code` | Monospace via `FontFamily.Monospace` with `MaterialTheme.typography.displayLarge` |

---

## Testing Strategy

### Unit Tests (Existing — Preserved)
- `./gradlew testDebug` — all existing ViewModel/Repository/Service tests continue to pass
- No changes to test logic for business logic

### New Compose UI Tests
- **Framework**: `androidx.compose.ui.test.junit4.ComposeTestRule` with `createComposeRule()`
- **Pattern**: Each screen composable gets a test class:
  - `ServerListScreenTest` — verify list, empty state, error state
  - `AddServerScreenTest` — verify form, validation, connectivity test
  - `AuthenticationScreenTest` — verify code display, QR, expiry
  - `ChannelListScreenTest` — verify list, loading, error, empty
  - `PlayerScreenTest` — verify controls overlay renders
  - `SuccessScreenTest` — verify confirmation display
- **Navigation tests**: Use `NavHost` with route verification

### Compose 1.11 Testing v2 Migration
Since Compose BOM `2026.06.00` uses Compose 1.11.0 where v2 testing APIs are default:
- Use `runOnIdle` and `advanceUntilIdle` instead of relying on `UnconfinedTestDispatcher`
- Use `createComposeRule` (no argument needed for default behavior)
- Reference: [Compose v2 testing migration guide](https://developer.android.com/develop/ui/compose/testing/migrations/testing-v2)

### Instrumentation Tests
- `./gradlew connectedDebugAndroidTest` — existing Espresso tests are removed (they tested View system)
- Replace with Compose UI instrumentation tests using `createAndroidComposeRule<MainActivity>()`

---

## Clarifications

- [ ] **Q1**: Should `ServerSetupFragment` (legacy multi-step setup wizard) be migrated or removed entirely?
  - **A**: Remove entirely. It was superseded by `AddServerFragment` + `AuthenticationFragment` in Phase 1.
  
- [ ] **Q2**: Should `item_server_skeleton.xml` be replaced with the Compose `ShimmerEffect` composable?
  - **A**: Yes. Skeleton loading is reimplemented as a reusable composable.

- [ ] **Q3**: Should the `PlayerActivity`'s Picture-in-Picture support be re-implemented in the Compose player screen?
  - **A**: No — PiP is out of scope for this migration (already out of scope per SPEC-013).

- [ ] **Q4**: Should `res/values/strings.xml` remain after migration?
  - **A**: Yes. String resources accessed via `R.string.*` are still valid and used in Compose via `stringResource(R.string.xxx)`.

- [ ] **Q5**: Should `res/values/colors.xml` and `res/values/dimens.xml` be deleted after migration?
  - **A**: Yes — if all their values are replaced by Compose `Color` objects and `dp` values. Only `strings.xml` must remain.

- [ ] **Q6**: Should `res/drawable/ic_launcher_foreground.png` and banner drawable remain?
  - **A**: Yes — app icons and TV banner are system-level resources not related to the UI framework.

- [x] **Q7**: The AndroidManifest declares `screenOrientation="landscape"` for MainActivity — should this change for non-TV devices?
  - **A**: Landscape-default on TV (via `WindowSizeClass` + `UI_MODE_TYPE_TELEVISION` detection), auto-rotate allowed on phones/tablets. Player screen always locks landscape.

- [ ] **Q8**: Should the `ServerSetup` legacy route (`fragment_server_setup.xml`) remain in the NavGraph or be removed entirely?
  - **A**: Removed entirely. The setup wizard was a Phase 1 artifact that has been superseded by the AddServer + Authentication flow.

---

## References

- **Canonical Design Language**: `./DESIGN.md`
- **Current Android Spec**: `.specify/features/013-android-app.md`
- **Mobile Android Design Skill**: `.agents/skills/mobile-android-design/SKILL.md`
- **Jetpack Compose BOM**: https://developer.android.com/develop/ui/compose/bom
- **Navigation Compose**: https://developer.android.com/develop/ui/compose/navigation
- **Material 3 for Compose**: https://developer.android.com/develop/ui/compose/designsystems/material3
- **WindowSizeClass**: https://developer.android.com/develop/ui/compose/adaptive
- **Compose Testing v2 Migration**: https://developer.android.com/develop/ui/compose/testing/migrations/testing-v2
- **Coil Compose**: https://coil-kt.github.io/coil/compose/
- **Hilt Navigation Compose**: https://developer.android.com/training/dependency-injection/hilt-navigation-compose

---

## Revision History

| Version | Date | Change |
|---------|------|--------|
| v1.0 | 2026-06-29 | Initial specification |

---

**Version**: 1.0 | **Created**: 2026-06-29 | **Last Updated**: 2026-06-29

*Full Jetpack Compose + Material 3 migration of the HD Homey Android app. No Fragments, no XML layouts, no Leanback — clean break to modern Compose.*
