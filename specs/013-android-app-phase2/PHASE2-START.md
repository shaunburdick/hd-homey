# Android Phase 2: Implementation Start

**Date**: December 14, 2025  
**Branch**: `013-android-app-phase2-impl`  
**Duration**: 15-21 days (3-4 weeks)  
**Status**: ✅ Ready to Start

---

## Phase 2 Scope

### Features
- ✅ **Channel Browsing**: Fetch and display channel lineup with D-pad navigation
- ✅ **Video Playback**: HLS streaming with AndroidX Media3 ExoPlayer
- ✅ **Favorites Integration**: Display user's favorite channels (from web app)
- ✅ **MVVM Architecture**: ViewModels, Use Cases, proper layering
- ✅ **Modern Dependencies**: Retrofit, DataStore, Coil, Hilt DI

### User Stories (from Spec v1.3)
- **Story 2 (P1)**: Browse Channels with D-pad Navigation ✅
- **Story 3 (P1)**: Watch Live TV with Native Video Player ✅

### Technical Goals
- Video playback starts within 2 seconds of channel selection
- Channel list loads within 1 second (cached) or 3 seconds (network)
- UI responds to D-pad input within 100ms
- Smooth 60fps scrolling on channel list
- Memory usage < 200MB during video playback
- 80%+ test coverage for ViewModels and Use Cases

---

## Prerequisites Status

### ✅ Phase 1 Complete & Merged
- Multi-server management (add/edit/delete)
- OAuth device pairing (6-character codes)
- JWT token storage (encrypted SharedPreferences)
- Android TV optimized UI (D-pad navigation)
- 86 unit tests, 100% data layer coverage

### ✅ Backend APIs Ready
- **POST /api/stream-token** - Generates HMAC tokens for video streams
- **GET /api/preferences/channels** - Fetches user's favorite/hidden channels
- **GET /api/tuners/{id}/channels** - Returns channel lineup (existing)

### ✅ Planning Complete
- **plan.md** (800 lines) - Implementation strategy, architecture decisions
- **research.md** (650 lines) - Technology choices (Retrofit, Media3, Coil, DataStore, Hilt)
- **data-model.md** (800 lines) - Entity definitions (Channel, Tuner, Preferences, StreamToken)
- **contracts/*.yaml** (695 lines) - API contract specifications (OpenAPI format)
- **quickstart.md** (500 lines) - 16 manual testing scenarios
- **tasks.md** (398 lines) - 132 tasks in 6 sub-phases

---

## Task Breakdown

### Sub-Phase 1: Architecture & Dependencies (3-4 days) - **BLOCKING**
**Tasks**: T001-T031 (31 tasks)
- Dependencies: Retrofit, DataStore, Coil, Media3, Hilt
- Hilt DI setup (NetworkModule, DataModule, MediaModule)
- Data layer (DataStore migration, repositories, interceptors)
- API models (Channel, Tuner, StreamToken, Preferences)
- Retrofit API interface (HdHomeyApiService)
- Domain layer (Use Cases: GetChannels, GenerateStreamUrl, GetPreferences)

### Sub-Phase 2: Channel List UI (4-5 days)
**Tasks**: T032-T055 (24 tasks)
- ViewModel & state management
- RecyclerView with ChannelAdapter
- D-pad navigation & focus handling
- Coil image loading (channel logos)
- Favorites display (star icon, sort to top)
- Error handling & retry

### Sub-Phase 3: Video Player (5-7 days)
**Tasks**: T056-T087 (32 tasks)
- PlayerActivity & PlayerViewModel
- Stream URL generation (HMAC tokens)
- ExoPlayer integration (HLS playback)
- Player event handling (buffering, errors)
- Custom player controls (D-pad friendly)
- Error recovery (network, token expiration)

### Sub-Phase 4: Favorites Integration (2-3 days)
**Tasks**: T088-T096 (9 tasks)
- Merge channels with preferences
- UI updates (star icon, visual distinction)
- Preference caching & sync

### Sub-Phase 5: Testing & Polish (2-3 days)
**Tasks**: T097-T115 (19 tasks)
- Unit tests (ViewModels, Use Cases, Repositories)
- Integration/UI tests (Espresso)
- Manual testing (16 scenarios from quickstart.md)
- Bug fixes & performance optimization

### Sub-Phase 6: Documentation & Completion (1-2 days)
**Tasks**: T116-T132 (17 tasks)
- Code documentation (KDoc comments)
- Project documentation (README, DEVELOPMENT, MANUAL-TEST-GUIDE)
- Completion summary & test results
- Spec updates
- Final verification (lint, tests, build, APK size)

---

## Implementation Strategy

### Critical Path (MVP)
1. Complete SP1: Architecture (Days 1-4) - **BLOCKING**
2. Complete SP2: Channel List (Days 5-9)
3. Complete SP3: Video Player (Days 10-16)
4. Basic Testing (manual only)
5. **STOP and VALIDATE**: Can browse channels and watch video?

### Full Phase 2 (Recommended)
1. SP1 (Days 1-4)
2. SP2 (Days 5-9)
3. SP3 (Days 10-16)
4. SP4 (Days 17-19) - Favorites
5. SP5 (Days 19-21) - Testing & polish
6. SP6 (Days 21-22) - Documentation
7. Create PR and merge

### Parallel Strategy (2 Developers)
After SP1 completes:
- **Developer A**: SP2 (Channel List) → SP4 (Favorites) → SP5 (Testing)
- **Developer B**: SP3 (Video Player) → SP5 (Testing) → SP6 (Documentation)

---

## Success Criteria

### Functional Requirements
- ✅ Users can browse channel lineup with D-pad navigation
- ✅ Users can select a channel and watch HLS video within 2 seconds
- ✅ Favorites appear at top of channel list with visual indicator
- ✅ Video player has working controls (play/pause, back)
- ✅ Error handling works (network errors, token expiration, retry)

### Quality Requirements
- ✅ All unit tests passing (80%+ coverage for ViewModels/Use Cases)
- ✅ Manual testing complete (16 scenarios from quickstart.md)
- ✅ Lint clean (0 errors)
- ✅ APK size < 25MB
- ✅ Memory usage < 200MB during playback
- ✅ 60fps scrolling on channel list

### Documentation Requirements
- ✅ README updated with Phase 2 features
- ✅ DEVELOPMENT updated with MVVM architecture
- ✅ MANUAL-TEST-GUIDE updated with Phase 2 scenarios
- ✅ Completion summary created
- ✅ Test results documented

---

## Next Steps

### Immediate Actions
1. **Start Sub-Phase 1**: T001 - Update `build.gradle.kts` with dependencies
2. Follow `tasks.md` task-by-task through SP1
3. Complete SP1 (Days 1-4) before starting any UI work
4. Create feature branch for each sub-phase (optional) or commit directly to `013-android-app-phase2-impl`

### Development Workflow
```bash
# Current branch: 013-android-app-phase2-impl

# For each task:
# 1. Implement the task
# 2. Run lint: ./gradlew lint
# 3. Run tests: ./gradlew test
# 4. Commit: git commit -m "[SP#][T###] Task description"

# Example:
git commit -m "[SP1][T001] Add Retrofit 2.11.0 dependencies to build.gradle.kts"
```

### Key Files to Track
- `apps/android/app/build.gradle.kts` - Dependency updates (SP1)
- `apps/android/app/src/main/java/com/hdhomey/app/di/` - Hilt modules (SP1)
- `apps/android/app/src/main/java/com/hdhomey/app/api/` - API models & service (SP1)
- `apps/android/app/src/main/java/com/hdhomey/app/domain/` - Use Cases (SP1)
- `apps/android/app/src/main/java/com/hdhomey/app/ui/channels/` - Channel list UI (SP2)
- `apps/android/app/src/main/java/com/hdhomey/app/ui/player/` - Video player (SP3)

---

## Resources

### Planning Documents
- `specs/013-android-app-phase2/plan.md` - Implementation strategy
- `specs/013-android-app-phase2/research.md` - Technology choices
- `specs/013-android-app-phase2/data-model.md` - Entity definitions
- `specs/013-android-app-phase2/contracts/*.yaml` - API contracts
- `specs/013-android-app-phase2/quickstart.md` - Testing scenarios
- `specs/013-android-app-phase2/tasks.md` - Task breakdown (this is your guide!)

### Backend Documentation
- `specs/013-android-app-phase2/BACKEND-TESTING.md` - How to test backend APIs
- `specs/013-android-app-phase2/WHY-COOKIE-AUTH.md` - Cookie authentication explanation

### Phase 1 Reference
- `apps/android/README.md` - Phase 1 achievements
- `apps/android/DEVELOPMENT.md` - Current architecture patterns
- `specs/013-android-app-phase1/PHASE1-SUMMARY.md` - Phase 1 learnings

---

## Architecture Evolution

### Phase 1 → Phase 2 Changes

| Aspect | Phase 1 | Phase 2 |
|--------|---------|---------|
| **Architecture** | Simplified Repository Pattern | MVVM + Use Cases |
| **UI State** | Direct Fragment updates | StateFlow<UiState> |
| **API Calls** | Raw OkHttp | Retrofit 2.11.0 |
| **Storage** | SharedPreferences | DataStore |
| **Images** | Manual loading | Coil 2.7.0 |
| **Video** | None | Media3 ExoPlayer 1.9.0 |
| **DI** | Manual/None | Hilt 2.52 |

### Why These Changes?
- **MVVM**: Phase 2 complexity (channels, video, preferences) requires proper state management
- **Retrofit**: 5+ API endpoints → type-safe interfaces better than manual OkHttp
- **DataStore**: Type-safe preferences, Flow support, better than SharedPreferences
- **Coil**: Efficient image loading with caching (channel logos)
- **Media3**: Industry-standard video player with HLS support
- **Hilt**: Dependency injection simplifies testing and lifecycle management

---

## Estimated Timeline

### Optimistic (15 days)
- SP1: 3 days
- SP2: 4 days
- SP3: 5 days
- SP4: 2 days
- SP5: 2 days (basic testing)
- SP6: 1 day
- **Total**: 15 working days (3 weeks)

### Realistic (18 days)
- SP1: 4 days
- SP2: 4 days
- SP3: 6 days
- SP4: 2 days
- SP5: 3 days
- SP6: 1 day
- **Total**: 18 working days (3.5 weeks)

### Conservative (21 days)
- SP1: 4 days (learning curve for new libraries)
- SP2: 5 days (D-pad navigation complexity)
- SP3: 7 days (ExoPlayer learning + edge cases)
- SP4: 3 days (API integration edge cases)
- SP5: 3 days (thorough testing + bug fixes)
- SP6: 2 days (comprehensive documentation)
- **Total**: 21 working days (4 weeks)

---

## Risk Mitigation

### Known Risks
1. **ExoPlayer learning curve** (SP3) - Mitigation: Follow Media3 samples, allocate extra time
2. **D-pad focus management** (SP2) - Mitigation: Leverage Phase 1 learnings, test frequently
3. **HMAC token generation** (SP3) - Mitigation: Backend already tested, reference backend code
4. **DataStore migration** (SP1) - Mitigation: Keep SharedPreferences API compatible during migration
5. **Hilt learning curve** (SP1) - Mitigation: Start with simple modules, expand gradually

### Blocked By
- ❌ Nothing - All prerequisites complete!

---

## Session Tracking

### Session 1 (December 14, 2025)
- ✅ PR #28 merged (backend + planning)
- ✅ Main branch updated
- ✅ Task breakdown created (132 tasks)
- ✅ Implementation branch created: `013-android-app-phase2-impl`
- ✅ Ready to start T001

### Next Session
- Start **Sub-Phase 1 (T001)**: Add Retrofit dependencies to `build.gradle.kts`
- Goal: Complete SP1 (T001-T031) within 3-4 days
- Checkpoint: Architecture ready → Can start UI work

---

**Status**: ✅ Phase 2 Ready to Start  
**Next Task**: T001 - Add Retrofit 2.11.0 dependencies  
**Branch**: `013-android-app-phase2-impl`  
**Estimated Completion**: January 6-9, 2026 (3-4 weeks)
