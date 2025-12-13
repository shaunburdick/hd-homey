# Quick Reference: Continuing Android Development

**Last Updated**: December 13, 2025  
**Current Status**: Phase 1.2 ✅ Complete, Phase 1.3 Ready to Start  
**Branch**: `013-android-app`  
**Last Commit**: `c9b7937` - Multi-server management

---

## Current State

### ✅ What's Complete
- **Phase 1.1**: Android project setup, basic navigation, placeholder fragments
- **Phase 1.2**: Multi-server management (add/list/select servers with health checks)

### 🚧 What's Next
- **Phase 1.3**: Device code pairing integration (6-8 hours)
  - Update AuthenticationFragment to receive serverId
  - Implement device code API client (POST /code, GET /poll)
  - Store JWT in server object after successful pairing

---

## Quick Commands

### Build & Run
```bash
# Set Java home
export JAVA_HOME=/snap/android-studio/209/jbr

# Build APK
cd /home/shaunburdick/github/shaunburdick/hd-homey/apps/android
./gradlew assembleDebug

# Start emulator (if not running)
export ANDROID_HOME=~/Android/Sdk
$ANDROID_HOME/emulator/emulator @HD_Homey_TV_API31 -no-audio -no-boot-anim -no-window &

# Wait for boot
adb wait-for-device
sleep 5

# Install and launch
adb install -r app/build/outputs/apk/debug/app-debug.apk
adb shell monkey -p com.hdhomey.app.debug -c android.intent.category.LAUNCHER 1

# View logs
adb logcat -s "ServerListFragment:D" "AddServerFragment:D" "MainActivity:D"
```

### Git Commands
```bash
cd /home/shaunburdick/github/shaunburdick/hd-homey

# Check status
git status
git log --oneline -5

# Pull latest
git pull origin 013-android-app

# Push changes
git push origin 013-android-app
```

---

## Environment Setup (If Switching Computers)

### WSL2 Requirements
```bash
# System packages (already installed on current machine)
sudo apt-get install -y libpulse0 libnss3 libnss3-tools libxkbfile1 \
  libxcomposite1 libxcursor1 libxdamage1 libxi6 libxtst6 libcups2t64 \
  libxss1 libxrandr2 libasound2t64 libatk1.0-0t64 libatk-bridge2.0-0t64 \
  libpango-1.0-0 libcairo2 libatspi2.0-0t64

# KVM access (already configured)
sudo usermod -aG kvm $USER
```

### Environment Variables
```bash
# Add to ~/.bashrc or set per-session
export JAVA_HOME=/snap/android-studio/209/jbr
export ANDROID_HOME=~/Android/Sdk
export PATH=$PATH:$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator
```

### Android Studio (if needed)
- Install from: https://developer.android.com/studio
- Or use snap: `sudo snap install android-studio --classic`
- SDK location: `~/Android/Sdk`
- JDK: Built-in JDK at `/snap/android-studio/209/jbr`

### Emulator (already created)
```bash
# List emulators
$ANDROID_HOME/emulator/emulator -list-avds

# Current emulator: HD_Homey_TV_API31 (Android TV, API 31, 1920x1080)
```

---

## Project Structure

```
apps/android/
├── app/
│   ├── src/main/
│   │   ├── java/com/hdhomey/app/
│   │   │   ├── data/
│   │   │   │   ├── model/Server.kt               # NEW (Phase 1.2)
│   │   │   │   └── repository/ServerRepository.kt # NEW (Phase 1.2)
│   │   │   ├── storage/
│   │   │   │   └── AppPreferences.kt              # NEW (Phase 1.2)
│   │   │   ├── ui/
│   │   │   │   ├── auth/AuthenticationFragment.kt  # Phase 1.1 (needs update)
│   │   │   │   ├── servers/                        # NEW (Phase 1.2)
│   │   │   │   │   ├── AddServerFragment.kt
│   │   │   │   │   ├── ServerListAdapter.kt
│   │   │   │   │   └── ServerListFragment.kt
│   │   │   │   ├── setup/ServerSetupFragment.kt    # LEGACY (will remove)
│   │   │   │   └── success/SuccessFragment.kt
│   │   │   ├── util/                               # NEW (Phase 1.2)
│   │   │   │   ├── Constants.kt
│   │   │   │   └── UrlValidator.kt
│   │   │   └── MainActivity.kt
│   │   ├── res/
│   │   │   ├── layout/
│   │   │   │   ├── fragment_add_server.xml         # NEW (Phase 1.2)
│   │   │   │   ├── fragment_server_list.xml        # NEW (Phase 1.2)
│   │   │   │   ├── item_server.xml                 # NEW (Phase 1.2)
│   │   │   │   └── [other layouts]
│   │   │   └── navigation/nav_graph.xml            # UPDATED (Phase 1.2)
│   │   └── AndroidManifest.xml
│   └── build.gradle.kts                             # UPDATED (Phase 1.2)
├── gradle/
│   ├── libs.versions.toml                           # UPDATED (Phase 1.2)
│   └── wrapper/gradle-wrapper.properties
├── build.gradle.kts
├── settings.gradle.kts
├── local.properties                                  # LOCAL (not in git)
├── LAUNCH-IN-ANDROID-STUDIO.md                      # NEW (Phase 1.2)
├── QUICKSTART.md
├── SETUP.md
└── DEVELOPMENT.md

specs/013-android-app-phase1/
├── plan.md                                          # Phase 1 architecture
├── tasks.md                                         # UPDATED (Phase 1.2 complete)
├── PHASE1.1-COMPLETE.md                             # Phase 1.1 summary
└── PHASE1.2-COMPLETE.md                             # NEW (Phase 1.2 summary)
```

---

## Phase 1.3 Roadmap

### Files to Create
```
apps/android/app/src/main/java/com/hdhomey/app/
├── api/
│   ├── HdHomeyApi.kt              # OkHttp client with dynamic base URL
│   ├── DeviceCodeService.kt       # Device code API calls
│   └── models/
│       ├── DeviceCodeRequest.kt
│       ├── DeviceCodeResponse.kt
│       └── PollResponse.kt
```

### Files to Update
```
apps/android/app/src/main/java/com/hdhomey/app/ui/
├── auth/AuthenticationFragment.kt   # Add serverId argument, device code logic
└── success/SuccessFragment.kt       # Show server name, user info
```

### API Endpoints to Implement
```kotlin
// POST /api/auth/device/code
data class DeviceCodeRequest(
    val deviceName: String,
    val deviceType: String = "android_tv"
)

data class DeviceCodeResponse(
    val deviceCode: String,        // "ABCD12"
    val userCode: String,           // Same as deviceCode
    val verificationUri: String,    // "http://192.168.1.100:3000/pair"
    val expiresIn: Int,             // 300 (5 minutes)
    val interval: Int               // 3 (seconds between polls)
)

// GET /api/auth/device/poll?code=ABCD12
data class PollResponse(
    val status: String,             // "pending" | "authorized" | "expired" | "denied"
    val token: String?,             // JWT if authorized
    val expiresAt: Long?,           // Token expiration timestamp
    val user: UserInfo?
)

data class UserInfo(
    val username: String,
    val role: String                // "admin" | "viewer"
)
```

### Implementation Flow
1. User selects server from ServerListFragment
2. Navigate to AuthenticationFragment with serverId bundle
3. AuthenticationFragment loads server from repository
4. POST to `{serverUrl}/api/auth/device/code`
5. Display code prominently (96sp text for TV)
6. Poll `{serverUrl}/api/auth/device/poll?code=XXX` every 3 seconds
7. On authorized: Extract JWT, parse token for username/role
8. Update server in repository: `updateServerAuthentication(serverId, jwt, expiresAt, username, role)`
9. Navigate to SuccessFragment
10. Return to ServerListFragment showing "● Authenticated"

---

## Testing Strategy

### Manual Testing Checklist for Phase 1.3
- [ ] Add server with HTTP URL
- [ ] Select server → Navigate to authentication
- [ ] Device code displays (6 characters, 96sp)
- [ ] Pairing URL shows below code
- [ ] Open backend URL in browser, enter code
- [ ] Authorization succeeds, app polls and receives JWT
- [ ] Navigate to success screen
- [ ] Return to server list, status shows "● Authenticated"
- [ ] Verify JWT stored in AppPreferences
- [ ] Select authenticated server → Should navigate to main app (Phase 2 placeholder)

### Backend Setup for Testing
```bash
# Start HD Homey backend
cd ~/github/shaunburdick/hd-homey/apps/web
npm run dev

# Backend should be running on http://192.168.1.100:3000
# Health endpoint: http://192.168.1.100:3000/api/health
# Pairing page: http://192.168.1.100:3000/pair
```

---

## Common Issues & Solutions

### Gradle Build Errors
```bash
# Clean build
./gradlew clean

# Clear Gradle cache
rm -rf ~/.gradle/caches

# Rebuild
./gradlew assembleDebug
```

### Emulator Not Starting
```bash
# Check emulator status
$ANDROID_HOME/emulator/emulator -list-avds

# Kill all emulator processes
pkill -f emulator

# Start with verbose logging
$ANDROID_HOME/emulator/emulator @HD_Homey_TV_API31 -verbose
```

### ADB Not Detecting Device
```bash
# Restart ADB server
adb kill-server
adb start-server

# Check devices
adb devices

# If no devices, wait for emulator boot
adb wait-for-device
```

### App Not Launching
```bash
# Clear app data
adb shell pm clear com.hdhomey.app.debug

# Uninstall and reinstall
adb uninstall com.hdhomey.app.debug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

---

## Documentation References

### Project Docs
- Main plan: `specs/013-android-app-phase1/plan.md`
- Tasks: `specs/013-android-app-phase1/tasks.md`
- Phase 1.1 summary: `specs/013-android-app-phase1/PHASE1.1-COMPLETE.md`
- Phase 1.2 summary: `specs/013-android-app-phase1/PHASE1.2-COMPLETE.md`
- Android Studio guide: `apps/android/LAUNCH-IN-ANDROID-STUDIO.md`

### External Resources
- Android TV guidelines: https://developer.android.com/design/ui/tv
- Kotlin coroutines: https://kotlinlang.org/docs/coroutines-overview.html
- OkHttp: https://square.github.io/okhttp/
- Material Design: https://m3.material.io/

---

## Summary

**You're ready to continue!** Phase 1.2 is committed and ready. Next is Phase 1.3 (device code pairing), which will integrate the authentication flow with the server selection UI you just built.

**Current branch**: `013-android-app`  
**Last commit**: `c9b7937`  
**Build status**: ✅ SUCCESS (52s, ~19MB APK)  
**Emulator**: HD_Homey_TV_API31 (Android 12, API 31)

Pull the latest changes on your new machine, set up the environment, and you're good to go! 🚀
