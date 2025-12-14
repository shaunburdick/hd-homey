# Android Development Guide

Development guidelines, architecture patterns, and implementation details for the HD Homey Android TV app.

> **Note**: This document describes the overall architecture vision. Phase 1 (Foundation & Authentication) is complete with a simplified architecture. See `apps/android/app/src/main/java/com/hdhomey/app/` for actual implementation. Phase 2 will expand with additional layers (ViewModels, Use Cases) as complexity increases.

## Current Implementation (Phase 1)

### Actual Project Structure

```
com.hdhomey.app/
├── MainActivity.kt              # Single activity with Navigation Component
├── ui/                          # UI layer (Fragments)
│   ├── servers/                # Server management
│   │   ├── ServerListFragment.kt
│   │   ├── ServerListAdapter.kt
│   │   └── AddServerFragment.kt
│   ├── auth/                   # Device pairing
│   │   └── AuthenticationFragment.kt
│   └── success/                # Success confirmation
│       └── SuccessFragment.kt
├── api/                        # API services
│   ├── HdHomeyApi.kt          # OkHttp client factory
│   └── DeviceCodeService.kt   # Device code endpoints
├── data/                       # Data models
│   ├── Server.kt
│   ├── DeviceCodeRequest.kt
│   ├── DeviceCodeResponse.kt
│   └── PollResponse.kt
├── repository/                 # Data repositories
│   └── ServerRepository.kt    # Server CRUD operations
├── storage/                    # Local storage
│   └── AppPreferences.kt      # SharedPreferences wrapper
└── util/                       # Utilities
    ├── Constants.kt
    └── UrlValidator.kt
```

### Architecture Pattern

Phase 1 uses a simplified **Repository Pattern**:
- **Fragments**: UI and user interaction
- **Repositories**: Data access and business logic
- **API Services**: HTTP communication
- **Storage**: Local persistence

Phase 2 will introduce:
- **ViewModels**: UI state management
- **Use Cases**: Business logic layer
- **DataStore**: Secure token storage

## Architecture Overview (Target for Phase 2+)

The app follows **Clean Architecture** principles with MVVM pattern:

```
┌─────────────────────────────────────────────────────────┐
│                    Presentation Layer                    │
│  ┌────────────┐  ┌──────────┐  ┌─────────────────────┐ │
│  │ Activities │  │Fragments │  │ Compose Screens     │ │
│  │            │←→│          │←→│ (Jetpack Compose)   │ │
│  └────────────┘  └──────────┘  └─────────────────────┘ │
│         ↕                ↕                 ↕              │
│  ┌───────────────────────────────────────────────────┐  │
│  │             ViewModels (UI State)                 │  │
│  └───────────────────────────────────────────────────┘  │
└──────────────────────────┬──────────────────────────────┘
                           ↕
┌──────────────────────────┴──────────────────────────────┐
│                    Domain Layer                          │
│  ┌────────────┐  ┌──────────┐  ┌──────────────────────┐│
│  │ Use Cases  │  │  Models  │  │   Repositories       ││
│  │            │←→│          │←→│   (Interfaces)       ││
│  └────────────┘  └──────────┘  └──────────────────────┘│
└──────────────────────────┬──────────────────────────────┘
                           ↕
┌──────────────────────────┴──────────────────────────────┐
│                     Data Layer                           │
│  ┌────────────┐  ┌──────────┐  ┌──────────────────────┐│
│  │ API Client │  │  Local   │  │  Token Manager       ││
│  │ (Retrofit) │  │  Storage │  │  (DataStore)         ││
│  └────────────┘  └──────────┘  └──────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

## Project Structure Details

### `/app/src/main/java/com/hdhomey/tv/`

#### `ui/` - Presentation Layer

**`ui/auth/`** - Authentication & Pairing
- `PairingFragment.kt` - Main pairing screen showing device code
- `CodeDisplayFragment.kt` - Large code display for 10-foot UI
- `PairingViewModel.kt` - Manages pairing state and polling

**`ui/browse/`** - Channel Browsing
- `BrowseFragment.kt` - Main browsing screen using Leanback
- `ChannelCardPresenter.kt` - Channel grid card rendering
- `ChannelDetailsFragment.kt` - Channel details overlay
- `BrowseViewModel.kt` - Channel list state management

**`ui/player/`** - Video Playback
- `PlayerActivity.kt` - Fullscreen player
- `PlaybackTransportControlGlue.kt` - Transport controls
- `PlayerViewModel.kt` - Playback state

**`ui/settings/`** - App Settings
- `SettingsFragment.kt` - Settings screen
- `SettingsViewModel.kt` - Settings state

#### `data/` - Data Layer

**`data/api/`** - Backend API
```kotlin
// HdHomeyApi.kt - Main API service
interface HdHomeyApi {
    @POST("api/auth/device/code")
    suspend fun generateDeviceCode(
        @Body request: DeviceCodeRequest
    ): DeviceCodeResponse
    
    @GET("api/auth/device/poll")
    suspend fun pollDeviceAuthorization(
        @Query("code") code: String
    ): PollResponse
    
    @GET("api/lineup.json")
    suspend fun getChannels(): List<Channel>
    
    @GET("api/health")
    suspend fun healthCheck(): HealthResponse
}
```

**`data/model/`** - Data Models
```kotlin
// DeviceCode.kt
data class DeviceCodeResponse(
    val code: String,
    val deviceName: String,
    val deviceType: String,
    val pairingUrl: String,
    val expiresAt: String
)

data class PollResponse(
    val status: String, // "pending", "authorized", "denied", "expired"
    val token: String? = null,
    val user: User? = null,
    val authorizedAt: String? = null
)

// Channel.kt
data class Channel(
    val id: Int,
    val tunerId: Int,
    val guideNumber: String,
    val guideName: String,
    val hd: Boolean,
    val favorite: Boolean = false,
    val hidden: Boolean = false,
    val streamUrl: String
)

// User.kt
data class User(
    val id: String,
    val username: String,
    val role: String // "admin" or "viewer"
)
```

**`data/repository/`** - Repository Implementations
```kotlin
// AuthRepository.kt
class AuthRepository(
    private val api: HdHomeyApi,
    private val tokenManager: TokenManager
) {
    suspend fun generateDeviceCode(): Result<DeviceCodeResponse> {
        return try {
            val response = api.generateDeviceCode(
                DeviceCodeRequest(
                    deviceName = getDeviceName(),
                    deviceType = "tv"
                )
            )
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun pollAuthorization(code: String): Result<PollResponse> {
        return try {
            val response = api.pollDeviceAuthorization(code)
            if (response.status == "authorized" && response.token != null) {
                tokenManager.saveToken(response.token)
            }
            Result.success(response)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
    
    suspend fun isAuthenticated(): Boolean {
        return tokenManager.getToken() != null
    }
    
    suspend fun logout() {
        tokenManager.clearToken()
    }
}

// ChannelRepository.kt
class ChannelRepository(
    private val api: HdHomeyApi
) {
    suspend fun getChannels(): Result<List<Channel>> {
        return try {
            val channels = api.getChannels()
            Result.success(channels)
        } catch (e: Exception) {
            Result.failure(e)
        }
    }
}
```

#### `util/` - Utilities

**`TokenManager.kt`** - Secure Token Storage
```kotlin
class TokenManager(context: Context) {
    private val dataStore = context.createDataStore("auth_prefs")
    
    private val tokenKey = stringPreferencesKey("jwt_token")
    
    suspend fun saveToken(token: String) {
        dataStore.edit { preferences ->
            preferences[tokenKey] = token
        }
    }
    
    suspend fun getToken(): String? {
        val preferences = dataStore.data.first()
        return preferences[tokenKey]
    }
    
    suspend fun clearToken() {
        dataStore.edit { preferences ->
            preferences.remove(tokenKey)
        }
    }
}
```

**`RetrofitFactory.kt`** - HTTP Client Configuration
```kotlin
object RetrofitFactory {
    fun create(baseUrl: String, tokenManager: TokenManager): HdHomeyApi {
        val okHttpClient = OkHttpClient.Builder()
            .addInterceptor { chain ->
                val request = chain.request()
                val token = runBlocking { tokenManager.getToken() }
                
                val newRequest = if (token != null) {
                    request.newBuilder()
                        .header("Authorization", "Bearer $token")
                        .build()
                } else {
                    request
                }
                
                chain.proceed(newRequest)
            }
            .addInterceptor(HttpLoggingInterceptor().apply {
                level = if (BuildConfig.DEBUG) {
                    HttpLoggingInterceptor.Level.BODY
                } else {
                    HttpLoggingInterceptor.Level.NONE
                }
            })
            .connectTimeout(30, TimeUnit.SECONDS)
            .readTimeout(30, TimeUnit.SECONDS)
            .build()
        
        val retrofit = Retrofit.Builder()
            .baseUrl(baseUrl)
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create())
            .build()
        
        return retrofit.create(HdHomeyApi::class.java)
    }
}
```

## Key Implementation: Device Pairing Flow

### Step 1: Generate Device Code

```kotlin
// PairingViewModel.kt
class PairingViewModel(
    private val authRepository: AuthRepository
) : ViewModel() {
    
    private val _uiState = MutableStateFlow<PairingUiState>(PairingUiState.Initial)
    val uiState: StateFlow<PairingUiState> = _uiState.asStateFlow()
    
    fun startPairing() {
        viewModelScope.launch {
            _uiState.value = PairingUiState.Loading
            
            authRepository.generateDeviceCode()
                .onSuccess { response ->
                    _uiState.value = PairingUiState.ShowCode(
                        code = response.code,
                        pairingUrl = response.pairingUrl,
                        expiresAt = response.expiresAt
                    )
                    startPolling(response.code)
                }
                .onFailure { error ->
                    _uiState.value = PairingUiState.Error(error.message ?: "Failed to generate code")
                }
        }
    }
    
    private fun startPolling(code: String) {
        viewModelScope.launch {
            while (_uiState.value is PairingUiState.ShowCode) {
                delay(3000) // Poll every 3 seconds
                
                authRepository.pollAuthorization(code)
                    .onSuccess { response ->
                        when (response.status) {
                            "authorized" -> {
                                _uiState.value = PairingUiState.Success(response.user!!)
                            }
                            "denied" -> {
                                _uiState.value = PairingUiState.Error("Authorization denied")
                            }
                            "expired" -> {
                                _uiState.value = PairingUiState.Error("Code expired")
                            }
                            // "pending" - continue polling
                        }
                    }
                    .onFailure { error ->
                        // Log error but continue polling
                        Log.w("PairingViewModel", "Poll error: ${error.message}")
                    }
            }
        }
    }
}

sealed class PairingUiState {
    object Initial : PairingUiState()
    object Loading : PairingUiState()
    data class ShowCode(
        val code: String,
        val pairingUrl: String,
        val expiresAt: String
    ) : PairingUiState()
    data class Success(val user: User) : PairingUiState()
    data class Error(val message: String) : PairingUiState()
}
```

### Step 2: Display Code on TV

```kotlin
// PairingFragment.kt
@Composable
fun PairingScreen(viewModel: PairingViewModel) {
    val uiState by viewModel.uiState.collectAsState()
    
    when (val state = uiState) {
        is PairingUiState.Initial -> {
            LaunchedEffect(Unit) {
                viewModel.startPairing()
            }
        }
        
        is PairingUiState.Loading -> {
            Box(modifier = Modifier.fillMaxSize(), contentAlignment = Alignment.Center) {
                CircularProgressIndicator()
            }
        }
        
        is PairingUiState.ShowCode -> {
            Column(
                modifier = Modifier
                    .fillMaxSize()
                    .padding(48.dp),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "Pair Your Device",
                    style = MaterialTheme.typography.h2,
                    color = Color.White
                )
                
                Spacer(modifier = Modifier.height(32.dp))
                
                Text(
                    text = "Go to:",
                    style = MaterialTheme.typography.h4,
                    color = Color.White.copy(alpha = 0.7f)
                )
                
                Text(
                    text = state.pairingUrl,
                    style = MaterialTheme.typography.h3,
                    color = Color(0xFF00BCD4),
                    modifier = Modifier.padding(vertical = 16.dp)
                )
                
                Spacer(modifier = Modifier.height(32.dp))
                
                Text(
                    text = "Enter code:",
                    style = MaterialTheme.typography.h4,
                    color = Color.White.copy(alpha = 0.7f)
                )
                
                // Large, easy-to-read code
                Text(
                    text = state.code,
                    style = MaterialTheme.typography.h1.copy(
                        fontSize = 96.sp,
                        fontWeight = FontWeight.Bold,
                        letterSpacing = 16.sp
                    ),
                    color = Color.White,
                    modifier = Modifier.padding(vertical = 32.dp)
                )
                
                Spacer(modifier = Modifier.height(32.dp))
                
                // Countdown timer
                val expiresAt = remember { Instant.parse(state.expiresAt) }
                val timeLeft = remember {
                    derivedStateOf {
                        val now = Clock.System.now()
                        val duration = expiresAt - now
                        duration.inWholeSeconds
                    }
                }
                
                Text(
                    text = "Code expires in ${timeLeft.value}s",
                    style = MaterialTheme.typography.body1,
                    color = Color.White.copy(alpha = 0.5f)
                )
            }
        }
        
        is PairingUiState.Success -> {
            // Navigate to main app
            LaunchedEffect(Unit) {
                // Navigation handled by MainActivity
            }
        }
        
        is PairingUiState.Error -> {
            Column(
                modifier = Modifier.fillMaxSize(),
                horizontalAlignment = Alignment.CenterHorizontally,
                verticalArrangement = Arrangement.Center
            ) {
                Text(
                    text = "Pairing Failed",
                    style = MaterialTheme.typography.h3,
                    color = Color.Red
                )
                Text(
                    text = state.message,
                    style = MaterialTheme.typography.body1,
                    color = Color.White
                )
                Button(onClick = { viewModel.startPairing() }) {
                    Text("Try Again")
                }
            }
        }
    }
}
```

## Dependency Injection with Hilt

### Setup Hilt

```kotlin
// build.gradle.kts
plugins {
    id("com.google.dagger.hilt.android")
    id("kotlin-kapt")
}

dependencies {
    implementation("com.google.dagger:hilt-android:2.48")
    kapt("com.google.dagger:hilt-compiler:2.48")
}
```

### Application Class

```kotlin
// HdHomeyApplication.kt
@HiltAndroidApp
class HdHomeyApplication : Application() {
    override fun onCreate() {
        super.onCreate()
        // Initialize logging, crash reporting, etc.
    }
}
```

### Modules

```kotlin
// AppModule.kt
@Module
@InstallIn(SingletonComponent::class)
object AppModule {
    
    @Provides
    @Singleton
    fun provideTokenManager(@ApplicationContext context: Context): TokenManager {
        return TokenManager(context)
    }
    
    @Provides
    @Singleton
    fun provideHdHomeyApi(tokenManager: TokenManager): HdHomeyApi {
        val baseUrl = BuildConfig.BACKEND_URL
        return RetrofitFactory.create(baseUrl, tokenManager)
    }
    
    @Provides
    @Singleton
    fun provideAuthRepository(
        api: HdHomeyApi,
        tokenManager: TokenManager
    ): AuthRepository {
        return AuthRepository(api, tokenManager)
    }
    
    @Provides
    @Singleton
    fun provideChannelRepository(api: HdHomeyApi): ChannelRepository {
        return ChannelRepository(api)
    }
}
```

## Testing

### Unit Tests

```kotlin
// AuthRepositoryTest.kt
@Test
fun `generateDeviceCode returns success when API call succeeds`() = runTest {
    // Given
    val mockApi = mockk<HdHomeyApi>()
    val mockTokenManager = mockk<TokenManager>(relaxed = true)
    val expectedResponse = DeviceCodeResponse(
        code = "ABC123",
        deviceName = "Test TV",
        deviceType = "tv",
        pairingUrl = "http://example.com/pair",
        expiresAt = "2024-12-13T12:05:00Z"
    )
    
    coEvery { mockApi.generateDeviceCode(any()) } returns expectedResponse
    
    val repository = AuthRepository(mockApi, mockTokenManager)
    
    // When
    val result = repository.generateDeviceCode()
    
    // Then
    assertThat(result.isSuccess).isTrue()
    assertThat(result.getOrNull()).isEqualTo(expectedResponse)
}
```

### Instrumented Tests

```kotlin
// PairingFragmentTest.kt
@RunWith(AndroidJUnit4::class)
class PairingFragmentTest {
    
    @get:Rule
    val hiltRule = HiltAndroidRule(this)
    
    @Test
    fun displaysDeviceCode_whenPairingStarts() {
        // Launch fragment
        launchFragmentInHiltContainer<PairingFragment>()
        
        // Verify code is displayed
        onView(withText("ABC123")).check(matches(isDisplayed()))
        onView(withText("http://example.com/pair")).check(matches(isDisplayed()))
    }
}
```

## Coding Standards

### Kotlin Style

- Follow [Kotlin Coding Conventions](https://kotlinlang.org/docs/coding-conventions.html)
- Use trailing commas in multi-line expressions
- Prefer `val` over `var`
- Use meaningful variable names
- Add KDoc comments for public APIs

### Naming Conventions

- **Classes**: `PascalCase`
- **Functions**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE`
- **Resources**: `snake_case`
  - Layouts: `fragment_pairing.xml`, `activity_player.xml`
  - IDs: `button_start_pairing`, `text_device_code`
  - Strings: `pairing_title`, `error_network`

### Resource Organization

```
res/
├── layout/
│   ├── activity_main.xml
│   ├── fragment_pairing.xml
│   ├── fragment_browse.xml
│   └── item_channel_card.xml
├── values/
│   ├── strings.xml          # User-facing strings
│   ├── colors.xml           # Color palette
│   ├── themes.xml           # App theme
│   └── dimens.xml           # Dimensions for TV (48dp focus, etc.)
└── drawable/
    ├── ic_launcher.xml      # App icon
    ├── banner.png           # TV banner (320x180)
    └── channel_placeholder.xml
```

## Build Configuration

### `build.gradle.kts` (Module)

```kotlin
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.dagger.hilt.android")
    kotlin("kapt")
}

android {
    namespace = "com.hdhomey.tv"
    compileSdk = 34
    
    defaultConfig {
        applicationId = "com.hdhomey.tv"
        minSdk = 31  // Android TV requires API 31+
        targetSdk = 34
        versionCode = 1
        versionName = "1.0.0-alpha.1"
        
        // Load backend URL from local.properties
        val properties = project.rootProject.file("local.properties")
            .takeIf { it.exists() }
            ?.let { java.util.Properties().apply { load(it.inputStream()) } }
        
        buildConfigField(
            "String",
            "BACKEND_URL",
            "\"${properties?.getProperty("backend.url") ?: "http://192.168.1.100:3000"}\""
        )
    }
    
    buildTypes {
        release {
            isMinifyEnabled = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    
    kotlinOptions {
        jvmTarget = "17"
    }
    
    buildFeatures {
        compose = true
        buildConfig = true
    }
    
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.3"
    }
}

dependencies {
    // Kotlin
    implementation("org.jetbrains.kotlin:kotlin-stdlib:1.9.10")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
    
    // AndroidX
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.appcompat:appcompat:1.6.1")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.6.2")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.6.2")
    
    // Jetpack Compose for TV
    implementation(platform("androidx.compose:compose-bom:2023.10.01"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.tv:tv-foundation:1.0.0-alpha10")
    implementation("androidx.tv:tv-material:1.0.0-alpha10")
    
    // Leanback (traditional TV UI)
    implementation("androidx.leanback:leanback:1.2.0-alpha04")
    
    // Navigation
    implementation("androidx.navigation:navigation-compose:2.7.5")
    
    // Networking
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-moshi:2.9.0")
    implementation("com.squareup.okhttp3:okhttp:4.12.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")
    implementation("com.squareup.moshi:moshi-kotlin:1.15.0")
    
    // Video Player
    implementation("androidx.media3:media3-exoplayer:1.2.0")
    implementation("androidx.media3:media3-exoplayer-hls:1.2.0")
    implementation("androidx.media3:media3-ui:1.2.0")
    implementation("androidx.media3:media3-ui-leanback:1.2.0")
    
    // Image Loading
    implementation("io.coil-kt:coil-compose:2.5.0")
    
    // Dependency Injection
    implementation("com.google.dagger:hilt-android:2.48")
    kapt("com.google.dagger:hilt-compiler:2.48")
    
    // DataStore (preferences)
    implementation("androidx.datastore:datastore-preferences:1.0.0")
    
    // Testing
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.7.3")
    testImplementation("com.google.truth:truth:1.1.5")
    testImplementation("io.mockk:mockk:1.13.8")
    androidTestImplementation("androidx.test.ext:junit:1.1.5")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.5.1")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-tooling")
}
```

## Next Implementation Steps

1. **Create Gradle project structure** (when on macOS)
2. **Implement device pairing UI** (first screen users see)
3. **Add channel browsing with Leanback**
4. **Integrate ExoPlayer for video playback**
5. **Add settings screen**
6. **Polish TV navigation and focus**

## Resources

- [Jetpack Compose for TV Docs](https://developer.android.com/jetpack/compose/tv)
- [Leanback Library Guide](https://developer.android.com/training/tv/playback/browse)
- [ExoPlayer Guide](https://exoplayer.dev/)
- [Retrofit Documentation](https://square.github.io/retrofit/)
- [Kotlin Coroutines Guide](https://kotlinlang.org/docs/coroutines-guide.html)

---

**Ready to implement!** Follow SETUP.md to get your environment configured, then start with the device pairing flow.
