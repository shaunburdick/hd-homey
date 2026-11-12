# Compose Migration — Implementation Plan

**Feature**: `016-compose-migration`  
**Branch**: `android-app-phase-2`  
**Created**: 2026-06-29  
**Status**: Planning  

---

## 1. Migration Strategy — Five-Wave Layered Approach

The migration follows a strict dependency-ordered, layered strategy. Each wave
must be fully verified before the next begins (within-wave parallelism is
noted per task).

```
Wave 0: Foundation ──► Wave 1: Core Screens ──► Wave 2: Player ──► Wave 3: Secondary ──► Wave 4: Cleanup
  Build config        ServerListScreen          PlayerScreen        AddServerScreen       Delete XML layouts
  Theme system        ChannelListScreen                             AuthenticationScreen  Remove viewBinding  
  Shared components                                                   SuccessScreen        Remove legacy deps  
  NavHost + routes                                                                         Compose UI tests    
  MainActivity                                                                             Polish             
```

### Rationale

| Principle | Application |
|-----------|------------|
| **FR-001–FR-017** (Build config) | Compose can't compile without BOM + plugin. Foundation first. |
| **FR-030–FR-035** (Theme) | Every composable depends on `HdHomeyTheme` and `ExtendedColors`. |
| **FR-036–FR-040** (Navigation) | All screens need a NavHost to live in. Written once, shared everywhere. |
| **FR-041–FR-047** (ServerList) | Launch screen; must be migrated to enable end-to-end smoketest. |
| **FR-062–FR-069** (ChannelList) | Primary content screen; validates LazyColumn + Coil + hiltViewModel(). |
| **FR-070–FR-079** (Player) | Video playback; most complex integration (AndroidView + ExoPlayer). |
| **FR-048–FR-059** (Auth/Add) | Secondary screens; can be done in any order after Foundation. |
| **FR-095–FR-098** (Cleanup) | Must come last — deleting XML that screens still reference breaks build. |
| **NFR-009, NFR-010** | Zero Fragments, zero viewBinding in new code — enforced by Wave 4 sweep. |

---

## 2. Theme Architecture

### 2.1 File Structure

```
ui/theme/
├── Color.kt             # Color constants mapped from DESIGN.md / colors.xml
├── Type.kt              # M3 Typography scale (phone defaults + TV oversizes)
├── Shape.kt             # M3 Shapes (small=4dp, medium=8dp, large=12dp)
├── ExtendedColors.kt    # ExtendedColors data class + CompositionLocal
└── HdHomeyTheme.kt      # Top-level MaterialTheme wrapper
```

### 2.2 Color Mapping (DESIGN.md → Compose Color)

| DESIGN.md / XML token | Compose Color | M3 ColorScheme slot |
|------------------------|---------------|---------------------|
| `hd_homey_blue` `#2563eb` | `Color(0xFF2563EB)` | `primary`, `secondary` |
| `hd_homey_blue_dark` `#1d4ed8` | `Color(0xFF1D4ED8)` | — (use for tonal elevation) |
| `background_dark` `#1a1a1a` | `Color(0xFF1A1A1A)` | `background` |
| `surface_dark` `#2a2a2a` | `Color(0xFF2A2A2A)` | `surface` |
| `surface_dark_elevated` `#3a3a3a` | `Color(0xFF3A3A3A)` | `surfaceVariant` |
| `text_primary` `#ffffff` / `#f0f0f0` | `Color(0xFFF0F0F0)` | `onBackground`, `onSurface` |
| `text_secondary` `#b3b3b3` | `Color(0xFFB3B3B3)` | `onSurfaceVariant` |
| `color_border` `#404040` | `Color(0xFF404040)` | `outline` |
| `error_red` `#ff5555` | `Color(0xFFFF5555)` | `error` |
| `color_error_bg` `#7f1d1d` | `Color(0xFF7F1D1D)` | `errorContainer` |
| `shimmer_placeholder` `#3a3a3a` | Use `surfaceVariant.copy(alpha=0.6f)` | — |
| `shimmer_highlight` `#4a4a4a` | Use `surfaceVariant` | — |

### 2.3 ExtendedColors (non-M3-standard colors)

```kotlin
data class ExtendedColors(
    val success: Color,           // 0xFF10B981
    val successContainer: Color,  // 0xFF064E3B
    val warning: Color,           // 0xFFF59E0B
    val warningContainer: Color,  // 0xFF78350F
    val info: Color,              // 0xFF3B82F6
    val infoContainer: Color,     // 0xFF1E3A8A
    val textTertiary: Color,      // 0xFF909090
    val textDisabled: Color       // 0xFF666666
)
```

Accessed via `MaterialTheme.extendedColors` extension property backed by
`staticCompositionLocalOf<ExtendedColors>`.

### 2.4 Typography

FR-034 defines the M3 type scale. Two deviations from M3 defaults:
- **Phone**: Use the standard M3 `Typography()` defaults as base, overriding
  the sizes from FR-034 to match DESIGN.md §2.2.
- **TV**: Apply `Typography` with `headlineLarge = 48sp`, `headlineMedium = 32sp`,
  via a `tvTypography()` function that the `HdHomeyTheme` picks based on
  `isSystemInDarkTheme()` — or rather, an `isTv` parameter.

**Implementation approach**: `HdHomeyTheme` accepts an optional `isTv` boolean
(defaults to detecting from `LocalConfiguration`). When `isTv` is true, a
subset of text styles are bumped up:

```kotlin
@Composable
fun HdHomeyTheme(
    isTv: Boolean = LocalConfiguration.current.uiMode and
        Configuration.UI_MODE_TYPE_MASK == Configuration.UI_MODE_TYPE_TELEVISION,
    content: @Composable () -> Unit
) {
    val colorScheme = darkHdHomeyColorScheme()
    val typography = if (isTv) tvTypography() else phoneTypography()
    // ...
}
```

### 2.5 Shapes

FR-035 defines three shapes. These match DESIGN.md §5.1 exactly:

- `small` = `RoundedCornerShape(4.dp)` — badges, tags
- `medium` = `RoundedCornerShape(8.dp)` — cards, inputs, buttons (phone default)
- `large` = `RoundedCornerShape(12.dp)` — dialogs, modals, TV cards

TV adaptation applies `large` shape to cards where phones use `medium`.

### 2.6 Key Architectural Decision: Dark-Only Theme

Per DESIGN.md §10: "Both platforms ship dark-only. No light theme planned."
The `HdHomeyTheme` only defines a `darkColorScheme()`. The `lightColorScheme`
is never used.

---

## 3. Navigation Architecture

### 3.1 Type-Safe Route Definitions (FR-037)

```kotlin
@Serializable object ServerList
@Serializable object AddServer
@Serializable data class ServerSetup(val serverId: String)        // Legacy — exists for nav compat only; see Q8
@Serializable data class Authentication(val serverId: String)
@Serializable data class ChannelList(val serverId: String? = null)
@Serializable data class Player(val channelId: String, val channelName: String)
@Serializable object Success
```

### 3.2 NavHost Topology

```
NavHost(startDestination = ServerList)
├── composable<ServerList>              → ServerListScreen(onServerClick, onAddClick)
├── composable<AddServer>               → AddServerScreen(onSaved, onCancel)
├── composable<Authentication>          → AuthenticationScreen(serverId, onAuthorized, onCancel)
├── composable<ChannelList>             → ChannelListScreen(serverId, onChannelClick, onBack)
├── composable<Player>                  → PlayerScreen(channelId, channelName, onBack)
└── composable<Success>                 → SuccessScreen(serverId, onViewChannels, onBackToServers)
```

### 3.3 Back Stack Behavior (FR-039)

| Current Screen | Back Action | Target |
|---------------|-------------|--------|
| `ServerList` | Back press | Exit app (finish()) |
| `AddServer` | Back press | `ServerList` (popBackStack) |
| `Authentication` | Back press | `ServerList` (popBackStack) — also cancels polling coroutine |
| `Success` | Back press | `ServerList` (popBackStack to root) |
| `ChannelList` | Back press | `ServerList` (popBackStack) |
| `Player` | Back press | If playing: show exit dialog → on confirm: release player + popBackStack to ChannelList |

### 3.4 MainActivity Rewrite (FR-040)

```kotlin
@AndroidEntryPoint
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            HdHomeyTheme {
                AppNavHost()
            }
        }
    }
}
```

The `NavHost` is extracted to a separate `NavGraph.kt` composable to keep
`MainActivity` minimal.

---

## 4. Screen Architecture

### 4.1 AsyncState<T> Sealed Interface (Shared)

Defined in `ui/components/AsyncStateContent.kt` (see data-model.md for full
definition). A general-purpose sealed interface for three-state screens.

```kotlin
@Composable
fun <T> AsyncStateContent(
    state: AsyncState<T>,
    onRetry: () -> Unit,
    loadingContent: @Composable () -> Unit = { ShimmerEffect() },
    emptyCheck: (T) -> Boolean = { false },
    emptyContent: @Composable () -> Unit,
    content: @Composable (T) -> Unit
)
```

### 4.2 ServerListScreen (FR-041–FR-047)

| Aspect | Decision |
|--------|----------|
| Layout | `Scaffold` with `TopAppBar` + `FloatingActionButton` + `LazyColumn` |
| State | ViewModel + local state (servers loaded synchronously from `ServerRepository` via `@Inject`) |
| Three states | `AsyncState.Loading` → 5 shimmer cards; `Error` → retry; `Success` → list or empty state |
| Empty state | Welcome message, instructions, hint about FAB |
| Items | `Card` with server name, URL, auth status dot, active badge, user info line |
| Click action | Authenticated → `ChannelList(serverId)`; not authenticated → `Authentication(serverId)` |
| FAB | `+` icon → `AddServer` |
| TopAppBar | "Your Servers" title, settings icon (placeholder) |
| TV adaptation | Larger margins (48dp), 12dp card radius, 48dp min touch targets |

**ViewModel approach**: Unlike `ChannelListViewModel`, the server list
currently loads data synchronously in the Fragment. For the Compose migration,
we introduce a lightweight `ServerListViewModel` using `@HiltViewModel` that
exposes `StateFlow<AsyncState<List<Server>>>`. This enables the same
`AsyncStateContent` pattern used by other screens.

**File**: `ui/servers/ServerListScreen.kt` + `ui/servers/ServerListViewModel.kt`

### 4.3 ChannelListScreen (FR-062–FR-069)

| Aspect | Decision |
|--------|----------|
| ViewModel | Existing `ChannelListViewModel` via `hiltViewModel()` — no changes to VM |
| State | Collect `ChannelListUiState` → map to `AsyncState`-style rendering |
| Layout | `Scaffold` with `TopAppBar` (tuner name + refresh) + `LazyColumn` |
| Items | `Card` with Coil `AsyncImage` for logo, channel number, name, HD badge, favorite star |
| Three states | `Loading` → shimmer skeleton; `Error` → retry; `Success` → list or `Empty` |
| Pull-to-refresh | M3 `PullToRefreshBox` (ExperimentalMaterial3Api) |
| Click → Player | Navigate to `Player(channelId, channelName)` |
| TV adaptation | Larger card radius (12dp), wider spacing, D-pad focus with elevation elevation change |

**File**: `ui/channels/ChannelListScreen.kt`

### 4.4 PlayerScreen (FR-070–FR-079)

| Aspect | Decision |
|--------|----------|
| Integration | `AndroidView` wrapping `PlayerView` from Media3 UI |
| Player lifecycle | `remember { ExoPlayer }` → `DisposableEffect` for create/dispose |
| Controls overlay | Compose `Box` layers on top of `AndroidView`: top bar (channel name/number), center (play/pause), exit button, auto-hide 3s timer |
| State | `PlayerViewModel` via `hiltViewModel()` (existing VM, unchanged) |
| Three states | `Loading` → spinner; `Error` → retry; `Playing/Buffering` → show video |
| Exit dialog | `AlertDialog` composable when `BackHandler` triggers during active playback |
| Stream fallback | Same raw → HLS logic in ViewModel (unchanged) |
| PiP | Out of scope per Q3 clarification |

**Key architectural decision**: The ExoPlayer instance is created in the
composable using `LocalContext` and `remember`, rather than injected as a
singleton. This aligns with Compose lifecycle — the player lives as long as
the composable is in the composition. However, the current `PlayerViewModel`
uses an injected singleton `ExoPlayer`. For the migration, we **keep the
injected singleton** and wire it to `PlayerView` in the `AndroidView` factory.
The `DisposableEffect` handles `player.stop()` and listener cleanup.

```kotlin
@Composable
fun PlayerScreen(
    channelId: String,
    channelName: String,
    viewModel: PlayerViewModel = hiltViewModel(),
    onBack: () -> Unit
) {
    val player = viewModel.player  // Singleton from Hilt MediaModule
    val uiState by viewModel.uiState.collectAsStateWithLifecycle()

    DisposableEffect(Unit) {
        onDispose {
            viewModel.releasePlayer()
        }
    }

    Box(Modifier.fillMaxSize().background(Color.Black)) {
        AndroidView(
            factory = { ctx ->
                PlayerView(ctx).apply {
                    this.player = player
                    useController = false
                }
            },
            modifier = Modifier.fillMaxSize()
        )
        // Controls overlay composables...
    }
}
```

**File**: `ui/player/PlayerScreen.kt`

### 4.5 AddServerScreen (FR-048–FR-053)

| Aspect | Decision |
|--------|----------|
| Layout | `Column` with `OutlinedTextField` (name, URL) + `Button` (Connect) + `OutlinedButton` (Cancel) |
| Validation | URL scheme check (`http://`/`https://`) before connect attempt |
| Loading state | Button disabled with "Testing connection…" text |
| Error state | `Text` inline below form (not dialog) — preserves form data |
| Success | Save server → navigate back to `ServerList` |
| TV adaptation | Larger touch targets, wider text fields |

**ViewModel approach**: New `AddServerViewModel` with `@HiltViewModel`
injecting `ServerRepository`. Exposes `StateFlow<AsyncState<Boolean>>`
for the connect operation. Form state (`name`, `url`) managed locally via
`rememberSaveable` in the composable.

**File**: `ui/servers/AddServerScreen.kt` + `ui/servers/AddServerViewModel.kt`

### 4.6 AuthenticationScreen (FR-054–FR-059)

| Aspect | Decision |
|--------|----------|
| Layout | `Column` with title, device code (96sp mono), QR code `ImageBitmap`, countdown, retry |
| QR generation | ZXing `BitMatrix` → Compose `ImageBitmap` (existing util, unchanged) |
| Polling | `LaunchedEffect` coroutine polling `/api/auth/device/poll` every 3s |
| Code expiry | Track with `remember` timer; show "Code expired" + "Try Again" |
| Back handling | `BackHandler` cancels polling coroutine + popBackStack |
| Success | Navigate to `Success` or `ChannelList(serverId)` based on origin |

**ViewModel approach**: Existing device code auth logic uses `DeviceCodeService`
directly from the Fragment. Migrate to a new `AuthenticationViewModel` with
`@HiltViewModel` that manages polling state, code expiry, and navigation
events.

**File**: `ui/auth/AuthenticationScreen.kt` + `ui/auth/AuthenticationViewModel.kt`

### 4.7 SuccessScreen (FR-060–FR-061)

| Aspect | Decision |
|--------|----------|
| Layout | `Column` centered: checkmark icon, "You're Connected!" title, server info |
| Actions | "View Channels" (primary) → `ChannelList(serverId)`; "Back to Servers" (outlined) → `ServerList` |
| Back | Pop to `ServerList` root |
| TV adaptation | Centered layout with 48dp margins |

**No ViewModel needed** — purely presentational with navigation callbacks.

**File**: `ui/success/SuccessScreen.kt`

---

## 5. ExoPlayer Integration

### 5.1 AndroidView Interop Pattern

```kotlin
@Composable
fun ExoPlayerSurface(
    player: ExoPlayer,
    modifier: Modifier = Modifier
) {
    AndroidView(
        factory = { context ->
            PlayerView(context).apply {
                this.player = player
                useController = false  // Compose provides controls
                setBackgroundColor(Color.BLACK.toArgb())
            }
        },
        modifier = modifier.fillMaxSize()
    )
}
```

### 5.2 Player Lifecycle

| Lifecycle Event | Action |
|----------------|--------|
| PlayerScreen enters composition | ViewModel `loadStream()` called via `LaunchedEffect` |
| Back pressed during playback | `AlertDialog` confirmation → `viewModel.releasePlayer()` |
| Back pressed during loading/error | `viewModel.releasePlayer()` immediately |
| PlayerScreen leaves composition | `DisposableEffect.onDispose` → `viewModel.releasePlayer()` |
| Configuration change | Survives via ViewModel (player is retained); `AndroidView` recreates naturally |

### 5.3 Controls Overlay Auto-Hide

```kotlin
var controlsVisible by remember { mutableStateOf(true) }

LaunchedEffect(controlsVisible) {
    if (controlsVisible) {
        delay(3000)
        controlsVisible = false
    }
}
```

The 3-second auto-hide timer from the legacy `PlayerActivity` is reimplemented
as a `LaunchedEffect` keyed on the visibility flag. Any user interaction
(tap, D-pad) resets `controlsVisible = true`.

---

## 6. TV Adaptation Strategy

### 6.1 Detection

FR-081/FR-082: Two checks combined:
1. `WindowSizeClass` from `material3-window-size-class` (via `calculateCurrentWindowSizeClass()`)
2. `Configuration.UI_MODE_TYPE_TELEVISION` from `LocalConfiguration`

```kotlin
val windowSizeClass = calculateCurrentWindowSizeClass()
val isTv = LocalConfiguration.current.uiMode and
    Configuration.UI_MODE_TYPE_MASK == Configuration.UI_MODE_TYPE_TELEVISION
```

### 6.2 AdaptiveLayout CompositionLocal

FR-085: Encapsulate adaptive values in a `CompositionLocal`:

```kotlin
data class AdaptiveValues(
    val horizontalMargin: Dp,
    val cardShape: Shape,
    val isTv: Boolean,
    val minTouchTarget: Dp
)

val LocalAdaptiveValues = staticCompositionLocalOf {
    AdaptiveValues(
        horizontalMargin = 16.dp,
        cardShape = RoundedCornerShape(8.dp),
        isTv = false,
        minTouchTarget = 48.dp
    )
}
```

### 6.3 TV-Specific Adjustments (FR-083)

| Property | Phone | TV |
|----------|-------|-----|
| Horizontal margin | 16dp | 48dp |
| Card corner radius | 8dp (medium) | 12dp (large) |
| Title text style | `titleLarge` (22sp) | `headlineMedium` (32sp) |
| Min touch target | 48dp | 48dp (same — M3 default) |
| Focus indicator | None (touch native) | Elevation change + `Modifier.onFocus` |
| D-pad navigation | Not applicable | `Modifier.onFocus`, `focusGroup()` |

### 6.4 D-Pad Focus in Compose

On TV, the `focusGroup()` modifier and `Modifier.onFocus {}` replace
Leanback's `FocusHighlightHandler`. Cards use:

```kotlin
Card(
    modifier = Modifier
        .focusGroup()
        .onFocusChanged { state ->
            val elevation by animateDpAsState(
                targetValue = if (state.isFocused) 8.dp else 2.dp,
                label = "cardElevation"
            )
        },
    // ...
)
```

---

## 7. Testing Strategy

### 7.1 Unit Tests (Existing — Unchanged)

FR-091: All 18 existing unit test files under `src/test/` must continue to
pass without modification. These test ViewModels, repositories, use cases,
mappers, and utilities.

**Pre-commit verification**: `./gradlew testDebug` — must pass.

### 7.2 Compose UI Tests (New)

FR-090/FR-092/FR-094: Each screen composable gets a Compose UI test using
`createComposeRule()`:

| Screen Test | What It Covers |
|-------------|----------------|
| `ServerListScreenTest` | Renders loading (shimmer visible), error (message + retry), success (list items), empty (welcome message) |
| `AddServerScreenTest` | Form renders, validation errors appear, connect button disabled during testing |
| `AuthenticationScreenTest` | Code displays, QR renders, expiry message shown, retry button works |
| `ChannelListScreenTest` | Loading skeleton, error with retry, success with channel items, empty state |
| `PlayerScreenTest` | Controls overlay renders, play/pause button toggles, exit confirmation dialog appears |
| `SuccessScreenTest` | Checkmark visible, both buttons render and are clickable |
| `NavigationTest` | Verify route transitions: ServerList→AddServer, ServerList→Authentication, etc. |

**Compose 1.11 v2 Testing APIs**: Tests use `advanceUntilIdle()` instead of
relying on `UnconfinedTestDispatcher` for coroutine advancement.

### 7.3 Instrumentation Tests (Replace Existing)

FR-094: The three existing Espresso instrumentation tests
(`ChannelSelectionTest`, `ErrorStateTest`, `ChannelListNavigationTest`)
are replaced with Compose-based `createAndroidComposeRule<MainActivity>()`
tests that verify the same navigation and state behavior through the new
Compose UI layer.

### 7.4 Key Testing Configuration

```kotlin
@get:Rule
val composeTestRule = createComposeRule()
// Compose 1.11 defaults to v2 testing APIs — use advanceUntilIdle()
```

---

## 8. File Map (New + Delete)

### Files Created

| File | Wave |
|------|------|
| `ui/theme/Color.kt` | W0 |
| `ui/theme/Type.kt` | W0 |
| `ui/theme/Shape.kt` | W0 |
| `ui/theme/ExtendedColors.kt` | W0 |
| `ui/theme/HdHomeyTheme.kt` | W0 |
| `ui/components/AsyncStateContent.kt` | W0 |
| `ui/components/ShimmerEffect.kt` | W0 |
| `ui/components/AdaptiveLayout.kt` | W0 |
| `ui/components/ChannelCard.kt` | W0 (also used by W1) |
| `ui/navigation/Routes.kt` | W0 |
| `ui/navigation/NavGraph.kt` | W0 |
| `ui/navigation/NavigationActions.kt` | W0 |
| `ui/servers/ServerListViewModel.kt` | W1 |
| `ui/servers/ServerListScreen.kt` | W1 |
| `ui/servers/AddServerViewModel.kt` | W3 |
| `ui/servers/AddServerScreen.kt` | W3 |
| `ui/channels/ChannelListScreen.kt` | W1 |
| `ui/player/PlayerScreen.kt` | W2 |
| `ui/auth/AuthenticationViewModel.kt` | W3 |
| `ui/auth/AuthenticationScreen.kt` | W3 |
| `ui/success/SuccessScreen.kt` | W3 |

### Files Deleted

| File | Wave |
|------|------|
| `res/layout/activity_main.xml` | W4 |
| `res/layout/activity_player.xml` | W4 |
| `res/layout/fragment_add_server.xml` | W4 |
| `res/layout/fragment_authentication.xml` | W4 |
| `res/layout/fragment_channel_list.xml` | W4 |
| `res/layout/fragment_server_list.xml` | W4 |
| `res/layout/fragment_server_setup.xml` | W4 |
| `res/layout/fragment_success.xml` | W4 |
| `res/layout/item_channel.xml` | W4 |
| `res/layout/item_server.xml` | W4 |
| `res/layout/item_server_skeleton.xml` | W4 |
| `res/layout/player_controls.xml` | W4 |
| `res/drawable/bg_player_controls.xml` | W4 |
| `res/drawable/bg_refresh_button.xml` | W4 |
| `res/drawable/ic_player_exit.xml` | W4 |
| `res/drawable/ic_player_pause.xml` | W4 |
| `res/drawable/ic_player_play.xml` | W4 |
| `res/drawable/shimmer_background.xml` | W4 |
| `res/animator/card_lift.xml` | W4 |
| `res/navigation/nav_graph.xml` | W4 |
| `res/values/themes.xml` | W4 |
| `res/values/colors.xml` | W4 |
| `res/values/dimens.xml` | W4 |
| `res/menu/server_context_menu.xml` | W4 |
| `ui/servers/ServerListFragment.kt` | W4 |
| `ui/servers/ServerListAdapter.kt` | W4 |
| `ui/servers/AddServerFragment.kt` | W4 |
| `ui/auth/AuthenticationFragment.kt` | W4 |
| `ui/success/SuccessFragment.kt` | W4 |
| `ui/channels/ChannelListFragment.kt` | W4 |
| `ui/channels/ChannelAdapter.kt` | W4 |
| `ui/player/PlayerActivity.kt` | W4 |
| `ui/player/PlayerControlsView.kt` | W4 |

### Files Modified

| File | Change | Wave |
|------|--------|------|
| `MainActivity.kt` | Rewrite from AppCompatActivity + Fragment → ComponentActivity + setContent + NavHost | W0 |
| `gradle/libs.versions.toml` | Add Compose BOM, compose deps; remove legacy deps | W0 + W4 |
| `app/build.gradle.kts` | Add compose plugin, buildFeatures compose, kotlin compose plugin; remove viewBinding | W0 + W4 |
| `AndroidManifest.xml` | Remove `leanback` feature, Leanback launcher category, PlayerActivity | W4 |

### Files Kept (Unchanged)

Per spec §"Files to Keep": all `api/`, `data/`, `di/`, `domain/`, `player/`,
`storage/`, `util/` packages, `HdHomeyApplication.kt`, `strings.xml`,
`proguard-rules.pro`, `settings.gradle.kts`, `gradle.properties`,
`local.properties`, launcher icons, TV banner drawable.

---

## 9. Compilation Order and Build Verification

Each wave ends with a build verification step to catch issues early:

| Wave | Verification |
|------|-------------|
| W0 | `./gradlew assembleDebug` — must compile (even if screens are empty composables) |
| W1 | `./gradlew assembleDebug` + `./gradlew testDebug` — existing tests pass |
| W2 | `./gradlew assembleDebug` — player screen compiles |
| W3 | `./gradlew assembleDebug` — all screens compile |
| W4 | `./gradlew assembleDebug` + `./gradlew lintDebug` + `./gradlew testDebug` — zero errors, zero warnings |

---

## 10. Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| Compose BOM 2026.06.00 incompatibility with Kotlin 2.2.10 | Pin via BOM; Kotlin Compose plugin (2.2.10) handles compiler version automatically |
| ExoPlayer AndroidView interop lifecycle issues | `DisposableEffect` for cleanup; `remember` for stable instance reference |
| D-pad focus on TV without Leanback | Compose `focusGroup()`, `onFocusChanged`, `Modifier.focusable()` — test on AVD |
| Hilt ViewModel scoping in Navigation Compose | Use `hiltViewModel()` default scoping — automatically scoped to `NavBackStackEntry` |
| Compose 1.11 v2 testing API breakage | Tests explicitly use `advanceUntilIdle()`, not `UnconfinedTestDispatcher` |
| Concurrent modification of nav_graph.xml and Routes.kt | NavGraph.kt is written from scratch; nav_graph.xml is deleted in W4 after all screens work |
| Build breaks if XML is deleted before Compose screen is ready | W4 deletion only after all W1–W3 screens compile and pass UI tests |

---

## 11. DESIGN.md Alignment Verification

| DESIGN.md Directive | Compose Implementation |
|---------------------|----------------------|
| Dark-theme only (§10) | `darkHdHomeyColorScheme()` only; no light scheme |
| Card-based layouts (§4.1) | Compose `Card` with M3 `colors.surface` background |
| Three-state screens (§4.3) | `AsyncState<T>` sealed interface with Loading/Error/Success |
| Accent blue for interaction (§1.3) | `primary` = `Color(0xFF2563EB)` — used for buttons, links, focus |
| WCAG 2.2 AA contrast (§10) | All `darkColorScheme` values verified against DESIGN.md contrast ratios |
| 4px spacing grid (§3) | Compose `dp` values align: 4/8/12/16/24/32/48dp |
| TV 10-foot UI (§9.1) | WindowSizeClass + UI_MODE_TYPE_TELEVISION detection |
| Shimmer animation (§8.2) | Compose `rememberInfiniteTransition` + alpha animation |
| Focus lift animation (§8.2) | Compose `animateDpAsState` for card elevation on focus |
| System fonts (§2.1) | `FontFamily.Default` (sans-serif) for body; `FontFamily.Monospace` for codes |
| Shared design map (Appendix) | Color mapping table in §2.2 of this plan |
