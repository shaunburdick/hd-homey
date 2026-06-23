# HD Homey Android TV App

Native Android TV application for HD Homey that provides a seamless 10-foot UI experience for browsing and streaming live TV channels.

## Status

✅ **Phase 1 Complete!** - Foundation & Authentication fully implemented and tested.
✅ **Phase 2 Complete!** - Channel browsing and video streaming fully implemented.

🚀 **Ready for Phase 3**: Advanced features (favorites, search, EPG).

### Phase 1 Achievements
- ✅ Multi-server management with add/edit/delete
- ✅ OAuth 2.0 device code pairing flow
- ✅ JWT token storage and session management
- ✅ Professional HD Homey branding (app icon, TV banner)
- ✅ Polished 10-foot UI with animations and visual feedback
- ✅ Comprehensive error handling with retry/cancel options
- ✅ 86 unit tests passing (100% data layer coverage)
- ✅ Android TV optimized navigation and focus management

### Phase 2 Achievements
- ✅ MVVM architecture with Hilt DI (NetworkModule, MediaModule, DataModule)
- ✅ Retrofit 2.11.0 API layer with cookie-based Better-Auth authentication
- ✅ Domain layer with Use Cases (GetChannelsUseCase, GenerateStreamUrlUseCase)
- ✅ Data layer with repositories (ChannelRepository, PreferencesRepository)
- ✅ Channel list with RecyclerView, D-pad navigation, shimmer loading
- ✅ Video playback with Media3 ExoPlayer and HLS stream support
- ✅ Stream URL generation with HMAC token authentication
- ✅ 5-minute in-memory preference cache (favorites/hidden)
- ✅ Favorites sorting (favorites first, then by channel number)
- ✅ Cookie-based auth interceptor with token storage (encrypted DataStore)
- ✅ Automatic tuner discovery and selection
- ✅ 45+ unit tests across all layers
- ✅ Exponential backoff retry for stream playback failures

## Prerequisites

### macOS Development Setup

1. **Android Studio** (Latest stable - Hedgehog 2023.1.1+)
   ```bash
   # Download from: https://developer.android.com/studio
   # Or via Homebrew:
   brew install --cask android-studio
   ```

2. **Java Development Kit (JDK 17+)**
   ```bash
   # Check if installed:
   java -version
   
   # Install via Homebrew if needed:
   brew install openjdk@17
   ```

3. **Android SDK** (via Android Studio)
   - API Level 31+ (Android 12+) for TV
   - Android TV x86 System Image for emulator

4. **Git** (for repository management)
   ```bash
   # Should already be installed, verify:
   git --version
   ```

## Project Structure

```
apps/android/
├── app/                          # Main application module
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/hdhomey/app/
│   │   │   │   ├── HdHomeyApplication.kt    # @HiltAndroidApp application class
│   │   │   │   ├── MainActivity.kt          # Main activity with navigation
│   │   │   │   ├── ui/
│   │   │   │   │   ├── servers/            # Server management (Phase 1)
│   │   │   │   │   │   ├── ServerListFragment.kt
│   │   │   │   │   │   ├── ServerListAdapter.kt
│   │   │   │   │   │   └── AddServerFragment.kt
│   │   │   │   │   ├── auth/               # Authentication/pairing
│   │   │   │   │   │   └── AuthenticationFragment.kt
│   │   │   │   │   ├── success/            # Success confirmation
│   │   │   │   │   │   └── SuccessFragment.kt
│   │   │   │   │   ├── channels/           # Channel browsing (Phase 2)
│   │   │   │   │   │   ├── ChannelListFragment.kt
│   │   │   │   │   │   ├── ChannelListViewModel.kt
│   │   │   │   │   │   ├── ChannelListUiState.kt
│   │   │   │   │   │   └── ChannelAdapter.kt
│   │   │   │   │   └── player/             # Video player (Phase 2)
│   │   │   │   │       ├── PlayerActivity.kt
│   │   │   │   │       ├── PlayerViewModel.kt
│   │   │   │   │       └── PlayerUiState.kt
│   │   │   │   ├── api/                    # API services
│   │   │   │   │   ├── HdHomeyApiService.kt    # Retrofit interface
│   │   │   │   │   ├── HdHomeyApi.kt
│   │   │   │   │   ├── DeviceCodeService.kt
│   │   │   │   │   ├── interceptors/
│   │   │   │   │   │   ├── AuthInterceptor.kt  # Cookie-based auth
│   │   │   │   │   │   └── ErrorInterceptor.kt # 401/403/5xx handling
│   │   │   │   │   └── models/              # API DTOs
│   │   │   │   │       ├── ApiResponse.kt
│   │   │   │   │       ├── ChannelDto.kt
│   │   │   │   │       ├── ChannelPreferenceDto.kt
│   │   │   │   │       ├── StreamTokenDto.kt
│   │   │   │   │       ├── TunerDto.kt
│   │   │   │   │       ├── DeviceCodeRequest.kt
│   │   │   │   │       ├── DeviceCodeResponse.kt
│   │   │   │   │       └── PollResponse.kt
│   │   │   │   ├── data/                   # Data layer
│   │   │   │   │   ├── model/              # Data models
│   │   │   │   │   │   └── Server.kt
│   │   │   │   │   ├── mapper/             # DTO→Domain mappers
│   │   │   │   │   │   ├── ChannelMapper.kt
│   │   │   │   │   │   └── StreamTokenMapper.kt
│   │   │   │   │   └── repository/         # Data repositories
│   │   │   │   │       ├── ChannelRepository.kt
│   │   │   │   │       ├── PreferencesRepository.kt
│   │   │   │   │       ├── ServerRepository.kt
│   │   │   │   │       └── TokenRepository.kt
│   │   │   │   ├── domain/                 # Domain layer
│   │   │   │   │   ├── model/
│   │   │   │   │   │   ├── Channel.kt
│   │   │   │   │   │   ├── ChannelPreferences.kt
│   │   │   │   │   │   ├── ChannelWithMetadata.kt
│   │   │   │   │   │   └── StreamToken.kt
│   │   │   │   │   └── usecase/            # Use cases
│   │   │   │   │       ├── GetChannelsUseCase.kt
│   │   │   │   │       ├── GetChannelPreferencesUseCase.kt
│   │   │   │   │       └── GenerateStreamUrlUseCase.kt
│   │   │   │   ├── di/                     # Hilt DI modules
│   │   │   │   │   ├── NetworkModule.kt    # OkHttp + Retrofit
│   │   │   │   │   ├── DataModule.kt       # DataStore
│   │   │   │   │   └── MediaModule.kt      # ExoPlayer
│   │   │   │   ├── player/                 # Player utilities
│   │   │   │   │   ├── HdHomeyMediaSource.kt
│   │   │   │   │   └── PlayerEventListener.kt
│   │   │   │   ├── storage/                # Local storage
│   │   │   │   │   ├── AppPreferences.kt   # DataStore-backed
│   │   │   │   │   └── TokenDataStore.kt   # Encrypted token storage
│   │   │   │   └── util/                   # Utilities
│   │   │   │       ├── Constants.kt
│   │   │   │       └── UrlValidator.kt
│   │   │   ├── res/
│   │   │   │   ├── layout/
│   │   │   │   │   ├── fragment_channel_list.xml  # Channel list (Phase 2)
│   │   │   │   │   ├── item_channel.xml            # Channel item (Phase 2)
│   │   │   │   │   ├── activity_player.xml         # Video player (Phase 2)
│   │   │   │   │   ├── fragment_server_list.xml    # Phase 1
│   │   │   │   │   ├── fragment_add_server.xml     # Phase 1
│   │   │   │   │   ├── fragment_authentication.xml # Phase 1
│   │   │   │   │   └── fragment_success.xml        # Phase 1
│   │   │   │   ├── values/                  # Strings, colors, themes
│   │   │   │   ├── mipmap-*/                # App icons
│   │   │   │   ├── drawable/                # Icons and images
│   │   │   │   ├── animator/                # Animations
│   │   │   │   └── navigation/              # nav_graph.xml
│   │   │   └── AndroidManifest.xml
│   │   └── test/                            # Unit tests
│   │       ├── data/repository/
│   │       │   ├── ChannelRepositoryTest.kt
│   │       │   ├── TokenRepositoryTest.kt
│   │       │   └── ServerRepositoryTest.kt
│   │       ├── domain/usecase/
│   │       │   ├── GetChannelsUseCaseTest.kt
│   │       │   └── GenerateStreamUrlUseCaseTest.kt
│   │       ├── ui/channels/
│   │       │   └── ChannelListViewModelTest.kt
│   │       ├── ui/player/
│   │       │   └── PlayerViewModelTest.kt
│   │       ├── storage/
│   │       │   └── AppPreferencesTest.kt
│   │       └── ...
│   ├── build.gradle.kts
│   └── proguard-rules.pro
├── build.gradle.kts
├── settings.gradle.kts
├── gradle/
│   └── libs.versions.toml
├── gradle.properties
├── local.properties (gitignored)
├── README.md
├── SETUP.md
├── DEVELOPMENT.md
└── QUICKSTART.md
```

## Quick Start (macOS)

### 1. Clone Repository (if not already done)

```bash
git clone https://github.com/shaunburdick/hd-homey.git
cd hd-homey
git checkout 013-android-app  # Or main after Phase 1 is merged
```

### 2. Open Project in Android Studio

```bash
# From terminal:
open -a "Android Studio" apps/android

# Or from Android Studio:
# File → Open → Navigate to hd-homey/apps/android
```

### 3. Configure Android SDK

1. Open **Android Studio → Preferences → Appearance & Behavior → System Settings → Android SDK**
2. Install required SDK platforms:
   - ✅ Android 12.0 (S) - API Level 31
   - ✅ Android 13.0 (T) - API Level 33
   - ✅ Android 14.0 (U) - API Level 34
3. Install SDK Tools (SDK Tools tab):
   - ✅ Android SDK Build-Tools
   - ✅ Android Emulator
   - ✅ Android SDK Platform-Tools

### 4. Create Android TV Emulator

1. Open **Tools → Device Manager**
2. Click **Create Device**
3. Select **TV** category
4. Choose **Android TV (1080p)**
5. Select **API 31+** system image
6. Click **Finish**

### 5. Configure Backend URL

Create `apps/android/local.properties`:

```properties
# Android SDK location (auto-generated by Android Studio)
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk

# Backend API configuration
# For local development, use your machine's IP address (not localhost)
backend.url=http://192.168.1.XXX:3000

# Or use ngrok/tunneling service for remote testing
# backend.url=https://your-ngrok-url.ngrok-free.app
```

### 6. Start Backend Server

In WSL2 or another terminal:

```bash
cd /path/to/hd-homey
npm run dev  # Starts backend on 0.0.0.0:3000
```

Find your machine's IP:
```bash
# On macOS:
ipconfig getifaddr en0

# On WSL2:
ip addr show eth0 | grep 'inet ' | awk '{print $2}' | cut -d/ -f1
```

### 7. Build and Run

```bash
# From Android Studio: Click the green "Run" button
# Or from terminal:
cd apps/android
./gradlew installDebug
```

## Technology Stack

### Core Dependencies

- **Kotlin** 2.1.0 - Modern, concise Android development
- **Android SDK** 35 (Android 15) - Target platform
- **Minimum SDK** 31 (Android 12) - TV compatibility
- **Gradle** 8.13 - Build system
- **AndroidX Libraries**:
  - Core KTX 1.15.0 - Kotlin extensions
  - AppCompat 1.7.0 - Backward compatibility
  - ConstraintLayout 2.2.0 - Flexible layouts
  - Material 1.12.0 - Material Design components
  - RecyclerView 1.3.2 - Efficient lists
  - CardView 1.0.0 - Card-based UI
  - Leanback 1.2.0-alpha04 - TV-optimized components
  - DataStore 1.1.1 - Preferences and data storage
- **Hilt** 2.51.1 - Dependency injection
- **Navigation** 2.8.5 - Fragment navigation
- **Coroutines** 1.9.0 - Asynchronous programming
- **Retrofit** 2.11.0 - HTTP client
- **OkHttp** 4.12.0 - HTTP client with interceptors
- **Kotlinx Serialization** 1.7.3 - JSON parsing
- **Media3 (ExoPlayer)** 1.9.0 - HLS video playback
- **Testing**:
  - JUnit 4.13.2 - Unit testing framework
  - Truth 1.4.4 - Fluent assertions
  - Robolectric 4.14.1 - Android unit tests
  - MockK 1.13.13 - Mocking framework
  - Turbine 1.0.0 - Flow testing

### TV-Specific Features (Implemented)

- **HD Homey Branding**: Custom app icon (all densities) + 320x180 TV banner
- **10-foot UI**: Large text (96sp codes), high contrast colors
- **D-pad Navigation**: Remote control support with focus management
- **Animations**: Shimmer loaders, ripple effects, staggered fade-ins
- **Error Recovery**: Retry/cancel buttons, clear error messages
- **Visual Feedback**: Loading indicators, active server highlighting

## Device Pairing Flow (Fully Implemented)

The Android app implements the client side of the OAuth 2.0 Device Code Flow:

```
1. App calls POST /api/auth/device/code
   → Receives: { code: "A8F2K9", pairingUrl: "...", expiresAt: "..." }

2. Display code on TV screen:
   "Go to tv.example.com/pair
    Enter code: A8F2K9"

3. Poll GET /api/auth/device/poll?code=A8F2K9 every 3 seconds
   → While pending: { status: "pending" }
   → On success: { status: "authorized", token: "eyJ...", user: {...} }

4. Store JWT token securely
5. Navigate to main channel browsing screen
6. Include token in all API requests: Authorization: Bearer {token}
```

## API Endpoints (Already Implemented)

All backend endpoints are documented and tested:

- **Device Pairing**: See `/apps/docs/api/device-pairing.md`
- **Health Check**: `GET /api/health`
- **Channel Lineup**: `GET /api/lineup.json`
- **Stream URLs**: Secured with HMAC tokens (auto-handled by backend)

## Development Workflow

### 1. Feature Development
```bash
# Create feature branch from 013-android-app
git checkout 013-android-app
git pull origin 013-android-app
git checkout -b android-feature-browsing

# Make changes in apps/android/
# Test on emulator or device
# Commit changes
git add apps/android/
git commit -m "feat(android): implement channel browsing UI"
```

### 2. Testing
```bash
# Unit tests
./gradlew test

# Instrumented tests (requires emulator/device)
./gradlew connectedAndroidTest

# Lint
./gradlew lint
```

### 3. Building Release APK
```bash
./gradlew assembleRelease

# APK location:
# apps/android/app/build/outputs/apk/release/app-release.apk
```

## Project Phases

### ✅ Phase 0: Repository Reorganization (Complete)
- Monorepo structure created
- `apps/android/` directory established
- Backend device pairing API fully implemented

### ✅ Phase 1: Foundation & Authentication (Complete)
**All tasks completed!** See `specs/013-android-app-phase1/` for detailed documentation.

#### Phase 1.1: Project Setup ✅
- Android project created with Kotlin 2.1.0
- Gradle build configured with version catalogs
- Navigation Component with safe args
- AndroidManifest configured for TV

#### Phase 1.2: Multi-Server Management ✅
- Server list with add/edit/delete functionality
- Health check validation (`GET /api/health`)
- Server persistence with JSON serialization
- Empty state and active server highlighting

#### Phase 1.3: Device Code Pairing ✅
- OAuth 2.0 device code generation (`POST /api/auth/device/code`)
- 6-character code display (96sp for 10-foot UI)
- Polling for authorization (`GET /api/auth/device/poll`)
- JWT token extraction and storage
- Countdown timer (5-minute expiration)

#### Phase 1.4: App Launch Logic ✅
- Smart entry point (server list vs add server)
- Navigation between authentication flows
- Success confirmation screen

#### Phase 1.5: Polish & Testing ✅
- **Sub-phase A**: Error recovery (retry/cancel/delete)
- **Sub-phase B**: Better error messages and loading feedback
- **Sub-phase C**: Animations and visual polish
- **Sub-phase D**: HD Homey branding (icon, banner, shimmer loaders)
- **Unit Tests**: 86 tests passing, 100% data layer coverage

#### Phase 1.6: Documentation & Cleanup ✅
- Updated README, SETUP, DEVELOPMENT docs
- KDoc comments on public APIs
- Lint clean (0 errors)
- Build verified (20MB APK)

### ✅ Phase 2: Channel Browsing & Streaming (Complete)
- [x] MVVM architecture with Hilt DI (NetworkModule, MediaModule, DataModule)
- [x] Retrofit API layer with cookie-based Better-Auth authentication
- [x] Domain layer with Use Cases (GetChannelsUseCase, GenerateStreamUrlUseCase)
- [x] Channel list with RecyclerView and D-pad navigation
- [x] Video playback with Media3 ExoPlayer and HLS stream support
- [x] Stream URL generation with HMAC token authentication
- [x] Favorites display and sorting (favorites first)
- [x] Player controls with exponential backoff retry

### 🔮 Phase 3: Advanced Features (Future)
- [ ] Channel favorites and hiding (sync with backend)
- [ ] Search functionality
- [ ] EPG (Electronic Program Guide)
- [ ] Recording playback
- [ ] Multiple tuner support
- [ ] Picture-in-picture mode

## Resources

### Documentation
- [API Documentation](../docs/api/device-pairing.md) - Complete API reference
- [Android TV Development Guide](https://developer.android.com/training/tv) - Official Android TV docs
- [Jetpack Compose for TV](https://developer.android.com/jetpack/compose/tv) - Modern UI framework
- [ExoPlayer Guide](https://developer.android.com/guide/topics/media/exoplayer) - Video playback

### Sample Code
- [Android TV Samples](https://github.com/android/tv-samples) - Official Google samples
- [Leanback Showcase](https://github.com/googlearchive/androidtv-Leanback) - TV UI patterns

### Tools
- [Android Studio](https://developer.android.com/studio) - IDE
- [Vysor](https://www.vysor.io/) - Mirror Android device to computer
- [Scrcpy](https://github.com/Genymobile/scrcpy) - Open-source screen mirroring

## Troubleshooting

### Backend Connection Issues

**Problem**: App can't connect to backend
```
Error: Failed to connect to /192.168.1.100:3000
```

**Solution**:
1. Verify backend is running: `curl http://localhost:3000/api/health`
2. Find correct IP address (not `localhost` from emulator)
3. Check firewall settings allow port 3000
4. Use `0.0.0.0` instead of `127.0.0.1` in backend config

### Emulator Performance

**Problem**: Emulator is slow or laggy

**Solution**:
1. Enable hardware acceleration (HAXM on macOS Intel, Hypervisor.framework on Apple Silicon)
2. Allocate more RAM to emulator (4GB minimum)
3. Use x86_64 system images (faster than ARM on Intel Macs)
4. Use physical Android TV device for better performance

### Build Errors

**Problem**: Gradle build fails

**Solution**:
1. Invalidate caches: **File → Invalidate Caches → Invalidate and Restart**
2. Clean build: `./gradlew clean build`
3. Update Gradle: `./gradlew wrapper --gradle-version=8.4`
4. Check `local.properties` has correct SDK path

## Next Steps

See **SETUP.md** for detailed Android Studio setup instructions.

See **DEVELOPMENT.md** for development guidelines and coding standards.

## Need Help?

- [GitHub Issues](https://github.com/shaunburdick/hd-homey/issues) - Report bugs or request features
- [SPEC-013](../../.specify/features/013-android-app.md) - Complete specification
- [API Docs](../docs/api/device-pairing.md) - Backend API reference

---

**Ready to develop on macOS!** 🚀
