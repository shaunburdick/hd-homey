# Orchestration Log: Android Compose Migration

## Status
- **Current Wave**: Wave 0 — Foundation (Complete ✅)
- **Branch**: `android-app-phase-2`
- **Last Updated**: 2026-06-29

## Plan Summary
Full migration of Android app from XML/Fragments/ViewBinding to Jetpack Compose + Material 3. 29 tasks across 6 waves. Wave 0 (Foundation) is sequential build config → theme → components → nav → MainActivity. Each subsequent wave builds on the foundation.

## Task Wave Progress

### Wave 0 — Foundation — ✅ Complete
- T-001: Add Compose deps to version catalog — ✅ done (commit 5c0c88c)
- T-002: Enable Compose build features + plugin — ✅ done (commit d53caa8)
- T-003: Create theme package (Color, Type, Shape, ExtendedColors, HdHomeyTheme) — ✅ done (commit 238132f)
- T-004: Create shared components (AsyncState, Shimmer, AdaptiveValues) — ✅ done (commit 6ed943d)
- T-005: Create navigation infrastructure (Routes, NavGraph) — ✅ done (commit 0d07105)
- T-006: Rewrite MainActivity for Compose — ✅ done (commit 5a6cc3a)

### Wave 1 — Core Screens — ⏳ Pending
- T-007: Create ServerListScreen — ⏳ pending
- T-008: Create ChannelCard composable — ⏳ pending [P]
- T-009: Create ChannelListScreen — ⏳ pending [P]
- T-010: Create ChannelAdapter ViewModel integration — ⏳ pending [P]

### Wave 2 — Player Screen — ⏳ Pending
### Wave 3 — Secondary Screens — ⏳ Pending
### Wave 4 — Cleanup & Polish — ⏳ Pending
### Wave 5 — Verification — ⏳ Pending

## Decisions & Rationale
- 2026-06-29: Kotlin 2.2.10 Compose compiler is built-in — no `kotlinCompilerExtensionVersion` needed, just `kotlin-compose` plugin
- 2026-06-29: Coil 3.5.0 requires compileSdk 36 — bumped from 35
- 2026-06-29: Gradle 9.4.1 reserves `class` as keyword — `compose-window-size-class` renamed to `compose-window-size-classes` in version catalog
- 2026-06-29: Coil 3.5.0 transitively pulls kotlin-stdlib 2.4.0 — added resolutionStrategy.force() to pin 2.2.10
- 2026-06-29: `@Composable` annotation required on extension property accessing `CompositionLocal.current` (Compose BOM 2026.06.00 + Kotlin 2.2.10)
- 2026-06-29: `theme.xml` removal deferred to Wave 4 — existing XML resources still compile alongside Compose during migration

## Blockers & Escalations
- None yet
