# Phase 2 Start Prompt

Copy and paste this prompt to begin Phase 2 implementation:

---

I'm ready to start implementing Android Phase 2: Channel Browsing & Streaming.

**Current Status**:
- ✅ Branch: `013-android-app-phase2-impl`
- ✅ Backend APIs ready (POST /api/stream-token, GET /api/preferences/channels)
- ✅ Planning complete (plan.md, research.md, data-model.md, contracts, quickstart.md)
- ✅ Task breakdown ready (132 tasks in 6 sub-phases)

**Phase 2 Scope**:
- Channel browsing with D-pad navigation
- HLS video playback with AndroidX Media3 ExoPlayer
- Favorites integration (display user's favorite channels)
- MVVM architecture (ViewModels, Use Cases, Hilt DI)
- Modern dependencies (Retrofit, DataStore, Coil)

**Implementation Timeline**: 15-21 days (3-4 weeks)

**Next Steps**:
1. Start with **Sub-Phase 1 (T001-T031)**: Architecture & Dependencies Setup
2. First task: **T001** - Add Retrofit 2.11.0 dependencies to `apps/android/app/build.gradle.kts`
3. Follow `specs/013-android-app-phase2/tasks.md` task by task

**Key Resources**:
- `specs/013-android-app-phase2/tasks.md` - 132 tasks (YOUR MAIN GUIDE)
- `specs/013-android-app-phase2/plan.md` - Implementation strategy (800 lines)
- `specs/013-android-app-phase2/research.md` - Technology choices (650 lines)
- `specs/013-android-app-phase2/data-model.md` - Entity definitions (800 lines)

**Success Criteria**:
- Users can browse channel lineup with D-pad navigation
- Users can select a channel and watch HLS video within 2 seconds
- Favorites appear at top of channel list with visual indicator
- 80%+ test coverage for ViewModels and Use Cases
- Lint clean (0 errors), APK size < 25MB

**Workflow**:
For each task:
1. Implement the task
2. Run lint: `./gradlew lint` (from apps/android/)
3. Run tests: `./gradlew test` (from apps/android/)
4. Commit: `git commit -m "[SP#][T###] Task description"`

Let's begin with T001: Add Retrofit 2.11.0 dependencies to build.gradle.kts.

---

## Alternative: Start with Multiple Tasks

If you want to batch the first few tasks:

---

I'm ready to start implementing Android Phase 2. Let's begin with **Sub-Phase 1, Day 1** which includes adding all dependencies (Tasks T001-T007):

**Tasks to complete**:
- T001: Add Retrofit 2.11.0, Moshi converter, logging interceptor
- T002: Add AndroidX DataStore 1.1.1+ (preferences and proto)
- T003: Add Coil 2.7.0+ (image loading)
- T004: Add AndroidX Media3 1.9.0+ (ExoPlayer, UI, HLS)
- T005: Add Hilt 2.52+ with KSP plugin
- T006: Add Kotlin Coroutines 1.10.1 and Flow
- T007: Add testing dependencies (Turbine 1.0.0, MockK 1.13.13)

All of these update the same file: `apps/android/app/build.gradle.kts`

Reference:
- `specs/013-android-app-phase2/research.md` has exact version numbers and dependency declarations
- `specs/013-android-app-phase2/plan.md` section "Technical Context" lists all dependencies

After completing these, we'll move on to T008 (Hilt setup).

---

Pick whichever approach you prefer!
