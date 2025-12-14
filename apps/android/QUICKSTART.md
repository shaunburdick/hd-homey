# 🚀 Quick Start - Android Development on macOS

**Branch**: `013-android-app`  
**Status**: Ready for Phase 2 implementation

## ✅ Phase 1 Complete (Backend)

The Device Pairing API is **fully implemented and tested**:
- ✅ 4 API endpoints working
- ✅ Database schema created
- ✅ Web UI at `/pair` for authorization
- ✅ 50 comprehensive unit tests
- ✅ Complete API documentation

## 📋 Quick Setup Checklist

### 1. Install Prerequisites (30 min)

```bash
# Install Android Studio
brew install --cask android-studio

# Install JDK (if needed)
brew install openjdk@17

# Open Android Studio and install:
# - Android SDK API 31, 33, 34
# - Android SDK Build-Tools
# - Android Emulator
```

### 2. Clone & Setup (5 min)

```bash
# Clone repository
cd ~/Projects
git clone https://github.com/shaunburdick/hd-homey.git
cd hd-homey
git checkout 013-android-app

# Open in Android Studio
open -a "Android Studio" apps/android
```

### 3. Configure Backend URL (2 min)

Create `apps/android/local.properties`:

```properties
sdk.dir=/Users/YOUR_USERNAME/Library/Android/sdk

# Find your Mac's IP: ipconfig getifaddr en0
backend.url=http://192.168.1.XXX:3000
```

### 4. Create TV Emulator (5 min)

In Android Studio:
1. **Tools → Device Manager**
2. **Create Device** → **TV** → **Android TV (1080p)**
3. Select **API 31+** system image
4. Name: `HD_Homey_TV_1080p`
5. Click **Finish**

### 5. Start Backend (1 min)

```bash
# On your backend machine (WSL2 or macOS):
cd hd-homey
npm run dev  # Runs on 0.0.0.0:3000

# Test connectivity:
curl http://YOUR_IP:3000/api/health
```

### 6. Build & Run (2 min)

Click the green **Run** button in Android Studio!

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| `apps/android/README.md` | Overview, tech stack, phases |
| `apps/android/SETUP.md` | **Detailed setup guide** (read this first) |
| `apps/android/DEVELOPMENT.md` | Architecture, code examples, testing |
| `apps/docs/api/device-pairing.md` | Backend API reference |

## 🏗️ Project Structure (To Be Created)

```
apps/android/
├── app/
│   ├── src/main/java/com/hdhomey/tv/
│   │   ├── ui/auth/              # Pairing screens
│   │   ├── ui/browse/            # Channel browsing
│   │   ├── ui/player/            # Video player
│   │   ├── data/api/             # Backend API client
│   │   ├── data/model/           # Data models
│   │   ├── data/repository/      # Repositories
│   │   └── util/                 # TokenManager, etc.
│   ├── build.gradle.kts
│   └── src/main/AndroidManifest.xml
├── build.gradle.kts
└── settings.gradle.kts
```

## 🎯 Implementation Priority

### Phase 2.1: Pairing UI (Start Here)
1. Create Gradle project structure
2. Implement `PairingViewModel` with polling logic
3. Build Compose UI for code display (10-foot design)
4. Test pairing flow end-to-end

### Phase 2.2: API Integration
1. Configure Retrofit with Bearer token interceptor
2. Implement `AuthRepository` and `ChannelRepository`
3. Add `TokenManager` with DataStore
4. Test API calls against backend

### Phase 2.3: Channel Browsing
1. Build Leanback browse fragment
2. Implement channel grid with cards
3. Add D-pad navigation
4. Test focus management

### Phase 2.4: Video Player
1. Integrate ExoPlayer
2. Handle HLS streams from backend
3. Add transport controls (play/pause/seek)
4. Test with live channels

## 🔗 API Endpoints (Already Implemented)

### Device Pairing Flow

```kotlin
// 1. Generate code
POST /api/auth/device/code
Body: { "deviceName": "Living Room TV", "deviceType": "tv" }
Response: { "code": "A8F2K9", "pairingUrl": "...", "expiresAt": "..." }

// 2. Poll every 3 seconds
GET /api/auth/device/poll?code=A8F2K9
Response: { "status": "pending" | "authorized" | "denied" | "expired" }

// 3. On authorized:
Response: { "status": "authorized", "token": "eyJ...", "user": {...} }

// 4. Use token in all requests
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Other Endpoints

```kotlin
GET /api/health               # Health check
GET /api/lineup.json          # Get all channels
GET /api/channels/{id}/stream # Stream URL (auto-auth with JWT)
```

## 🧪 Testing Strategy

```bash
# Unit tests (ViewModel, Repository logic)
./gradlew test

# Instrumented tests (UI, integration)
./gradlew connectedAndroidTest

# Lint
./gradlew lint
```

## 🐛 Common Issues & Solutions

### "Cannot connect to backend"
- **Fix**: Use Mac's IP address, not `localhost`
- **Find IP**: `ipconfig getifaddr en0`
- **Backend**: Must bind to `0.0.0.0:3000`, not `127.0.0.1`

### "SDK location not found"
- **Fix**: Check `local.properties` has `sdk.dir=/Users/.../Library/Android/sdk`

### Emulator is slow
- **Fix**: Allocate 4GB RAM, use x86_64 images, enable HAXM/Hypervisor

### Gradle sync fails
- **Fix**: `File → Invalidate Caches → Restart`

## 📦 Key Dependencies (Already Documented)

```kotlin
// Core
implementation("org.jetbrains.kotlin:kotlin-stdlib:1.9.10")
implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")

// UI
implementation("androidx.tv:tv-foundation:1.0.0-alpha10")
implementation("androidx.leanback:leanback:1.2.0-alpha04")
implementation("androidx.compose.material3:material3")

// Networking
implementation("com.squareup.retrofit2:retrofit:2.9.0")
implementation("com.squareup.okhttp3:okhttp:4.12.0")

// Video
implementation("androidx.media3:media3-exoplayer:1.2.0")
implementation("androidx.media3:media3-ui-leanback:1.2.0")

// DI
implementation("com.google.dagger:hilt-android:2.48")
```

## 🎨 Design Guidelines (10-Foot UI)

- **Text**: Minimum 16sp for body, 32sp for titles
- **Focus**: 48dp minimum touch target
- **Contrast**: High contrast colors for TV viewing distance
- **Navigation**: D-pad friendly, clear focus indicators
- **Typography**: Bold weights for readability

## 📞 Need Help?

- **API Docs**: `apps/docs/api/device-pairing.md`
- **Setup Guide**: `apps/android/SETUP.md` (detailed steps)
- **Dev Guide**: `apps/android/DEVELOPMENT.md` (code examples)
- **Spec**: `.specify/features/013-android-app.md`

---

## ⚡ TL;DR

1. **Install**: Android Studio via Homebrew
2. **Open**: `apps/android` in Android Studio
3. **Configure**: `local.properties` with your Mac's IP
4. **Create**: Android TV emulator (API 31+)
5. **Start**: Backend on `0.0.0.0:3000`
6. **Read**: `SETUP.md` for detailed instructions
7. **Build**: Click Run button!

**The backend is done. Time to build the TV app!** 📺
