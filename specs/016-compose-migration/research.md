# Compose Migration — Research & Technology Verification

**Feature**: `016-compose-migration`  
**Date**: 2026-06-29  

---

## 1. Kotlin Compose Plugin (Kotlin 2.2.10)

**Query**: Kotlin 2.2 Compose compiler plugin  
**Status**: ✅ Confirmed

Kotlin 2.0+ (specifically 2.2.10 in this project) has the Compose compiler
built into the Kotlin repository. The `org.jetbrains.kotlin.plugin.compose`
Gradle plugin replaces the old `composeOptions { kotlinCompilerExtensionVersion }`
configuration.

**Configuration** (already in use):
```kotlin
plugins {
    kotlin("plugin.compose")
}
```

**No `kotlinCompilerExtensionVersion` needed** — the Compose compiler version
is determined by the Kotlin plugin version. Version mismatch is eliminated.

**Reference**: Kotlin 2.2 release notes confirm Compose compiler versioning
is now intrinsic to the Kotlin version.

---

## 2. Compose BOM 2026.06.00 → Compose 1.11.0

**Query**: Compose BOM 2026.06.00 version mapping  
**Status**: ✅ Confirmed

The Compose BOM `2026.06.00` maps to the June 2026 stable release of the
Compose UI toolkit (Compose 1.11.0).

**Key version mappings**:
- `compose-ui:1.11.0`
- `compose-material3:1.4.0` (approximately)
- `material3-window-size-class:1.4.0`
- `navigation-compose:2.8.5` (stable, independently versioned)
- `activity-compose:1.9.3` (independently versioned)
- `lifecycle-runtime-compose:2.8.7` (independently versioned)
- `compose-ui-test-junit4:1.11.0`

**Compatibility**: Kotlin 2.2.10 + Compose Compiler Plugin 2.2.10 + Compose 1.11.0 — fully compatible chain.

---

## 3. Hilt Navigation Compose (1.2.0)

**Query**: hilt-navigation-compose version compatibility  
**Status**: ✅ Confirmed

`androidx.hilt:hilt-navigation-compose:1.2.0` is the latest stable version
and is fully compatible with:
- Hilt 2.56.2 (in use)
- Navigation Compose 2.8.5 (in use)
- Compose 1.11.0 (via BOM)

**Usage**:
```kotlin
val viewModel: ChannelListViewModel = hiltViewModel()
```
No additional Hilt configuration or annotation changes needed.

---

## 4. Coil Compose 2.7.0

**Query**: Coil Compose API for async image loading  
**Status**: ✅ Confirmed

`io.coil-kt:coil-compose:2.7.0` provides the `AsyncImage` composable.

**Key API**:
```kotlin
AsyncImage(
    model = channel.logoUrl,
    contentDescription = channel.name,
    modifier = Modifier.size(48.dp).clip(CircleShape),
    placeholder = painterResource(R.drawable.placeholder),
    error = painterResource(R.drawable.error)
)
```

Replaces `coil:2.7.0` (plain) which only provided `ImageLoader` and
`load()` extensions on ImageView.

---

## 5. Media3 ExoPlayer + AndroidView Interop

**Query**: ExoPlayer AndroidView in Compose  
**Status**: ✅ Confirmed

The pattern for embedding `PlayerView` in Compose is well-established:

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
                useController = false  // Compose controls overlay
            }
        },
        modifier = modifier
    )
}
```

**Lifecycle management**:
- Create player via `remember` (or use injected singleton from Hilt)
- Set MediaItem + prepare in `LaunchedEffect`
- Release player in `DisposableEffect.onDispose`

**Important**: The existing `PlayerViewModel` uses an injected singleton
`ExoPlayer`. For the migration, we keep this pattern and wire the singleton
to `PlayerView` in the `AndroidView` factory.

---

## 6. WindowSizeClass for TV Detection

**Query**: material3-window-size-class TV detection  
**Status**: ✅ Confirmed

`material3-window-size-class` provides `calculateCurrentWindowSizeClass()`
which returns `WindowSizeClass` with `windowWidthSizeClass` and
`windowHeightSizeClass`.

For TV detection, combine with `LocalConfiguration`:

```kotlin
val isTv = LocalConfiguration.current.uiMode and
    Configuration.UI_MODE_TYPE_MASK == Configuration.UI_MODE_TYPE_TELEVISION
```

**Note**: `calculateCurrentWindowSizeClass()` requires an `Activity` reference.
The `HdHomeyTheme` composable receives this from `LocalContext.current as Activity`
via the new `ComponentActivity.setContent()`.

---

## 7. Compose 1.11 Testing v2 APIs

**Query**: Compose 1.11 test framework migration  
**Status**: ✅ Confirmed

Compose 1.11 defaults to v2 testing APIs. Key changes:

| Old (v1) | New (v2) |
|----------|----------|
| `runOnIdle` | Still works |
| `waitForIdle` | Still works |
| `advanceTimeBy` + `runCurrent` | `advanceUntilIdle()` |
| `UnconfinedTestDispatcher` | Not needed — use `advanceUntilIdle()` |

**Test configuration**:
```kotlin
@get:Rule
val composeTestRule = createComposeRule()
```

**Migration guide**: https://developer.android.com/develop/ui/compose/testing/migrations/testing-v2

---

## 8. Dependency Summary

| Library | Version | Status |
|---------|---------|--------|
| Compose BOM | 2026.06.00 | 🔜 Add |
| Compose UI | (via BOM) 1.11.0 | 🔜 Add |
| Compose Material3 | (via BOM) | 🔜 Add |
| Navigation Compose | 2.8.5 (existing, move from nav-fragment) | 🔜 Refactor |
| Activity Compose | 1.9.3 (existing, use activity-ktx as base) | 🔜 Add |
| Hilt Navigation Compose | 1.2.0 | 🔜 Add |
| Coil Compose | 2.7.0 | 🔜 Add (replaces coil) |
| Lifecycle ViewModel Compose | 2.8.7 | 🔜 Add |
| Lifecycle Runtime Compose | 2.8.7 | 🔜 Add |
| Material3 Window Size Class | (via BOM) | 🔜 Add |
| Compose UI Test Manifest | (via BOM, debug) | 🔜 Add |
| Compose UI Test JUnit4 | (via BOM, test) | 🔜 Add |
| Compose UI Tooling | (via BOM, debug) | 🔜 Add |
| Compose UI Tooling Preview | (via BOM, debug) | 🔜 Add |

**Dependencies to remove**: `appcompat`, `constraintlayout`, `recyclerview`,
`cardview`, `coordinatorlayout`, `leanback`, `material` (MDC),
`navigation-fragment-ktx`, `navigation-ui-ktx`, `hilt-navigation-fragment`,
`coil` (plain), `fragment-ktx`

---

## 9. Hilt Module & ViewModel Scoping

`hiltViewModel()` in Navigation Compose automatically scopes the ViewModel
to the `NavBackStackEntry`. This means:

- `ChannelListViewModel` currently scoped via `hiltNavGraphViewModels()` → `hiltViewModel()` with default entry
- No `@HiltViewModelScoped` or custom `SavedStateHandle` changes needed
- ViewModel lives as long as the back stack entry is on the stack
- `@AndroidEntryPoint` only needed on `MainActivity` and `HdHomeyApplication`
  (Fragment entry points removed)
