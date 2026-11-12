# Tasks: Android App Phase 2 - Channel Browsing & Streaming

**Input**: Phase 2 planning documents from `/specs/013-android-app-phase2/`  
**Prerequisites**: ✅ Phase 1 complete (server management, authentication), ✅ Backend APIs ready  
**Spec**: `.specify/features/013-android-app.md` v1.3  
**Branch**: `013-android-app-phase2`

**Target Completion**: 15-21 days (3-4 weeks)

## Format: `[ID] [P?] [Sub-Phase] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Sub-Phase]**: Which sub-phase this task belongs to (SP1-SP6)
- Paths shown are relative to `apps/android/app/src/main/java/com/hdhomey/app/`

---

## Sub-Phase 1: Architecture & Dependencies Setup (3-4 days)

**Purpose**: Add MVVM architecture layers, Retrofit, DataStore, Coil, Media3, Hilt DI

**⚠️ CRITICAL**: No UI work can begin until this phase is complete

### Dependencies (Day 1)

- [x] T001 [P] [SP1] Update `build.gradle.kts` with Retrofit 2.11.0, Moshi converter, and logging interceptor
- [x] T002 [P] [SP1] Add AndroidX DataStore 1.1.1+ (preferences and proto) to `build.gradle.kts`
- [x] T003 [P] [SP1] Add Coil 2.7.0+ (image loading library) to `build.gradle.kts`
- [x] T004 [P] [SP1] Add AndroidX Media3 1.9.0+ (ExoPlayer, UI, HLS) to `build.gradle.kts`
- [x] T005 [P] [SP1] Add Hilt 2.52+ (dependency injection) to `build.gradle.kts` with KSP plugin
- [x] T006 [P] [SP1] Add Kotlin Coroutines 1.10.1 and Flow dependencies to `build.gradle.kts`
- [x] T007 [P] [SP1] Add testing dependencies: Turbine 1.0.0 (Flow testing), MockK 1.13.13

### Hilt Setup (Day 1-2)

- [x] T008 [SP1] Create `@HiltAndroidApp` application class in `HdHomeyApplication.kt`
- [x] T009 [SP1] Add `@AndroidEntryPoint` annotation to `MainActivity.kt`
- [x] T010 [P] [SP1] Create `di/NetworkModule.kt` with `@Provides` for OkHttpClient and Retrofit
- [x] T011 [P] [SP1] Create `di/DataModule.kt` with `@Provides` for DataStore and repositories
- [x] T012 [P] [SP1] Create `di/MediaModule.kt` with `@Provides` for ExoPlayer instance

### Data Layer (Day 2-3)

- [x] T013 [P] [SP1] Migrate `storage/AppPreferences.kt` from SharedPreferences to DataStore (preserve existing API)
- [x] T014 [P] [SP1] Create `storage/TokenDataStore.kt` for JWT token storage (encrypted DataStore)
- [x] T015 [P] [SP1] Create `data/repository/TokenRepository.kt` for JWT token operations (get, save, refresh)
- [x] T016 [SP1] Create `api/interceptors/AuthInterceptor.kt` to add JWT token to all API requests
- [x] T017 [SP1] Create `api/interceptors/ErrorInterceptor.kt` to handle 401/403 errors (trigger re-auth)

### API Models (Day 3)

- [x] T018 [P] [SP1] Create `api/models/Channel.kt` data class per `data-model.md` spec
- [x] T019 [P] [SP1] Create `api/models/Tuner.kt` data class per `data-model.md` spec
- [x] T020 [P] [SP1] Create `api/models/StreamTokenRequest.kt` and `StreamTokenResponse.kt`
- [x] T021 [P] [SP1] Create `api/models/ChannelPreferences.kt` for favorites and hidden channels
- [x] T022 [P] [SP1] Create `api/models/ChannelLineupResponse.kt` wrapper for channel list API

### Retrofit API Interface (Day 3-4)

- [x] T023 [SP1] Create `api/HdHomeyApiService.kt` Retrofit interface with these endpoints:
  - `@GET("/api/tuners/{id}/channels")` → List<Channel>
  - `@POST("/api/stream-token")` → StreamTokenResponse
  - `@GET("/api/preferences/channels")` → List<ChannelPreferences>
- [x] T024 [SP1] Update `di/NetworkModule.kt` to provide `HdHomeyApiService` instance

### Domain Layer (Day 4)

- [x] T025 [P] [SP1] Create `domain/model/ChannelWithMetadata.kt` (combines Channel + isFavorite flag)
- [x] T026 [P] [SP1] Create `domain/usecase/GetChannelsUseCase.kt` (fetch channels + merge with preferences)
- [x] T027 [P] [SP1] Create `domain/usecase/GenerateStreamUrlUseCase.kt` (request token + build HLS URL)
- [x] T028 [P] [SP1] Create `domain/usecase/GetChannelPreferencesUseCase.kt` (fetch favorites/hidden)

### Repository Layer (Day 4)

- [x] T029 [P] [SP1] Create `data/repository/ChannelRepository.kt` (API calls for channels, caching logic)
- [x] T030 [P] [SP1] Create `data/repository/PreferencesRepository.kt` (API calls for user preferences)
- [x] T031 [SP1] Wire up repositories in `di/DataModule.kt` with `@Singleton` scope

**Checkpoint**: Architecture ready - UI implementation can now begin

---

## Sub-Phase 2: Channel List UI (4-5 days)

**Purpose**: Browse channels with D-pad navigation (User Story 2)

**Goal**: Users can see channel lineup organized by tuner, navigate with D-pad, see favorites

### ViewModel & State (Day 5)

- [x] T032 [SP2] Create `ui/channels/ChannelListUiState.kt` sealed class (Loading, Success, Error)
- [x] T033 [SP2] Create `ui/channels/ChannelListViewModel.kt` with StateFlow<ChannelListUiState>
- [x] T034 [SP2] Implement `ChannelListViewModel.loadChannels(tunerId)` using GetChannelsUseCase
- [x] T035 [SP2] Implement `ChannelListViewModel.retryLoad()` for error recovery
- [x] T036 [SP2] Write unit test for `ChannelListViewModel` in `test/.../ChannelListViewModelTest.kt`

### Layout & Fragment (Day 5-6)

- [x] T037 [P] [SP2] Create `res/layout/fragment_channel_list.xml` with RecyclerView + loading/error states
- [x] T038 [P] [SP2] Create `res/layout/item_channel.xml` for RecyclerView items (number, name, logo, favorite icon)
- [x] T039 [SP2] Create `ui/channels/ChannelListFragment.kt` with `@AndroidEntryPoint` annotation
- [x] T040 [SP2] Inject `ChannelListViewModel` into fragment using `by viewModels()`
- [x] T041 [SP2] Collect `uiState` StateFlow and update UI (show loading, channels, or error)

### RecyclerView Adapter (Day 6-7)

- [x] T042 [SP2] Create `ui/channels/ChannelAdapter.kt` (RecyclerView.Adapter)
- [x] T043 [SP2] Create `ui/channels/ChannelViewHolder.kt` with Coil image loading for channel logos
- [x] T044 [SP2] Implement D-pad focus handling in `item_channel.xml` (focusable, nextFocusDown/Up)
- [x] T045 [SP2] Add click listener to ChannelAdapter for channel selection (navigate to player)

### Navigation & Integration (Day 7-8)

- [x] T046 [SP2] Add `ChannelListFragment` to `res/navigation/nav_graph.xml`
- [x] T047 [SP2] Update `ServerListFragment` to navigate to `ChannelListFragment` after server selection
- [x] T048 [SP2] Pass `tunerId` as navigation argument to `ChannelListFragment`
- [x] T049 [SP2] Add "Refresh Channels" button to channel list UI (calls `viewModel.loadChannels()`)

### Favorites Display (Day 8-9)

- [x] T050 [SP2] Update `ChannelAdapter` to show star icon for favorited channels
- [x] T051 [SP2] Sort channels in `ChannelListViewModel`: favorites first, then by channel number
- [x] T052 [SP2] Add shimmer loading animation to channel list during loading state

### Error Handling (Day 9)

- [x] T053 [SP2] Create error view in `fragment_channel_list.xml` with retry button
- [x] T054 [SP2] Handle network errors gracefully (show user-friendly message + retry)
- [x] T055 [SP2] Handle empty channel list (show "No channels found" message)

**Checkpoint**: Channel list fully functional - users can browse channels with D-pad

---

## Sub-Phase 3: Video Player (5-7 days)

**Purpose**: Watch live TV with Media3 ExoPlayer (User Story 3)

**Goal**: Users can select a channel and watch HLS video stream with playback controls

### Player Activity & ViewModel (Day 10)

- [x] T056 [SP3] Create `ui/player/PlayerActivity.kt` (separate activity for full-screen video)
- [x] T057 [SP3] Create `res/layout/activity_player.xml` with `PlayerView` from Media3
- [x] T058 [SP3] Create `ui/player/PlayerUiState.kt` sealed class (Loading, Playing, Error, Buffering)
- [x] T059 [SP3] Create `ui/player/PlayerViewModel.kt` with StateFlow<PlayerUiState>
- [x] T060 [SP3] Inject ExoPlayer instance into `PlayerViewModel` via Hilt

### Stream URL Generation (Day 10-11)

- [x] T061 [SP3] Implement `PlayerViewModel.loadStream(tunerId, channelId)` using GenerateStreamUrlUseCase
- [x] T062 [SP3] Call `POST /api/stream-token` via use case to get HMAC token
- [x] T063 [SP3] Build HLS URL: `{serverUrl}/api/transcode/{tunerId}/{channelId}.m3u8?token={token}`
- [x] T064 [SP3] Write unit test for stream URL generation in `test/.../PlayerViewModelTest.kt`

### ExoPlayer Integration (Day 11-12)

- [x] T065 [SP3] Create `player/HdHomeyMediaSource.kt` to create MediaItem from HLS URL
- [x] T066 [SP3] Implement `PlayerViewModel.preparePlayer(url)` to set MediaSource and prepare ExoPlayer
- [x] T067 [SP3] Implement `PlayerViewModel.play()` and `pause()` methods
- [x] T068 [SP3] Implement `PlayerViewModel.release()` to clean up player on activity destroy
- [x] T069 [SP3] Add ExoPlayer lifecycle management: pause on `onStop()`, release on `onDestroy()`

### Player Event Handling (Day 12-13)

- [x] T070 [SP3] Create `player/PlayerEventListener.kt` implementing `Player.Listener`
- [x] T071 [SP3] Handle `onPlaybackStateChanged`: update `PlayerUiState` (Buffering → Playing)
- [x] T072 [SP3] Handle `onPlayerError`: show error dialog with retry option
- [x] T073 [SP3] Handle `onIsPlayingChanged`: update play/pause button state

### Player Controls (Day 13-14)

- [x] T074 [SP3] Create `res/layout/player_controls.xml` (play/pause, back button, channel info)
- [x] T075 [SP3] Create `ui/player/PlayerControlsView.kt` custom view for D-pad-friendly controls
- [x] T076 [SP3] Implement D-pad focus management for player controls (back, play/pause)
- [x] T077 [SP3] Add auto-hide behavior for controls (show on D-pad press, hide after 3 seconds)
- [x] T078 [SP3] Display channel name and number in player overlay

### Navigation & Integration (Day 14-15)

- [x] T079 [SP3] Launch `PlayerActivity` from `ChannelListFragment` when channel is selected
- [x] T080 [SP3] Pass `tunerId` and `channelId` as Intent extras to `PlayerActivity`
- [x] T081 [SP3] Handle back button: stop playback and finish `PlayerActivity`
- [x] T082 [SP3] Implement "Are you sure?" dialog if user presses back while video is playing

### Error Handling & Recovery (Day 15-16)

- [x] T083 [SP3] Create `player/PlayerErrorHandler.kt` for error recovery logic
- [x] T084 [SP3] Handle network errors: show "Connection lost" with retry button
- [x] T085 [SP3] Handle token expiration: re-fetch stream token and reload stream
- [x] T086 [SP3] Handle stream not available: show "Channel offline" message
- [x] T087 [SP3] Add retry logic with exponential backoff (1s, 2s, 4s delays)

**Checkpoint**: Video player works - users can watch live TV with HLS streams

---

## Sub-Phase 4: Favorites Integration (2-3 days)

**Purpose**: Display favorites from backend, sort favorites to top

**Goal**: Channel list shows favorites first with visual indicator

### Preferences API (Day 17)

- [x] T088 [SP4] Update `GetChannelsUseCase` to merge channel data with preferences
- [x] T089 [SP4] Implement `combine()` Flow operator: channels + preferences → ChannelWithMetadata
- [x] T090 [SP4] Write unit test for preference merging logic in `test/.../GetChannelsUseCaseTest.kt`

### UI Updates (Day 17-18)

- [x] T091 [SP4] Update `ChannelAdapter` to display favorite icon (star) for favorited channels
- [x] T092 [SP4] Add visual distinction for favorites (bold text, highlighted background, or star icon)
- [x] T093 [SP4] Sort channels: favorites at top, then by channel number

### Preference Sync (Day 18-19)

- [x] T094 [SP4] Add "Refresh" button to channel list to reload preferences from server
- [x] T095 [SP4] Cache preferences in memory (TTL 5 minutes) to reduce API calls
- [x] T096 [SP4] Handle preference API errors gracefully (fall back to no favorites if API fails)

**Checkpoint**: Favorites work - users see starred channels first

---

## Sub-Phase 5: Testing & Polish (2-3 days)

**Purpose**: Unit tests, UI tests, manual testing, bug fixes

### Unit Tests (Day 19-20)

- [x] T097 [P] [SP5] Write unit tests for `ChannelRepository` (mock API responses)
- [x] T098 [P] [SP5] Write unit tests for `TokenRepository` (mock DataStore)
- [x] T099 [P] [SP5] Write unit tests for `GetChannelsUseCase` (test preference merging)
- [x] T100 [P] [SP5] Write unit tests for `GenerateStreamUrlUseCase` (test HMAC URL generation)
- [x] T101 [P] [SP5] Write unit tests for `ChannelListViewModel` (test state transitions)
- [x] T102 [P] [SP5] Write unit tests for `PlayerViewModel` (test playback states)

### Integration/UI Tests (Day 20)

- [x] T103 [SP5] Write Espresso test for channel list navigation (D-pad up/down)
- [x] T104 [SP5] Write Espresso test for channel selection → player launch
- [x] T105 [SP5] Write Espresso test for error state → retry button

### Manual Testing (Day 20-21)

- [x] T106 [SP5] Follow `quickstart.md` manual testing scenarios (all 16 scenarios)
- [x] T107 [SP5] Test on Android TV emulator (Pixel Tablet, TV 720p, TV 1080p)
- [x] T108 [SP5] Test D-pad navigation on physical Android TV device (if available)
- [x] T109 [SP5] Test with real HD Homey server (local network)
- [x] T110 [SP5] Test HLS video playback (verify stream starts within 2 seconds)

### Bug Fixes & Polish (Day 21)

- [x] T111 [SP5] Fix any bugs found during manual testing
- [x] T112 [SP5] Optimize RecyclerView scrolling performance (60fps target)
- [x] T113 [SP5] Add loading animations (shimmer effects for channel list)
- [x] T114 [SP5] Polish player UI (smooth transitions, focus animations)
- [x] T115 [SP5] Verify memory usage < 200MB during video playback

**Checkpoint**: Phase 2 feature-complete and tested

---

## Sub-Phase 6: Documentation & Completion (1-2 days)

**Purpose**: Update documentation, create completion summary, prepare for review

### Code Documentation (Day 21)

- [x] T116 [P] [SP6] Add KDoc comments to all public methods and classes
- [x] T117 [P] [SP6] Document complex logic (e.g., preference merging, HMAC signing)
- [x] T118 [P] [SP6] Add inline comments for D-pad focus management workarounds

### Project Documentation (Day 21-22)

- [x] T119 [SP6] Update `apps/android/README.md` with Phase 2 features
- [x] T120 [SP6] Update `apps/android/DEVELOPMENT.md` with MVVM architecture details
- [x] T121 [SP6] Update `apps/android/MANUAL-TEST-GUIDE.md` with Phase 2 test scenarios
- [x] T122 [SP6] Create `specs/013-android-app-phase2/PHASE2-COMPLETE.md` completion summary

### Testing Documentation (Day 22)

- [x] T123 [SP6] Create `specs/013-android-app-phase2/MANUAL-TEST-RESULTS.md` with test outcomes
- [x] T124 [SP6] Document any known issues or limitations in completion summary
- [x] T125 [SP6] Update test coverage report (target 80%+ for ViewModels and Use Cases)

### Spec Updates (Day 22)

- [x] T126 [SP6] Update `.specify/features/013-android-app.md` to mark Phase 2 complete
- [x] T127 [SP6] Archive Phase 2 work-in-progress docs to `specs/013-android-app-phase2/archive/`

### Final Verification (Day 22)

- [x] T128 [SP6] Run full lint check: `./gradlew lint` (0 errors required)
- [x] T129 [SP6] Run full test suite: `./gradlew test` (all tests passing)
- [x] T130 [SP6] Build release APK: `./gradlew assembleRelease`
- [x] T131 [SP6] Verify APK size < 25MB (target 20-22MB)
- [x] T132 [SP6] Create PR with Phase 2 changes (reference completion summary)

**Checkpoint**: Phase 2 complete and ready for merge

---

## Dependencies & Execution Order

### Sub-Phase Dependencies

- **SP1 (Architecture Setup)**: No dependencies - can start immediately - **BLOCKS all other sub-phases**
- **SP2 (Channel List UI)**: Depends on SP1 completion
- **SP3 (Video Player)**: Depends on SP1 completion - Can run in parallel with SP2
- **SP4 (Favorites)**: Depends on SP2 completion (needs channel list UI)
- **SP5 (Testing)**: Depends on SP2, SP3, SP4 completion
- **SP6 (Documentation)**: Depends on SP5 completion

### Within Each Sub-Phase

- **SP1 Architecture**: Dependencies (T001-T007) → Hilt setup (T008-T012) → Data layer → API models → Domain layer → Repositories
- **SP2 Channel List**: ViewModel → Layout/Fragment → Adapter → Navigation → Favorites → Error handling
- **SP3 Video Player**: Activity/ViewModel → Stream URL → ExoPlayer → Event handling → Controls → Integration
- **SP4 Favorites**: API integration → UI updates → Preference sync
- **SP5 Testing**: Unit tests (parallel) → Integration tests → Manual testing → Bug fixes
- **SP6 Documentation**: Code docs (parallel) → Project docs → Spec updates → Final verification

### Parallel Opportunities

- **SP1 Day 1**: All dependency additions (T001-T007) can run in parallel
- **SP1 Day 2**: Hilt modules (T010-T012) can run in parallel
- **SP1 Day 2**: Data layer (T013-T015) can run in parallel after DataStore setup
- **SP1 Day 3**: API models (T018-T022) can run in parallel
- **SP1 Day 4**: Domain models and use cases (T025-T028) can run in parallel
- **SP1 Day 4**: Repositories (T029-T030) can run in parallel
- **SP2 Day 5**: Layout files (T037-T038) can run in parallel
- **SP2+SP3**: After SP1 completes, channel list UI (SP2) and video player (SP3) can proceed in parallel
- **SP5**: All unit tests (T097-T102) can run in parallel
- **SP6**: Code documentation (T116-T118) can run in parallel with project docs

---

## Implementation Strategy

### Critical Path (Minimum Viable Phase 2)

1. **Complete SP1: Architecture Setup** (3-4 days) - BLOCKING
2. **Complete SP2: Channel List UI** (4-5 days)
3. **Complete SP3: Video Player** (5-7 days)
4. **Complete SP5: Testing** (basic manual testing only)
5. **STOP and VALIDATE**: Can browse channels and watch video?
6. **Deploy/demo** Phase 2 MVP

### Recommended Approach (Full Phase 2)

1. Complete SP1 (Days 1-4)
2. Complete SP2 (Days 5-9)
3. Complete SP3 (Days 10-16) - Can overlap with SP2 if two developers
4. Complete SP4 (Days 17-19)
5. Complete SP5 (Days 19-21)
6. Complete SP6 (Days 21-22)
7. Create PR and merge

### Parallel Team Strategy

With two developers after SP1 completes:

- **Developer A**: SP2 (Channel List) → SP4 (Favorites) → SP5 (Testing)
- **Developer B**: SP3 (Video Player) → SP5 (Testing) → SP6 (Documentation)

---

## Notes

- **[P] tasks** can run in parallel (different files, no shared state)
- **Sub-phase labels** map tasks to specific implementation phases
- Each sub-phase has clear checkpoints for validation
- **Stop after SP3** for MVP (channel browsing + video playback)
- **Add SP4** for favorites (nice-to-have)
- **SP5 is mandatory** for quality assurance
- **SP6 is mandatory** for project documentation
- Commit frequently: after each logical task or group of related tasks
- Run lint + tests before each commit
- Avoid: skipping architecture setup (SP1), implementing UI before ViewModels, skipping manual testing

---

## Success Criteria (Phase 2 Complete)

✅ Users can browse channel lineup with D-pad navigation  
✅ Users can select a channel and watch HLS video within 2 seconds  
✅ Favorites appear at top of channel list with visual indicator  
✅ Video player has working controls (play/pause, back)  
✅ Error handling works (network errors, token expiration, retry)  
✅ All unit tests passing (80%+ coverage for ViewModels/Use Cases)  
✅ Manual testing complete (16 scenarios from `quickstart.md`)  
✅ Lint clean (0 errors)  
✅ Documentation updated (README, DEVELOPMENT, MANUAL-TEST-GUIDE)  
✅ APK size < 25MB  

**Estimated Completion**: 15-21 days (3-4 weeks) from Phase 2 start
