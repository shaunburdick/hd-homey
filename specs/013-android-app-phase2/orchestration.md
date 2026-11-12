# Orchestration Log: Android App Phase 2 — Channel Browsing & Streaming

## Status
- **Current Wave**: 1 — Foundation: Dependencies & Hilt Setup
- **Branch**: `android-app-phase-2`
- **Last Updated**: 2026-06-23

## Plan Summary
Phase 2 implements channel browsing via native RecyclerView (No WebView), HLS video playback with AndroidX Media3 ExoPlayer, and channel favorites integration. Architecture evolves from Phase 1's simplified Repository Pattern to MVVM with ViewModels, Use Cases, Hilt DI, Retrofit, DataStore, and Coil. ~132 tasks across 6 sub-phases, estimated 15-21 days.

**Key architecture decisions**:
- HLS-only (no MPEG-2 TS in Phase 2)
- Cookie-based auth (Better-Auth, not Bearer tokens)
- Native MVVM (not WebView-hybrid as originally spec'd)
- PlayerActivity (separate activity, not fragment)

## Task Wave Progress

### Wave 0 — Spec Audit Fixes — ✅ Complete
- Spec v1.4 update, constitution amendment, contract auth fix
- Committed: `6607790`

### Wave 1 — Foundation: Dependencies & Hilt Setup — ✅ Complete (75875ae)
- T001–T009: Added deps, HdHomeyApplication, @AndroidEntryPoint — committed 75875ae

### Wave 2A — DI Modules + DataStore + ErrorInterceptor — ✅ Complete (3816be3, d6e6fd2)
- T010: NetworkModule — Retrofit/OkHttp/Json singleton providers
- T011: DataModule — AppPreferences DI binding
- T012: MediaModule — ExoPlayer singleton provider
- T013: AppPreferences migrated to DataStore
- T014: TokenDataStore — encrypted DataStore for JWT tokens
- T017: ErrorInterceptor — 401/403/5xx HTTP error handling

### Wave 2B — TokenRepository + AuthInterceptor — ✅ Complete (a921357, bb8b88e)
- T015: TokenRepository — delegates to TokenDataStore
- T016: AuthInterceptor — cookie-based Better-Auth interceptor

### Wave 3A — API Models (T018–T022) — ✅ Complete (b838992, aee5cef, 132fd9d, 6a81632)
- T018: ChannelDto — mapped to backend `channels` table schema
- T019: TunerDto — mapped to backend `tuners` table schema
- T020: StreamTokenRequest + StreamTokenResponse — POST /api/stream-token
- T021: ChannelPreferenceDto — mapped to backend preferences endpoint
- T022: DataResponse<T> generic wrapper + ErrorResponse (details as JsonElement)

### Wave 3B — Retrofit Service Interface (T023) — ✅ Complete
- T023: HdHomeyApiService — Retrofit interface with 4 endpoint methods

### Wave 3C — Wire ApiService in NetworkModule (T024) — ✅ Complete
- T024: AuthInterceptor + ErrorInterceptor wired into OkHttpClient, provideHdHomeyApi added
- Both interceptors injected as @Provides parameters (Hilt module is an object)

### Wave 4 — Domain Layer + Repositories (T025–T031) — ✅ Complete
- T025: Domain models (Channel, StreamToken, ChannelPreferences, ChannelWithMetadata) — 4 new files
- T025 foundation: Mappers (ChannelMapper, StreamTokenMapper) — 2 new files + 6 test files
- T026: GetChannelsUseCase — new file
- T027: GenerateStreamUrlUseCase — new file
- T028: GetChannelPreferencesUseCase — new file
- T029: ChannelRepository — new file
- T030: PreferencesRepository — new file
- T031: DataModule KDoc updated — auto-wired repos documented

### Wave 5A — ViewModel + UiState (T032–T036) — ✅ Complete
### Wave 5B — Layouts + Fragment + Adapter (T037–T045) — ✅ Complete
### Wave 5C — Navigation + Integration + Favorites + Errors (T046–T055) — ✅ Complete
### Wave 6 — Player + Favorites + Tests + Docs (T056–T132) — ✅ Complete

**All 132 tasks checked off in tasks.md. Phase 2 feature-complete.**

---

## Phase 2 Follow-On: Closing Gaps Before Merge

### Overview
Several items from the known limitations and gap analysis were identified after the initial Phase 2 delivery. This section tracks closing them before PR is merged.

### Wave 7 — Tuner Name + Coil Channel Logos (Parallel) — ✅ Complete
**Purpose**: Fix tuner display name (currently hardcoded "Tuner N") and wire up Coil channel logo loading (T043 was marked done but not implemented).
- Tuner name: Add `getTuner(id)` to HdHomeyApiService, wire into ChannelListViewModel
- Coil logos: Implement Coil image loading in ChannelAdapter for channel logos
- These two tasks touch different files, safe to parallelize

### Wave 8 — ExoPlayer Cache (Offline Buffering) — ✅ Complete
**Purpose**: Add SimpleCache + CacheDataSource.Factory in MediaModule for streaming resilience
- e9ed109: Added Cache provider + CacheDataSource.Factory to MediaModule
- Wrapped HLS media source with cache in PlayerViewModel

### Wave 9 — Player Controls + Confirm Dialog + PiP — ✅ Complete (c4d641b)
**Purpose**: Implement missing player UI controls, confirm-on-back dialog, and Picture-in-Picture support (all touch PlayerActivity so sequential within wave)
- T074: Created `player_controls.xml` with D-pad-friendly play/pause and back buttons
- T075: Created `PlayerControlsView.kt` custom FrameLayout with callbacks
- T077: Auto-hide controls with 3s delay via Handler, show on touch/DPad key
- T082: "Are you sure?" dialog via onBackPressedDispatcher callback (playing state only)
- PiP: Added `supportsPictureInPicture` + `resizeableActivity` to manifest; auto-enter on `onUserLeaveHint()`; lifecycle guards in `onStop()` / `onPictureInPictureModeChanged()`

### Wave 10 — Espresso UI Tests + CI — ✅ Complete (3c40032)
**Purpose**: Write Espresso tests (T103-T105) and add CI job with emulator
- T103: ChannelListNavigationTest — main activity launch + resumed state
- T104: ChannelSelectionTest — PlayerActivity view inflation, intent extras, createIntent
- T105: ErrorStateTest — error views, retry focusable, loading state visibility
- CI: Added `android-instrumentation-test` job to test.yml with `reactivecircus/android-emulator-runner` (API 35, google_apis); removed `SKIP_INSTRUMENTATION: true`; not in `needs:` chain for android-build

### Wave 11 — Task Updates + Documentation — ✅ Complete
**Purpose**: Update orchestration.md, and verify everything is clean

## Decisions & Rationale
- Tuner name: Used `getTuners()` list + `find` filter instead of adding a `getTuner(id)` API call to avoid extra HTTP round-trip
- ExoPlayer cache: Used `CacheDataSource.Factory` with `DefaultHttpDataSource` upstream (HLS URLs carry HMAC tokens, no auth interceptor needed); `FLAG_IGNORE_CACHE_ON_ERROR` for live stream robustness; `StandaloneDatabaseProvider` for metadata
- PiP: Auto-enter on `onUserLeaveHint()` rather than a dedicated button — aligns with Android TV conventions
- Controls: `onBackPressedDispatcher.addCallback()` instead of overriding `onBackPressed()` — avoids the MissingSuperCall lint error entirely

## Blockers & Escalations
- (none)

## New Tasks Discovered
- (none yet — gaps found during analysis: T043 (Coil), T074/T075/T077 (controls), T082 (dialog), T103-T105 (Espresso tests) all marked done but not actually implemented)

## Review Findings
- (none)
