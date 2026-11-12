# Phase 2 Completion Summary: Channel Browsing & Streaming

**Date**: 2026-06-23  
**Spec**: [013-android-app.md](../../.specify/features/013-android-app.md) v1.4  
**Branch**: `android-app-phase-2`  
**PR**: [Link to PR — TBD]

---

## Overview

Phase 2 delivers the core user-facing functionality of the HD Homey Android TV app: browsing a live channel lineup and watching HLS video streams. The implementation follows a clean MVVM architecture with Hilt dependency injection, Retrofit networking, and Media3 ExoPlayer for playback.

---

## What Was Built

### Architecture & Dependencies (SP1)
- **Hilt DI framework**: `@HiltAndroidApp` application class, `@AndroidEntryPoint` activities/fragments
- **Network layer**: Retrofit 2.11.0 with kotlinx-serialization converter, OkHttp interceptors for auth and error handling
- **Data persistence**: DataStore Preferences for app settings, Encrypted DataStore for auth tokens
- **Media playback**: Media3 ExoPlayer singleton for HLS stream playback
- **Testing**: Turbine for Flow testing, MockK for mocking, Robolectric for Android-dependent tests

### Data & Domain Layers (SP1)
- **API models**: ChannelDto, TunerDto, StreamTokenDto, ChannelPreferenceDto, ApiResponse (DataResponse/ErrorResponse)
- **Domain models**: Channel, StreamToken, ChannelPreferences, ChannelWithMetadata
- **DTO→Domain mappers**: ChannelMapper, StreamTokenMapper
- **Repositories**: ChannelRepository, PreferencesRepository, TokenRepository
- **Use Cases**: GetChannelsUseCase, GetChannelPreferencesUseCase, GenerateStreamUrlUseCase

### Channel List UI (SP2)
- **Navigation**: ChannelListFragment added to nav_graph, auto-detects first available tuner
- **ViewModel**: ChannelListViewModel with StateFlow<ChannelListUiState> (Loading/Success/Error/Empty)
- **Layout**: fragment_channel_list.xml with CoordinatorLayout, RecyclerView, loading/error/empty states
- **Channel item**: item_channel.xml with CardView, channel number, name, HD badge, favorite icon
- **D-pad navigation**: focusable items with nextFocusUp/Down, elevation-based focus indicators
- **Favorites sorting**: channels sorted favorites-first, then by channel number
- **Shimmer loading**: animated shimmer effect during data loading

### Video Player (SP3)
- **PlayerActivity**: @AndroidEntryPoint activity with full-screen Media3 PlayerView
- **PlayerViewModel**: generates HMAC-signed stream URLs via GenerateStreamUrlUseCase
- **PlayerEventListener**: translates ExoPlayer events (buffering, playing, error) into UI state
- **Exponential backoff**: retry logic with 1s/2s/4s delays, max 3 attempts
- **Lifecycle management**: ExoPlayer connected in onStart, disconnected in onStop, released in onDestroy
- **Channel overlay**: channel name and number displayed during playback

### Favorites Integration (SP4)
- **Preference merging**: GetChannelsUseCase merges channel data with user preferences
- **In-memory cache**: 5-minute TTL cache for channel preferences
- **Graceful degradation**: preference API failures fall back to empty preferences (channel list still works)
- **Sort**: favorites appear at top of channel list

---

## Architecture Decision Records

### Why Hilt over manual DI?
Hilt provides compile-time verified dependency graphs, reduces boilerplate, and integrates naturally with AndroidX ViewModel and Navigation. The singleton-scoped ExoPlayer is a clean fit for Hilt's SingletonComponent.

### Why cookie-based auth (not Bearer)?
The HD Homey backend uses Better-Auth with JWT sessions stored in HTTP-only cookies. The Android app uses an OkHttp interceptor (`AuthInterceptor`) to attach the session cookie to every API request. This eliminated the need for custom token refresh logic.

### Why ExoPlayer as a singleton?
HD Homey streams one channel at a time — there is never a need for multiple player instances. A singleton avoids the creation/release overhead on every channel change and keeps the media session consistent.

### Why full-screen Activity (not Fragment)?
A separate Activity for video playback provides independent lifecycle management, proper back-stack behavior, and keeps the player isolated from navigation component state. The `parentActivityName` manifest attribute ensures the up button returns to the channel list.

---

## Project Statistics

| Metric | Value |
|---|---|
| **Total Phase 2 commits** | ~25 |
| **New Kotlin files** | 30+ |
| **New XML layouts** | 3 (fragment_channel_list, item_channel, activity_player) |
| **New unit tests** | 45+ (across 6 test files) |
| **DI modules** | 3 (NetworkModule, MediaModule, DataModule) |
| **Total Phase 1+2 tests** | ~130 |
| **Architecture layers** | 4 (data, domain, di, ui) |

### File Count by Layer
| Layer | Files |
|---|---|
| API (DTOs + Service + Interceptors) | 8 |
| Data (Repositories + Mappers) | 6 |
| Domain (Models + Use Cases) | 7 |
| DI Modules | 3 |
| UI (Fragments, Activities, ViewModels, Adapters) | 10 |
| Tests | 6 new + existing |

---

## Testing Summary

### New Unit Tests
| Test File | Test Count | Coverage |
|---|---|---|
| ChannelListViewModelTest | 10 | ViewModel state transitions, retry, error handling |
| PlayerViewModelTest | 11 | Player states, play/pause, release, retry with backoff |
| GetChannelsUseCaseTest | 7 | Preference merging, error propagation |
| GenerateStreamUrlUseCaseTest | 8 | URL construction, API integration |
| ChannelRepositoryTest | 15 | DTO→domain mapping, error propagation |
| TokenRepositoryTest | 10 | Delegation, sync/async read, hasToken |

### Testing Approach
- **ViewModels**: Test state transitions with Turbine, mock use cases with MockK
- **Use Cases**: Test business logic with mocked repositories
- **Repositories**: Test DTO→domain mapping end-to-end (not mocked), API error propagation
- **Domain Models**: Test computed properties (sortKey, displayName, isValid, etc.)

---

## Known Issues & Limitations

1. **ExoPlayer singleton lifecycle**: The shared player instance means returning to the channel list while a stream is playing will keep the connection alive until `onDestroy`. This is acceptable for the MVP.
2. **Tuner name display**: The channel list shows "Tuner N" instead of the actual tuner name. A future enhancement should fetch and cache tuner names.
3. **No picture-in-picture**: PiP mode is not implemented. The player occupies the full screen.
4. **No thumbnail/channel logo loading**: Coil dependency was declared but channel logo loading is deferred to Phase 3.
5. **No Espresso UI tests**: Integration tests were deferred in favor of unit test coverage due to environment constraints.
6. **No program guide**: EPG (Electronic Program Guide) data is not fetched or displayed.

---

## Backend Compatibility

All Phase 2 features work with the existing HD Homey backend APIs:

| Endpoint | Used By | Method |
|---|---|---|
| `GET /api/tuners` | ChannelListViewModel | Auto-detect first tuner |
| `GET /api/tuners/{id}/channels` | ChannelRepository | Fetch channel lineup |
| `POST /api/stream-token` | GenerateStreamUrlUseCase | Get HMAC token |
| `GET /api/preferences/channels` | PreferencesRepository | Fetch favorites/hidden |

All API calls use cookie-based authentication via AuthInterceptor.

---

## How to Verify

1. Build and install on Android TV emulator or device
2. Add an HD Homey server and authenticate
3. Tap on an authenticated server → Channel list appears
4. Browse channels using D-pad (up/down)
5. Select a channel → PlayerActivity launches, HLS stream starts
6. Playback controls appear (use_controller="true")
7. Press back → Return to channel list
8. Tap refresh button → Channels reload
9. Favorite channels appear at top of list

---

## References

- [Feature Spec](../../.specify/features/013-android-app.md)
- [Implementation Plan](plan.md)
- [Data Model](data-model.md)
- [API Contracts](contracts/)
- [Task List](tasks.md)
- [Phase 1 Completion Summary](../013-android-app-phase1/PHASE1-SUMMARY.md)
