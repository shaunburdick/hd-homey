# Research: Android App Phase 2 Technology Choices

**Date**: 2025-12-14  
**Phase**: 2 - Channel Browsing & Streaming  
**Branch**: `013-android-app-phase2`

## Overview

This document captures research conducted for Phase 2 technology decisions. Each choice includes version selection rationale, alternatives considered, and integration strategy.

---

## 1. AndroidX Media3 (ExoPlayer)

### Version Selection

**Chosen**: `androidx.media3:media3-exoplayer:1.4.1`

**Latest Stable**: 1.4.1 (Released September 2024)

**Why 1.4.1**:
- Latest stable release with HLS improvements
- Critical bug fixes for adaptive bitrate streaming
- Better Android TV remote control support
- Improved buffering strategy
- Part of AndroidX/Jetpack (long-term support)

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| **Native MediaPlayer** | Built-in, no dependency | Limited codec support, poor HLS handling | ❌ Rejected |
| **VideoView** | Simple API | Wrapper around MediaPlayer, same limitations | ❌ Rejected |
| **libVLC (VLC SDK)** | Wide codec support | Large library (~30MB), GPL license concerns | ❌ Rejected |
| **ExoPlayer 2.x (deprecated)** | Mature, familiar | Deprecated, no updates | ❌ Rejected |
| **Media3 1.4.1** | Modern, actively maintained, excellent HLS | Moderate learning curve | ✅ **Selected** |

### Key Features

- **HLS Adaptive Bitrate**: Automatically adjusts quality based on network
- **Custom UI**: Full control over player controls
- **Event Listeners**: Track playback state, errors, buffering
- **Background Playback**: Supports MediaSession for audio-only
- **DRM Support**: Widevine (not needed for Phase 2, future-proof)

### Integration Strategy

```kotlin
// Basic setup
dependencies {
    implementation("androidx.media3:media3-exoplayer:1.4.1")
    implementation("androidx.media3:media3-ui:1.4.1")
    implementation("androidx.media3:media3-exoplayer-hls:1.4.1") // HLS support
}

// Usage pattern
val player = ExoPlayer.Builder(context)
    .setLoadControl(
        DefaultLoadControl.Builder()
            .setBufferDurationsMs(
                15000, // min buffer
                50000, // max buffer
                2500,  // playback buffer
                5000   // rebuffer
            )
            .build()
    )
    .build()

val mediaItem = MediaItem.fromUri(hlsUrl)
player.setMediaItem(mediaItem)
player.prepare()
player.play()
```

### Resources

- [Official Documentation](https://developer.android.com/media/media3/exoplayer)
- [Migration Guide (ExoPlayer 2.x → Media3)](https://developer.android.com/media/media3/exoplayer/migration-guide)
- [HLS Streaming Guide](https://developer.android.com/media/media3/exoplayer/hls)
- [Sample Code](https://github.com/androidx/media/tree/release/demos)

---

## 2. Retrofit

### Version Selection

**Chosen**: `com.squareup.retrofit2:retrofit:2.11.0`

**Latest Stable**: 2.11.0 (Released November 2024)

**Why 2.11.0**:
- Kotlin Coroutines first-class support
- Suspend functions for async calls
- Better error handling with Result<T>
- Compatible with Kotlinx Serialization 1.7.3
- OkHttp 4.12.0 under the hood (security fixes)

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| **Raw OkHttp (Phase 1)** | No extra dependency | Manual JSON parsing, boilerplate | ❌ Migrate away |
| **Ktor Client** | Kotlin-native, coroutines-first | Less Android ecosystem, smaller community | ❌ Rejected |
| **Fuel** | Kotlin DSL, simple API | Less mature, fewer features | ❌ Rejected |
| **Retrofit 2.11.0** | Industry standard, mature, great tooling | Java-based (but Kotlin-friendly) | ✅ **Selected** |

### Key Features

- **Type-safe API**: Interface-based API definitions
- **Suspend functions**: Direct coroutine support (no callbacks)
- **Converters**: Kotlinx Serialization, Gson, Moshi
- **Interceptors**: OkHttp interceptors for auth, logging
- **Call adapters**: RxJava, Coroutines, custom adapters

### Integration Strategy

```kotlin
dependencies {
    implementation("com.squareup.retrofit2:retrofit:2.11.0")
    implementation("com.squareup.retrofit2:converter-kotlinx-serialization:2.11.0")
    implementation("com.jakewharton.retrofit:retrofit2-kotlinx-serialization-converter:1.0.0")
}

// API interface
interface HdHomeyApi {
    @GET("api/tuners/{tunerId}/channels")
    suspend fun getChannels(@Path("tunerId") tunerId: String): List<Channel>
    
    @GET("api/stream-token")
    suspend fun getStreamToken(
        @Query("tunerId") tunerId: String,
        @Query("channelId") channelId: String
    ): StreamTokenResponse
}

// Retrofit setup with Hilt
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit = Retrofit.Builder()
        .baseUrl("http://hd-homey.local:3000/")
        .client(okHttpClient)
        .addConverterFactory(Json.asConverterFactory("application/json".toMediaType()))
        .build()
}
```

### Resources

- [Official Documentation](https://square.github.io/retrofit/)
- [Kotlin Coroutines Guide](https://github.com/square/retrofit/blob/master/CHANGELOG.md)
- [Best Practices](https://proandroiddev.com/retrofit-2-6-0-with-kotlin-coroutines-suspend-6481d2c0eefa)

---

## 3. Coil (Image Loading)

### Version Selection

**Chosen**: `io.coil-kt:coil:2.7.0`

**Latest Stable**: 2.7.0 (Released November 2024)

**Why 2.7.0**:
- Kotlin-first (100% Kotlin)
- Coroutines-based (fits Phase 2 architecture)
- Lightweight (~2MB)
- Excellent caching (memory + disk)
- OkHttp 4.x integration (shares HTTP client with Retrofit)

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| **Manual BitmapFactory** | No dependency | Memory leaks, no caching, complex | ❌ Rejected |
| **Glide** | Mature, feature-rich | Java-based, larger library (~4MB) | ❌ Rejected |
| **Picasso** | Simple API, Square library | Older, less active development | ❌ Rejected |
| **Coil 2.7.0** | Kotlin-native, coroutines, lightweight | Newer (less battle-tested than Glide) | ✅ **Selected** |

### Key Features

- **Automatic caching**: Memory + disk LRU cache
- **Lifecycle-aware**: Respects Android lifecycle
- **Transformations**: Circle crop, rounded corners, blur
- **Placeholders**: Loading and error states
- **GIF/SVG support**: Animated images
- **OkHttp integration**: Shares connection pool with Retrofit

### Integration Strategy

```kotlin
dependencies {
    implementation("io.coil-kt:coil:2.7.0")
    implementation("io.coil-kt:coil-gif:2.7.0") // Optional: GIF support
}

// Basic usage
binding.channelLogo.load(channel.logoUrl) {
    crossfade(true)
    placeholder(R.drawable.ic_channel_placeholder)
    error(R.drawable.ic_channel_error)
    transformations(CircleCropTransformation())
    size(128, 128) // Resize for performance
}

// Configure global defaults with Hilt
@Module
@InstallIn(SingletonComponent::class)
object ImageLoadingModule {
    @Provides
    @Singleton
    fun provideImageLoader(
        @ApplicationContext context: Context,
        okHttpClient: OkHttpClient
    ): ImageLoader = ImageLoader.Builder(context)
        .okHttpClient(okHttpClient) // Share with Retrofit
        .memoryCache {
            MemoryCache.Builder(context)
                .maxSizePercent(0.25) // 25% of available memory
                .build()
        }
        .diskCache {
            DiskCache.Builder()
                .directory(context.cacheDir.resolve("image_cache"))
                .maxSizeBytes(50 * 1024 * 1024) // 50MB
                .build()
        }
        .build()
}
```

### Resources

- [Official Documentation](https://coil-kt.github.io/coil/)
- [Comparison with Glide/Picasso](https://coil-kt.github.io/coil/migrating/)
- [Transformations Guide](https://coil-kt.github.io/coil/transformations/)

---

## 4. DataStore (Preferences)

### Version Selection

**Chosen**: `androidx.datastore:datastore-preferences:1.1.1`

**Latest Stable**: 1.1.1 (Released November 2024)

**Why 1.1.1**:
- Async (Flow-based), doesn't block UI thread
- Type-safe (Preferences DataStore for simple key-value)
- Supports encryption (EncryptedFile wrapper)
- Migration from SharedPreferences built-in
- Modern Android standard (part of Jetpack)

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| **SharedPreferences (Phase 1)** | Simple API, familiar | Synchronous (blocks UI), no type safety | ❌ Migrate away |
| **Room Database** | Relational, complex queries | Overkill for key-value storage | ❌ Rejected |
| **Proto DataStore** | Strongly typed (Protocol Buffers) | More complex setup, requires .proto files | ❌ Defer to Phase 3 |
| **Preferences DataStore 1.1.1** | Async, simple, type-safe key-value | Less structured than Proto | ✅ **Selected** |

### Key Features

- **Flow-based**: Reactive updates (no polling)
- **Transactional**: Atomic updates (edit { } block)
- **Type-safe keys**: Compile-time type checking
- **Migration support**: Automatic migration from SharedPreferences
- **Coroutines-first**: Suspend functions

### Integration Strategy

```kotlin
dependencies {
    implementation("androidx.datastore:datastore-preferences:1.1.1")
}

// DataStore setup
val Context.dataStore by preferencesDataStore(name = "hd_homey_prefs")

// Usage with encryption (optional, recommended for JWT tokens)
class TokenDataStore @Inject constructor(
    @ApplicationContext private val context: Context
) {
    private val dataStore = context.dataStore
    
    companion object {
        val JWT_TOKEN_KEY = stringPreferencesKey("jwt_token")
        val ACTIVE_SERVER_ID_KEY = stringPreferencesKey("active_server_id")
    }
    
    suspend fun saveToken(token: String) {
        dataStore.edit { prefs ->
            prefs[JWT_TOKEN_KEY] = token
        }
    }
    
    fun getToken(): Flow<String?> = dataStore.data
        .catch { exception ->
            if (exception is IOException) {
                emit(emptyPreferences())
            } else {
                throw exception
            }
        }
        .map { prefs -> prefs[JWT_TOKEN_KEY] }
}

// Migration from SharedPreferences (Phase 1 → Phase 2)
val dataStore = PreferenceDataStoreFactory.create(
    migrations = listOf(
        SharedPreferencesMigration(
            context,
            "hd_homey_servers" // Old SharedPreferences name
        )
    ),
    produceFile = { context.dataStoreFile("hd_homey_prefs") }
)
```

### Resources

- [Official Documentation](https://developer.android.com/topic/libraries/architecture/datastore)
- [Migration Guide](https://developer.android.com/codelabs/android-preferences-datastore)
- [Best Practices](https://medium.com/androiddevelopers/datastore-and-data-migration-fdca806eb1aa)

---

## 5. Hilt (Dependency Injection)

### Version Selection

**Chosen**: `com.google.dagger:hilt-android:2.52`

**Latest Stable**: 2.52 (Released November 2024)

**Why 2.52**:
- Official Android DI solution (Google)
- Compile-time DI (type-safe, fast)
- Tight integration with Jetpack (ViewModels, WorkManager)
- Reduces boilerplate compared to Dagger
- Excellent documentation and samples

### Alternatives Considered

| Alternative | Pros | Cons | Decision |
|-------------|------|------|----------|
| **Manual DI (Phase 1)** | No dependency, simple | Doesn't scale, hard to test | ❌ Migrate away |
| **Koin** | Runtime DI, simpler DSL | Runtime errors, slower | ❌ Rejected |
| **Dagger 2** | Powerful, compile-time | Complex setup, steep learning curve | ❌ Too complex |
| **Hilt 2.52** | Simplified Dagger, Android-first | Still requires some boilerplate | ✅ **Selected** |

### Key Features

- **ViewModel injection**: Automatic ViewModel factory generation
- **Predefined components**: Application, Activity, Fragment scopes
- **Testing support**: Easy mock injection in tests
- **Kotlin-friendly**: Works well with coroutines, flows

### Integration Strategy

```kotlin
dependencies {
    implementation("com.google.dagger:hilt-android:2.52")
    kapt("com.google.dagger:hilt-compiler:2.52")
    
    // Testing
    androidTestImplementation("com.google.dagger:hilt-android-testing:2.52")
    kaptAndroidTest("com.google.dagger:hilt-compiler:2.52")
}

// Application setup
@HiltAndroidApp
class HdHomeyApplication : Application()

// Module example (Retrofit + OkHttp)
@Module
@InstallIn(SingletonComponent::class)
object NetworkModule {
    
    @Provides
    @Singleton
    fun provideOkHttpClient(
        authInterceptor: AuthInterceptor
    ): OkHttpClient = OkHttpClient.Builder()
        .addInterceptor(authInterceptor)
        .addInterceptor(HttpLoggingInterceptor().apply {
            level = if (BuildConfig.DEBUG) 
                HttpLoggingInterceptor.Level.BODY 
            else 
                HttpLoggingInterceptor.Level.NONE
        })
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .build()
    
    @Provides
    @Singleton
    fun provideRetrofit(okHttpClient: OkHttpClient): Retrofit = Retrofit.Builder()
        .baseUrl("http://hd-homey.local:3000/")
        .client(okHttpClient)
        .addConverterFactory(Json.asConverterFactory("application/json".toMediaType()))
        .build()
    
    @Provides
    fun provideHdHomeyApi(retrofit: Retrofit): HdHomeyApi = 
        retrofit.create(HdHomeyApi::class.java)
}

// ViewModel injection
@HiltViewModel
class ChannelListViewModel @Inject constructor(
    private val getChannelsUseCase: GetChannelsUseCase,
    private val getPreferencesUseCase: GetChannelPreferencesUseCase
) : ViewModel() {
    // Implementation
}

// Fragment injection
@AndroidEntryPoint
class ChannelListFragment : Fragment() {
    private val viewModel: ChannelListViewModel by viewModels()
    // Fragment code
}
```

### Resources

- [Official Documentation](https://dagger.dev/hilt/)
- [Android Developers Guide](https://developer.android.com/training/dependency-injection/hilt-android)
- [Best Practices](https://developer.android.com/training/dependency-injection/hilt-best-practices)
- [Testing with Hilt](https://developer.android.com/training/dependency-injection/hilt-testing)

---

## 6. Kotlin Coroutines & Flow

### Version Selection

**Chosen**: `org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.1`

**Latest Stable**: 1.10.1 (Released December 2024)

**Why 1.10.1**:
- Latest stable with performance improvements
- Better structured concurrency
- Improved error handling
- Android-specific optimizations (Dispatchers.Main)

### Key Patterns for Phase 2

#### Pattern 1: Repository with Flow

```kotlin
class ChannelRepository @Inject constructor(
    private val api: HdHomeyApi,
    private val prefsDataStore: TokenDataStore
) {
    fun getChannels(tunerId: String): Flow<Result<List<Channel>>> = flow {
        emit(Result.success(api.getChannels(tunerId)))
    }.catch { e ->
        emit(Result.failure(e))
    }.flowOn(Dispatchers.IO)
}
```

#### Pattern 2: UseCase with suspend

```kotlin
class GetChannelsUseCase @Inject constructor(
    private val repository: ChannelRepository
) {
    suspend operator fun invoke(tunerId: String): Result<List<Channel>> {
        return repository.getChannels(tunerId).first()
    }
}
```

#### Pattern 3: ViewModel with StateFlow

```kotlin
class ChannelListViewModel @Inject constructor(
    private val getChannelsUseCase: GetChannelsUseCase
) : ViewModel() {
    
    private val _uiState = MutableStateFlow<UiState>(UiState.Loading)
    val uiState: StateFlow<UiState> = _uiState.asStateFlow()
    
    fun loadChannels(tunerId: String) {
        viewModelScope.launch {
            _uiState.value = UiState.Loading
            getChannelsUseCase(tunerId)
                .onSuccess { channels ->
                    _uiState.value = UiState.Success(channels)
                }
                .onFailure { error ->
                    _uiState.value = UiState.Error(error.message ?: "Unknown error")
                }
        }
    }
}
```

#### Pattern 4: Fragment observing StateFlow

```kotlin
@AndroidEntryPoint
class ChannelListFragment : Fragment() {
    private val viewModel: ChannelListViewModel by viewModels()
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        viewLifecycleOwner.lifecycleScope.launch {
            viewLifecycleOwner.repeatOnLifecycle(Lifecycle.State.STARTED) {
                viewModel.uiState.collect { state ->
                    when (state) {
                        is UiState.Loading -> showLoading()
                        is UiState.Success -> showChannels(state.channels)
                        is UiState.Error -> showError(state.message)
                    }
                }
            }
        }
    }
}
```

### Resources

- [Kotlin Coroutines Guide](https://kotlinlang.org/docs/coroutines-guide.html)
- [Flow Documentation](https://kotlinlang.org/docs/flow.html)
- [Android Coroutines Best Practices](https://developer.android.com/kotlin/coroutines/coroutines-best-practices)

---

## 7. Testing Libraries

### Version Selections

**JUnit**: `4.13.2` (keep from Phase 1)  
**Truth**: `1.4.4` (keep from Phase 1)  
**Robolectric**: `4.14.1` (keep from Phase 1)  
**MockK**: `1.13.13` (keep from Phase 1)  
**Turbine**: `1.1.0` (NEW - for Flow testing)

### Why Turbine?

Turbine simplifies testing Kotlin Flows in unit tests:

```kotlin
dependencies {
    testImplementation("app.cash.turbine:turbine:1.1.0")
}

// Example: Testing ViewModel StateFlow
@Test
fun `loadChannels emits Loading then Success`() = runTest {
    // Given
    val channels = listOf(Channel("2.1", "CBS"))
    coEvery { getChannelsUseCase(any()) } returns Result.success(channels)
    
    val viewModel = ChannelListViewModel(getChannelsUseCase, ...)
    
    // When/Then
    viewModel.uiState.test {
        assertThat(awaitItem()).isEqualTo(UiState.Loading)
        
        viewModel.loadChannels("tuner-1")
        
        assertThat(awaitItem()).isEqualTo(UiState.Success(channels))
    }
}
```

### Resources

- [Turbine Documentation](https://github.com/cashapp/turbine)

---

## 8. Version Summary

### Phase 2 Dependency Versions

```toml
[versions]
kotlin = "2.1.0"
coroutines = "1.10.1"
retrofit = "2.11.0"
okhttp = "4.12.0"
kotlinx-serialization = "1.7.3"
media3 = "1.4.1"
coil = "2.7.0"
datastore = "1.1.1"
hilt = "2.52"

# Existing (Phase 1)
junit = "4.13.2"
truth = "1.4.4"
robolectric = "4.14.1"
mockk = "1.13.13"

# New (Phase 2)
turbine = "1.1.0"

[libraries]
# Kotlin
kotlin-stdlib = { group = "org.jetbrains.kotlin", name = "kotlin-stdlib", version.ref = "kotlin" }
kotlinx-coroutines-android = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-android", version.ref = "coroutines" }
kotlinx-serialization-json = { group = "org.jetbrains.kotlinx", name = "kotlinx-serialization-json", version.ref = "kotlinx-serialization" }

# Networking
retrofit = { group = "com.squareup.retrofit2", name = "retrofit", version.ref = "retrofit" }
retrofit-kotlinx-serialization = { group = "com.squareup.retrofit2", name = "converter-kotlinx-serialization", version.ref = "retrofit" }
okhttp = { group = "com.squareup.okhttp3", name = "okhttp", version.ref = "okhttp" }
okhttp-logging = { group = "com.squareup.okhttp3", name = "logging-interceptor", version.ref = "okhttp" }

# Media
media3-exoplayer = { group = "androidx.media3", name = "media3-exoplayer", version.ref = "media3" }
media3-ui = { group = "androidx.media3", name = "media3-ui", version.ref = "media3" }
media3-exoplayer-hls = { group = "androidx.media3", name = "media3-exoplayer-hls", version.ref = "media3" }

# Image loading
coil = { group = "io.coil-kt", name = "coil", version.ref = "coil" }

# Storage
datastore-preferences = { group = "androidx.datastore", name = "datastore-preferences", version.ref = "datastore" }

# Dependency injection
hilt-android = { group = "com.google.dagger", name = "hilt-android", version.ref = "hilt" }
hilt-compiler = { group = "com.google.dagger", name = "hilt-compiler", version.ref = "hilt" }

# Testing
junit = { group = "junit", name = "junit", version.ref = "junit" }
truth = { group = "com.google.truth", name = "truth", version.ref = "truth" }
robolectric = { group = "org.robolectric", name = "robolectric", version.ref = "robolectric" }
mockk = { group = "io.mockk", name = "mockk", version.ref = "mockk" }
turbine = { group = "app.cash.turbine", name = "turbine", version.ref = "turbine" }
kotlinx-coroutines-test = { group = "org.jetbrains.kotlinx", name = "kotlinx-coroutines-test", version.ref = "coroutines" }
```

---

## 9. Backend API Requirements

### Existing APIs (Phase 1)

✅ **Device Pairing**: 
- `POST /api/auth/device/code`
- `GET /api/auth/device/poll`

✅ **Health Check**:
- `GET /api/health`

### Existing APIs (Will Use in Phase 2)

✅ **Channel Lineup**:
- `GET /api/tuners/{tunerId}/channels`
- Returns HDHomeRun native format

✅ **HLS Streaming**:
- `GET /api/transcode/{tunerId}/{channelId}/playlist.m3u8?token={hmac}`
- Already implemented with HMAC authentication

### New API Required (Phase 2 Backend Work)

❌ **Channel Preferences** (NEEDS IMPLEMENTATION):
- `GET /api/preferences/channels`
- Response: `{ "favorites": ["2.1", "4.1"], "hidden": ["99.1"] }`
- `POST /api/preferences/channels` (future - Phase 3)

**Backend Task**: Implement channel preferences endpoint that reads from existing Better-Auth user preferences.

---

## 10. Learning Resources

### Official Documentation
- [Android Developers Guide](https://developer.android.com/)
- [Kotlin Documentation](https://kotlinlang.org/docs/)
- [Media3 Documentation](https://developer.android.com/media/media3)
- [Retrofit Documentation](https://square.github.io/retrofit/)
- [Hilt Documentation](https://dagger.dev/hilt/)

### Video Courses
- [Android TV Development](https://www.youtube.com/playlist?list=PLWz5rJ2EKKc_HyE1QX9jIMv2K9lIkS0mG) - Google I/O talks
- [ExoPlayer Tutorial](https://www.youtube.com/watch?v=svdq1BWl4r8) - Coding in Flow
- [Retrofit + MVVM](https://www.youtube.com/watch?v=t6Sql3WMAnk) - Philipp Lackner

### Sample Projects
- [Android TV Samples](https://github.com/android/tv-samples)
- [Media3 Demo](https://github.com/androidx/media/tree/release/demos)
- [Retrofit + Hilt + MVVM Example](https://github.com/android/architecture-samples)

---

## Decisions Summary

| Technology | Version | Rationale | Phase 1 Change |
|------------|---------|-----------|----------------|
| **Media3** | 1.4.1 | Modern ExoPlayer, HLS support | NEW |
| **Retrofit** | 2.11.0 | Type-safe API, coroutines support | Replaces raw OkHttp |
| **Coil** | 2.7.0 | Kotlin-first image loading | NEW |
| **DataStore** | 1.1.1 | Async preferences storage | Replaces SharedPreferences |
| **Hilt** | 2.52 | Android DI, ViewModel injection | Replaces manual DI |
| **Coroutines** | 1.10.1 | Async operations, Flow | Keep (already using) |
| **Turbine** | 1.1.0 | Flow testing | NEW |

---

**Research Complete** ✅  
**Next**: Create data-model.md
