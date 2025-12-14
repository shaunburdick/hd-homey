# Implementation Plan: Android App Phase 2 - Channel Browsing & Streaming

**Branch**: `013-android-app-phase2` | **Date**: 2025-12-14 | **Spec**: [013-android-app.md](../../.specify/features/013-android-app.md)  
**Input**: Feature specification from `/.specify/features/013-android-app.md`  
**Phase**: 2 - Channel Browsing & Video Playback  
**Prerequisites**: ✅ Phase 1 complete and merged

## Summary

Phase 2 implements the core TV viewing experience: browsing channels from HDHomeRun tuners and streaming live TV using AndroidX Media3 (ExoPlayer). Users can view organized channel lists with metadata, select channels with D-pad navigation, and watch HLS streams with secure HMAC authentication. The phase introduces proper MVVM architecture (ViewModels, Use Cases) and modern Android libraries (DataStore, Coil) to replace the simplified Phase 1 patterns.

**Primary Requirements**:
- Fetch and display channel lineup from authenticated HD Homey server
- AndroidX Media3 video player for HLS streaming
- Channel favorites integration (read from backend preferences)
- TV-optimized UI with D-pad navigation
- Secure stream URL generation with HMAC tokens

**Technical Approach**:
- MVVM architecture with ViewModels and Use Cases
- Retrofit for type-safe API calls
- Coil for efficient image loading (channel logos)
- DataStore for secure token storage
- Media3 ExoPlayer for HLS playback
- Kotlin Coroutines + Flow for reactive data

## Technical Context

**Language/Version**: Kotlin 2.1.0  
**Primary Dependencies**:
- AndroidX Media3 1.9.0+ (video playback - ExoPlayer)
- Retrofit 2.11.0+ (HTTP client, replacing raw OkHttp)
- Coil 2.7.0+ (image loading for channel logos)
- DataStore 1.1.1+ (secure preferences, replacing SharedPreferences)
- Kotlin Coroutines 1.10.1 (async operations)
- Hilt 2.52+ (dependency injection)

**Storage**:
- DataStore (encrypted) - JWT tokens, active server, preferences
- In-memory cache - Channel data (transient, refreshed on app start)

**Testing**: JUnit 4.13.2, Truth 1.4.4, Robolectric 4.14.1, MockK 1.13.13, Turbine 1.0.0 (Flow testing)

**Target Platform**: Android 12+ (API 31+), Android TV optimized, universal app (TV/tablet/phone)

**Project Type**: Mobile - Single APK, multiple form factors

**Performance Goals**:
- Video playback starts within 2 seconds of channel selection
- Channel list loads within 1 second (cached) or 3 seconds (network)
- UI responds to D-pad input within 100ms
- Smooth 60fps scrolling on channel list
- Memory usage < 200MB during video playback

**Constraints**:
- HLS-only (no raw MPEG-2 TS in Phase 2 - simplify)
- Must work on Android TV emulator for testing
- JWT token refresh handling required (7-day expiry)
- Stream URLs expire (HMAC tokens, 15-minute validity)

**Scale/Scope**:
- Support 1-10 servers per user
- Display 50-200 channels per server
- 4-5 new screens (channel list, channel detail, video player, settings)
- ~3,000 LOC production code
- ~2,000 LOC test code

## Constitution Check

✅ **Simplicity First**: Phase 2 introduces ViewModels and proper MVVM, but only because Phase 1 validated the simplified approach and identified pain points (Fragment → Repository direct calls led to tight coupling). Hilt DI is justified for managing Media3, Retrofit, and DataStore lifecycles.

✅ **Open Source**: All dependencies are open source (Media3, Retrofit, Coil, Hilt).

✅ **Privacy**: JWT tokens stored in encrypted DataStore. No analytics, no tracking, no user data sent to third parties.

✅ **Security**: HMAC stream tokens validated server-side. HTTPS enforced for remote connections.

✅ **Testing**: Target 80%+ coverage for ViewModels and Use Cases. Robolectric for Android unit tests.

✅ **Documentation**: Update README, DEVELOPMENT, MANUAL-TEST-GUIDE with Phase 2 features.

**No violations** - Phase 2 complexity justified by real-world needs identified in Phase 1.

## Project Structure

### Documentation (this feature)

```text
specs/013-android-app-phase2/
├── plan.md              # This file - implementation strategy
├── research.md          # Technology choices and justifications
├── data-model.md        # Channel, Tuner, Preference entities
├── quickstart.md        # Phase 2 manual testing scenarios
├── contracts/           # API contracts and event schemas
│   ├── channel-api.yaml    # GET /api/tuners/{id}/channels
│   ├── stream-token.yaml   # GET /api/stream-token
│   └── preferences.yaml    # Channel favorites format
└── tasks.md             # Phase 2 task breakdown (created by /speckit.tasks)
```

### Source Code (existing monorepo)

```text
apps/android/app/src/main/java/com/hdhomey/app/
├── MainActivity.kt                     # [EXISTING] Navigation host
│
├── di/                                 # [NEW] Dependency injection
│   ├── NetworkModule.kt                   # Retrofit, OkHttp configuration
│   ├── DataModule.kt                      # DataStore, Repository providers
│   └── MediaModule.kt                     # Media3 ExoPlayer setup
│
├── ui/
│   ├── servers/                        # [EXISTING] Phase 1 screens
│   │   ├── ServerListFragment.kt          # [KEEP] Server management
│   │   ├── ServerListAdapter.kt           # [KEEP]
│   │   └── AddServerFragment.kt           # [KEEP]
│   │
│   ├── auth/                           # [EXISTING] Phase 1 screens
│   │   └── AuthenticationFragment.kt      # [KEEP] Device pairing
│   │
│   ├── channels/                       # [NEW] Channel browsing
│   │   ├── ChannelListFragment.kt         # Main channel list screen
│   │   ├── ChannelListViewModel.kt        # ViewModel for channel list
│   │   ├── ChannelAdapter.kt              # RecyclerView adapter
│   │   ├── ChannelDetailFragment.kt       # Channel detail/info screen
│   │   └── ChannelDetailViewModel.kt      # ViewModel for detail
│   │
│   ├── player/                         # [NEW] Video playback
│   │   ├── PlayerActivity.kt              # Full-screen player (separate activity)
│   │   ├── PlayerViewModel.kt             # ViewModel for playback state
│   │   └── PlayerControlsView.kt          # Custom player controls
│   │
│   └── success/                        # [EXISTING] Phase 1 screen
│       └── SuccessFragment.kt             # [KEEP] Success confirmation
│
├── api/                                # [EXISTING] API layer
│   ├── HdHomeyApi.kt                      # [MODIFY] Add Retrofit interface
│   ├── DeviceCodeService.kt               # [KEEP] Phase 1 service
│   │
│   ├── models/                         # [EXISTING + NEW] Data models
│   │   ├── DeviceCodeRequest.kt           # [KEEP] Phase 1
│   │   ├── DeviceCodeResponse.kt          # [KEEP] Phase 1
│   │   ├── PollResponse.kt                # [KEEP] Phase 1
│   │   ├── Channel.kt                     # [NEW] Channel entity
│   │   ├── Tuner.kt                       # [NEW] Tuner entity
│   │   ├── StreamTokenRequest.kt          # [NEW]
│   │   ├── StreamTokenResponse.kt         # [NEW]
│   │   └── ChannelPreferences.kt          # [NEW] Favorites, hidden
│   │
│   └── interceptors/                   # [NEW] HTTP interceptors
│       ├── AuthInterceptor.kt             # Add JWT token to requests
│       └── ErrorInterceptor.kt            # Handle 401, 403 errors
│
├── domain/                             # [NEW] Business logic
│   ├── usecase/
│   │   ├── GetChannelsUseCase.kt          # Fetch channels from server
│   │   ├── GenerateStreamUrlUseCase.kt    # Generate HMAC stream URL
│   │   ├── GetChannelPreferencesUseCase.kt # Fetch favorites/hidden
│   │   └── RefreshTokenUseCase.kt         # Handle JWT refresh
│   │
│   └── model/                          # [NEW] Domain models (if needed)
│       └── ChannelWithMetadata.kt         # Channel + favorite status
│
├── data/                               # [EXISTING] Data layer
│   ├── model/
│   │   └── Server.kt                      # [KEEP] Phase 1 model
│   │
│   └── repository/                     # [EXISTING + NEW]
│       ├── ServerRepository.kt            # [KEEP] Phase 1 repository
│       ├── ChannelRepository.kt           # [NEW] Channel data operations
│       ├── TokenRepository.kt             # [NEW] JWT token management
│       └── PreferencesRepository.kt       # [NEW] User preferences
│
├── storage/                            # [EXISTING] Local storage
│   ├── AppPreferences.kt                  # [MIGRATE] SharedPrefs → DataStore
│   └── TokenDataStore.kt                  # [NEW] Encrypted JWT storage
│
├── player/                             # [NEW] Media3 integration
│   ├── HdHomeyMediaSource.kt              # Custom MediaSource for HLS
│   ├── PlayerEventListener.kt             # Playback event handling
│   └── PlayerErrorHandler.kt              # Error recovery logic
│
└── util/                               # [EXISTING] Utilities
    ├── Constants.kt                       # [KEEP] Phase 1 constants
    ├── ErrorHandler.kt                    # [KEEP] Phase 1 errors
    ├── UrlValidator.kt                    # [KEEP] Phase 1 validator
    ├── StreamUrlGenerator.kt              # [NEW] HMAC token generation
    └── ImageLoader.kt                     # [NEW] Coil wrapper
```

**Structure Decision**: Phase 2 adds **MVVM architecture layers** (domain, ViewModels) while preserving Phase 1 foundation. Clean separation between UI (Fragment), ViewModel (state management), UseCase (business logic), Repository (data access), and API (network). Media3 player isolated in `player/` package. Dependency injection with Hilt for testability.

## Architecture Decisions

### 1. MVVM Architecture (ViewModels + Use Cases)

**Decision**: Introduce proper MVVM pattern with ViewModels and Use Cases

**Rationale**:
- Phase 1 used simplified Fragment → Repository direct calls
- Phase 2 complexity (channel state, video playback, preferences) requires state management
- ViewModels survive configuration changes (screen rotation)
- Use Cases encapsulate business logic (e.g., "Generate stream URL" = fetch token + HMAC sign)
- Testability: ViewModels and Use Cases are pure Kotlin (fast unit tests)

**Alternatives Rejected**:
- ❌ **Continue Fragment → Repository**: Led to tight coupling in Phase 1, harder to test
- ❌ **MVI (Model-View-Intent)**: Overkill for Phase 2 scope, can evolve later
- ❌ **Jetpack Compose**: Phase 2 uses XML layouts (consistent with Phase 1), Compose in Phase 3+

**Implementation**:
```kotlin
// ViewModel example
class ChannelListViewModel @Inject constructor(
    private val getChannelsUseCase: GetChannelsUseCase,
    private val getPreferencesUseCase: GetChannelPreferencesUseCase
) : ViewModel() {
    
    private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()
    
    fun loadChannels(tunerId: String) {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            getChannelsUseCase(tunerId)
                .combine(getPreferencesUseCase()) { channels, prefs ->
                    channels.map { it.copy(isFavorite = prefs.favorites.contains(it.id)) }
                }
                .onSuccess { _uiState.value = UiState.Success(it) }
                .onFailure { _uiState.value = UiState.Error(it.message) }
        }
    }
}
```

---

### 2. Retrofit Instead of Raw OkHttp

**Decision**: Migrate from Phase 1's raw OkHttp to Retrofit

**Rationale**:
- Phase 1 used OkHttp directly → manual JSON parsing, boilerplate
- Retrofit provides type-safe API interfaces
- Automatic JSON serialization/deserialization (Kotlinx Serialization)
- Easier error handling and interceptor management
- Industry standard for Android networking

**Alternatives Rejected**:
- ❌ **Keep OkHttp**: Phase 2 has 5+ API endpoints, manual parsing too tedious
- ❌ **Ktor Client**: Less Android-specific, smaller ecosystem

**Implementation**:
```kotlin
interface HdHomeyApi {
    @GET("api/tuners/{tunerId}/channels")
    suspend fun getChannels(@Path("tunerId") tunerId: String): List<Channel>
    
    @GET("api/stream-token")
    suspend fun getStreamToken(
        @Query("tunerId") tunerId: String,
        @Query("channelId") channelId: String
    ): StreamTokenResponse
    
    @GET("api/preferences/channels")
    suspend fun getChannelPreferences(): ChannelPreferences
}
```

---

### 3. DataStore Instead of SharedPreferences

**Decision**: Migrate Phase 1's SharedPreferences to Jetpack DataStore

**Rationale**:
- SharedPreferences is synchronous (blocks UI thread)
- DataStore is asynchronous (Kotlin Flow), safer
- Type-safe (Proto DataStore) or key-value (Preferences DataStore)
- Better encryption support
- Modern Android standard

**Alternatives Rejected**:
- ❌ **Keep SharedPreferences**: Phase 1 pain points with JSON serialization
- ❌ **Room database**: Overkill for simple key-value storage

**Implementation** (Preferences DataStore):
```kotlin
class TokenDataStore @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val dataStore = context.dataStore
    
    suspend fun saveToken(token: String) {
        dataStore.edit { prefs ->
            prefs[JWT_TOKEN_KEY] = token
        }
    }
    
    fun getToken(): Flow<String?> = dataStore.data
        .map { prefs -> prefs[JWT_TOKEN_KEY] }
}
```

---

### 4. AndroidX Media3 for Video Playback

**Decision**: Use AndroidX Media3 (formerly ExoPlayer) for HLS streaming

**Rationale**:
- Industry-standard Android video player
- Native HLS support with adaptive bitrate streaming
- Customizable UI controls
- Handles buffering, seek, playback errors
- Active development by Google (part of AndroidX/Jetpack)

**Alternatives Rejected**:
- ❌ **Native MediaPlayer**: Limited codec support, less customization
- ❌ **VideoView**: Wrapper around MediaPlayer, same limitations
- ❌ **WebView HTML5 video**: Phase 1 spec rejected this (poor performance)

**Implementation**:
```kotlin
class PlayerActivity : AppCompatActivity() {
    private lateinit var player: ExoPlayer
    
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        player = ExoPlayer.Builder(this)
            .build()
            .also { exoPlayer ->
                binding.playerView.player = exoPlayer
                val mediaItem = MediaItem.fromUri(streamUrl)
                exoPlayer.setMediaItem(mediaItem)
                exoPlayer.prepare()
                exoPlayer.play()
            }
    }
}
```

---

### 5. Hilt for Dependency Injection

**Decision**: Introduce Hilt (Dagger wrapper) for dependency injection

**Rationale**:
- Phase 2 has complex dependencies (Retrofit, DataStore, Media3, Repositories)
- Hilt provides compile-time DI (type-safe)
- Better testability (inject mocks in tests)
- Standard Android DI solution

**Alternatives Rejected**:
- ❌ **Manual DI**: Phase 1 pattern doesn't scale to ViewModels + Use Cases
- ❌ **Koin**: Runtime DI (slower), less type-safe

**Implementation**:
```kotlin
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit = Retrofit.Builder()
        .baseUrl("https://hd-homey.local:3000/")
        .client(okHttpClient)
        .addConverterFactory(Json.asConverterFactory("application/json".toMediaType()))
        .build()
    
    @Provides
    fun provideHdHomeyApi(retrofit: Retrofit): HdHomeyApi = 
        retrofit.create(HdHomeyApi::class.java)
}
```

---

### 6. Coil for Image Loading

**Decision**: Use Coil library for channel logo images

**Rationale**:
- Kotlin-first image loading library
- Efficient memory management (cache, downsampling)
- Coroutines support
- Placeholder and error handling built-in
- Lightweight (compared to Glide/Picasso)

**Alternatives Rejected**:
- ❌ **Manual Bitmap loading**: Memory leaks, no caching
- ❌ **Glide**: Java-based, larger library
- ❌ **Picasso**: Less modern, no coroutines

**Implementation**:
```kotlin
binding.channelLogo.load(channel.logoUrl) {
    crossfade(true)
    placeholder(R.drawable.ic_channel_placeholder)
    error(R.drawable.ic_channel_error)
    transformations(CircleCropTransformation())
}
```

---

### 7. Separate PlayerActivity (Not Fragment)

**Decision**: Use separate Activity for full-screen video player

**Rationale**:
- TV best practice: Immersive full-screen video
- Easier lifecycle management (play/pause on Activity lifecycle)
- Independent navigation (back button exits player)
- Can force landscape orientation
- Better focus handling for player controls

**Alternatives Rejected**:
- ❌ **PlayerFragment**: Would need full-screen fragment, more complex navigation
- ❌ **Dialog**: Not immersive enough for TV

---

### 8. HLS-Only (No MPEG-2 TS)

**Decision**: Phase 2 supports HLS only, defer MPEG-2 to Phase 3

**Rationale**:
- Simplifies Phase 2 scope (HLS fallback always works)
- Backend HLS transcoding already implemented and tested
- MPEG-2 TS requires codec detection and fallback logic
- Most Android devices support HLS natively

**Alternatives Rejected**:
- ❌ **MPEG-2 TS primary + HLS fallback**: Phase 1 spec, but adds complexity to Phase 2

**Future** (Phase 3):
- Detect MPEG-2 support via Media3 codec detection
- Try raw `/stream` endpoint first, fallback to `/transcode` on error

---

## Data Flow

### Channel Loading Flow

```
User opens app (authenticated)
       ↓
MainActivity → ChannelListFragment
       ↓
ChannelListViewModel.loadChannels()
       ↓
GetChannelsUseCase
       ↓
    ┌─────────────────────┐
    │ Parallel API calls  │
    ├─────────────────────┤
    │ 1. GET /api/tuners/{id}/channels  → ChannelRepository
    │ 2. GET /api/preferences/channels  → PreferencesRepository
    └─────────────────────┘
       ↓
Combine channels + preferences (mark favorites)
       ↓
Emit UiState.Success(channels)
       ↓
ChannelListFragment observes StateFlow
       ↓
Update RecyclerView with ChannelAdapter
       ↓
Display channels (favorites first, D-pad navigable)
```

---

### Video Playback Flow

```
User selects channel → ChannelAdapter.onChannelClick()
       ↓
ChannelListViewModel.onChannelSelected(channel)
       ↓
GenerateStreamUrlUseCase
       ↓
    1. GET /api/stream-token?tunerId=X&channelId=Y
       → TokenRepository
       → Returns: { token: "hmac-signature", expiresAt: "..." }
    
    2. Generate HLS URL:
       /api/transcode/{tunerId}/{channelId}/playlist.m3u8?token={hmac-signature}
       ↓
PlayerViewModel.prepareStream(streamUrl, channel)
       ↓
Launch PlayerActivity
       ↓
    Intent(context, PlayerActivity::class.java).apply {
        putExtra("STREAM_URL", streamUrl)
        putExtra("CHANNEL_NAME", channel.name)
        putExtra("CHANNEL_NUMBER", channel.number)
    }
       ↓
PlayerActivity.onCreate()
       ↓
ExoPlayer.Builder(context).build()
       ↓
MediaItem.fromUri(streamUrl)
       ↓
player.setMediaItem(mediaItem)
player.prepare()
player.play()
       ↓
Video playback starts
       ↓
User presses BACK → PlayerActivity.finish() → Return to ChannelListFragment
```

---

## API Integration

### Backend APIs (Already Implemented)

Phase 2 uses these existing HD Homey backend endpoints:

1. **GET /api/tuners/{tunerId}/channels**
   - Returns: Array of channels with metadata
   - Example: `[{ "GuideNumber": "2.1", "GuideName": "CBS", "URL": "..." }]`
   - Note: HDHomeRun native format, map to Android models

2. **GET /api/transcode/{tunerId}/{channelId}/playlist.m3u8?token={hmac}**
   - HLS transcoding endpoint (already implemented in Phase 1 backend)
   - Returns: HLS playlist (m3u8 file)
   - Authentication: HMAC token in query string

3. **GET /api/preferences/channels** (NEW - requires backend implementation)
   - Returns: `{ "favorites": ["2.1", "4.1"], "hidden": ["99.1"] }`
   - Note: This endpoint needs to be added in Phase 2 backend work

### Authentication

All API calls must include JWT token in Authorization header:

```kotlin
class AuthInterceptor @Inject constructor(
    private val tokenDataStore: TokenDataStore
) : Interceptor {
    override fun intercept(chain: Interceptor.Chain): Response {
        val token = runBlocking { tokenDataStore.getToken().first() }
        val request = chain.request().newBuilder()
            .addHeader("Authorization", "Bearer $token")
            .build()
        return chain.proceed(request)
    }
}
```

---

## Testing Strategy

### Unit Tests (Target: 80%+ coverage)

**ViewModels** (fast, pure Kotlin):
```kotlin
class ChannelListViewModelTest {
    @Test
    fun `loadChannels emits Loading then Success`() = runTest {
        // Given
        val channels = listOf(Channel("2.1", "CBS"))
        val useCase = mockk<GetChannelsUseCase> {
            coEvery { invoke(any()) } returns Result.success(channels)
        }
        val viewModel = ChannelListViewModel(useCase, ...)
        
        // When
        val states = viewModel.uiState.take(2).toList()
        viewModel.loadChannels("tuner-1")
        
        // Then
        assertThat(states[0]).isInstanceOf(UiState.Loading::class.java)
        assertThat(states[1]).isInstanceOf(UiState.Success::class.java)
    }
}
```

**Use Cases**:
```kotlin
class GenerateStreamUrlUseCaseTest {
    @Test
    fun `generates valid HLS URL with HMAC token`() = runTest {
        // Given
        val tokenRepo = mockk<TokenRepository> {
            coEvery { getStreamToken(any(), any()) } returns StreamTokenResponse("hmac-abc")
        }
        val useCase = GenerateStreamUrlUseCase(tokenRepo)
        
        // When
        val result = useCase("tuner-1", "2.1")
        
        // Then
        assertThat(result).isEqualTo(
            "https://server.local/api/transcode/tuner-1/2.1/playlist.m3u8?token=hmac-abc"
        )
    }
}
```

**Repositories** (Robolectric):
```kotlin
@RunWith(RobolectricTestRunner::class)
class ChannelRepositoryTest {
    @Test
    fun `getChannels returns cached data`() = runTest {
        // Test DataStore + API interaction
    }
}
```

### Integration Tests (Robolectric + Emulator)

- Fragment navigation (ServerList → ChannelList → Player)
- API error handling (401, 403, network timeout)
- Token refresh flow
- Video player lifecycle (pause on background)

### Manual Testing (Phase 2 Quickstart)

- See `specs/013-android-app-phase2/quickstart.md` (to be created)
- Key scenarios: Load channels, play video, handle errors, test favorites

---

## Migration from Phase 1

### Code to Migrate

1. **ServerRepository** → Keep, add JWT token injection via Hilt
2. **AppPreferences** → Migrate to DataStore (TokenDataStore + PreferencesDataStore)
3. **DeviceCodeService** → Keep, wrap in Retrofit interface (optional)
4. **AuthenticationFragment** → Keep, minor updates for token storage

### Code to Add

- 5 new screens (ChannelList, ChannelDetail, Player, plus ViewModels)
- 3 Use Cases (GetChannels, GenerateStreamUrl, GetPreferences)
- 2 Repositories (Channel, Token)
- Hilt modules (Network, Data, Media)
- Media3 player integration

### Breaking Changes

- **DataStore migration**: First launch after Phase 2 upgrade will lose Phase 1 saved servers (document in release notes, low impact since Phase 1 is alpha)
- **API interface change**: Retrofit replaces raw OkHttp (internal change, no user impact)

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| **Media3 learning curve** | Delayed video playback feature | Medium | Study official samples, use PlayerView (simplifies UI) |
| **HMAC token expiry during playback** | Video stops after 15 minutes | High | Implement token refresh in PlayerViewModel |
| **DataStore migration complexity** | Lost Phase 1 data | Low | Accept data loss (Phase 1 is alpha), document in release notes |
| **D-pad focus on player controls** | Poor TV UX | Medium | Test extensively on Android TV emulator, follow Leanback guidelines |
| **HLS buffering on slow networks** | Stuttering playback | Medium | Use Media3 adaptive bitrate, show buffering indicator |
| **JWT token expiry (7 days)** | App logged out unexpectedly | High | Implement RefreshTokenUseCase, prompt re-auth on 401 |

---

## Phase 2 Sub-Phases

### Phase 2.1: Architecture Setup (2-3 days)
- Set up Hilt DI
- Migrate SharedPreferences → DataStore
- Add Retrofit + OkHttp interceptors
- Update Phase 1 code to use Hilt injection

### Phase 2.2: Channel List Screen (3-4 days)
- ChannelListFragment + ViewModel
- GetChannelsUseCase + ChannelRepository
- RecyclerView adapter with Coil image loading
- D-pad navigation and focus handling
- Empty state, loading state, error state

### Phase 2.3: Video Player (4-5 days)
- PlayerActivity + ViewModel
- GenerateStreamUrlUseCase + TokenRepository
- Media3 ExoPlayer integration
- Player controls (play/pause, seek)
- Error handling (stream fails, token expires)

### Phase 2.4: Channel Favorites (2-3 days)
- Backend: Implement GET /api/preferences/channels
- GetPreferencesUseCase + PreferencesRepository
- Mark favorites in channel list (star icon)
- Sort favorites first

### Phase 2.5: Testing & Polish (3-4 days)
- Unit tests (ViewModels, Use Cases, Repositories)
- Integration tests (navigation, API errors)
- Manual testing on Android TV emulator
- Performance profiling (memory, CPU)
- UI polish (animations, loading feedback)

### Phase 2.6: Documentation (1-2 days)
- Update README, DEVELOPMENT, MANUAL-TEST-GUIDE
- Create Phase 2 SUMMARY.md
- Update feature spec to Phase 2 Complete

**Total Estimate**: 15-21 days (3-4 weeks)

---

## Success Criteria

- [ ] Channel list loads from server and displays with metadata
- [ ] D-pad navigation works smoothly on channel list
- [ ] Video playback starts within 2 seconds
- [ ] HLS streaming works reliably (adaptive bitrate)
- [ ] Favorites are marked in channel list
- [ ] JWT token refresh handled gracefully
- [ ] Stream token expiry handled (regenerate on 15-min timeout)
- [ ] All Phase 1 functionality still works (server management, device pairing)
- [ ] 80%+ test coverage on ViewModels and Use Cases
- [ ] Lint clean (0 errors)
- [ ] Manual testing scenarios pass on Android TV emulator
- [ ] Documentation updated

---

## Dependencies

### New Dependencies (Phase 2)

Add to `apps/android/gradle/libs.versions.toml`:

```toml
[versions]
retrofit = "2.11.0"
media3 = "1.9.0"
coil = "2.7.0"
datastore = "1.1.1"
hilt = "2.52"

[libraries]
retrofit = { group = "com.squareup.retrofit2", name = "retrofit", version.ref = "retrofit" }
retrofit-kotlinx-serialization = { group = "com.squareup.retrofit2", name = "converter-kotlinx-serialization", version.ref = "retrofit" }

media3-exoplayer = { group = "androidx.media3", name = "media3-exoplayer", version.ref = "media3" }
media3-ui = { group = "androidx.media3", name = "media3-ui", version.ref = "media3" }
media3-exoplayer-hls = { group = "androidx.media3", name = "media3-exoplayer-hls", version.ref = "media3" }

coil = { group = "io.coil-kt", name = "coil", version.ref = "coil" }

datastore-preferences = { group = "androidx.datastore", name = "datastore-preferences", version.ref = "datastore" }

hilt-android = { group = "com.google.dagger", name = "hilt-android", version.ref = "hilt" }
hilt-compiler = { group = "com.google.dagger", name = "hilt-compiler", version.ref = "hilt" }
```

### Backend Dependencies

- ✅ Channel lineup API (already exists)
- ✅ HLS transcoding API (already exists)
- ❌ Channel preferences API (needs implementation)

**Backend Task**: Add `GET /api/preferences/channels` endpoint to return user's channel favorites and hidden channels.

---

## Open Questions

- [ ] **Q1**: Should we support offline mode (cache channels for 24 hours)?
  - **Answer**: Not in Phase 2. Phase 3 feature if users request it.

- [ ] **Q2**: Should we support multiple tuners in single channel list?
  - **Answer**: Yes - display channels grouped by tuner (collapsible sections like Phase 1 web UI).

- [ ] **Q3**: Should we support channel logos from multiple sources (Gracenote, TVGuide)?
  - **Answer**: Phase 2 uses HDHomeRun logo URLs only. Phase 3+ can add fallbacks.

- [ ] **Q4**: Should we implement PiP (Picture-in-Picture) mode?
  - **Answer**: Not in Phase 2. Phase 3 feature.

- [ ] **Q5**: Should we pre-buffer next channel for instant switching?
  - **Answer**: Not in Phase 2. Advanced optimization for Phase 4+.

---

## Next Steps

1. **Create research.md** - Document Retrofit, Media3, Coil, Hilt research
2. **Create data-model.md** - Define Channel, Tuner, Preference entities
3. **Create contracts/** - API contracts for channel lineup, stream tokens, preferences
4. **Create quickstart.md** - Phase 2 manual testing scenarios
5. **Run `/speckit.tasks`** - Break down Phase 2 into 50+ specific tasks

---

**Phase 2 Planning Complete** ✅  
**Ready for Research Phase** 🔬  
**Branch**: `013-android-app-phase2`
