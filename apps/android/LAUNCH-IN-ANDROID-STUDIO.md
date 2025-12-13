# Launching HD Homey Android App in Android Studio

This guide shows you how to open and run the HD Homey Android app in Android Studio.

## Prerequisites

- **Android Studio**: Latest stable version (2024.1.1+)
- **Java/JDK**: OpenJDK 17 or higher (bundled with Android Studio)
- **Android SDK**: API 28+ (Android 9) installed

## Option 1: Open Existing Project (Recommended)

### Step 1: Launch Android Studio
1. Open Android Studio
2. Close any existing projects if open

### Step 2: Open the Android App
1. Click **"Open"** on the welcome screen
2. Navigate to: `/home/shaunburdick/github/shaunburdick/hd-homey/apps/android`
3. Click **"OK"**

**Alternative**: If already in a project:
- **File → Open...**
- Navigate to `apps/android/`
- Click **"OK"**

### Step 3: Wait for Gradle Sync
- Android Studio will automatically sync Gradle dependencies
- This takes 1-3 minutes on first open
- Watch the bottom status bar for "Gradle Build Finished"

**If Gradle sync fails**:
- Check that `JAVA_HOME` is set (Android Studio usually handles this)
- Click **"Sync Project with Gradle Files"** (elephant icon in toolbar)

### Step 4: Configure Run Configuration
1. At the top toolbar, click the dropdown next to the green play button
2. Select **"app"** (should be automatically selected)
3. Next to it, select a device:
   - **Physical device**: Connect via USB and enable Developer Mode
   - **Emulator**: Create one (see "Create Emulator" below)

### Step 5: Run the App
1. Click the green **Play** button (▶️) or press `Shift+F10`
2. Android Studio will:
   - Build the APK (`BUILD SUCCESSFUL in ~10-30s`)
   - Install on device/emulator
   - Launch the app

**Expected Result**:
- App opens to "Server Setup" screen
- Shows "Discovering HD Homey..." text (placeholder UI)

---

## Option 2: Import from Version Control

If you cloned the repo in a different location:

### Step 1: Open from VCS
1. Android Studio welcome screen → **"Get from VCS"**
2. Enter repository URL: `https://github.com/shaunburdick/hd-homey.git`
3. Directory: Choose where to clone
4. Click **"Clone"**

### Step 2: Open Android Module
1. After cloning, Android Studio opens the root project
2. **File → Open...**
3. Navigate to `apps/android/` within the cloned repo
4. Click **"OK"**

Then follow Option 1, Steps 3-5.

---

## Creating an Android Emulator

### For Android TV Testing

1. **Open AVD Manager**:
   - **Tools → Device Manager** (or AVD Manager icon in toolbar)

2. **Create Virtual Device**:
   - Click **"Create Device"**
   - Category: **TV**
   - Device: **"Android TV (1080p)"**
   - Click **"Next"**

3. **Select System Image**:
   - API Level: **31 (Android 12)** or higher
   - ABI: **x86_64** (faster on Intel/AMD)
   - Click **"Download"** if not installed
   - Click **"Next"**

4. **Configure AVD**:
   - AVD Name: `HD_Homey_TV_API31`
   - Graphics: **Hardware - GLES 2.0**
   - Click **"Finish"**

5. **Launch Emulator**:
   - In Device Manager, click the green **Play** button next to your AVD
   - Wait for emulator to boot (~30 seconds)

### For Phone/Tablet Testing

1. **Create Virtual Device**:
   - Category: **Phone**
   - Device: **"Pixel 6"** or similar
   - Click **"Next"**

2. **Select System Image**:
   - API Level: **34 (Android 14)** or higher
   - Click **"Download"** if needed
   - Click **"Next"**

3. **Finish**:
   - AVD Name: `HD_Homey_Phone_API34`
   - Click **"Finish"**

---

## WSL2 Specific: Use Emulator from Command Line

If running Android Studio in WSL2, the emulator may not work from GUI. Use command line instead:

### Step 1: Build in Android Studio
1. Open project in Android Studio
2. **Build → Build Bundle(s) / APK(s) → Build APK(s)**
3. Wait for "BUILD SUCCESSFUL"
4. Note APK location: `app/build/outputs/apk/debug/app-debug.apk`

### Step 2: Launch Emulator from Terminal
```bash
# In WSL2 terminal
export ANDROID_HOME=~/Android/Sdk
export JAVA_HOME=/snap/android-studio/209/jbr

# Start emulator in background
$ANDROID_HOME/emulator/emulator @HD_Homey_TV_API31 -no-audio -no-boot-anim -no-window &

# Wait for boot
adb wait-for-device
sleep 10

# Install APK
adb install -r /home/shaunburdick/github/shaunburdick/hd-homey/apps/android/app/build/outputs/apk/debug/app-debug.apk

# Launch app
adb shell monkey -p com.hdhomey.app.debug -c android.intent.category.LAUNCHER 1
```

### View Logs
```bash
# Filter app logs
adb logcat | grep -E "HDHomey|MainActivity|hdhomey"

# Clear logcat
adb logcat -c

# View logs from specific process
adb logcat --pid=$(adb shell pidof -s com.hdhomey.app.debug)
```

---

## Using a Physical Android Device

### Step 1: Enable Developer Mode
**On your Android device:**
1. **Settings → About Phone/Tablet**
2. Tap **"Build Number"** 7 times (you'll see "You are now a developer!")
3. Go back to Settings
4. **Settings → System → Developer Options**
5. Enable **"USB Debugging"**

### Step 2: Connect Device
1. Connect device via USB cable
2. On device, allow USB debugging when prompted
3. In Android Studio, device should appear in device dropdown

### Step 3: Run App
1. Select your device in the toolbar dropdown
2. Click **Play** button (▶️)
3. App installs and launches on your device

---

## Troubleshooting

### "SDK Location Not Found"
**Solution**: Create `local.properties` file:
```bash
cd /home/shaunburdick/github/shaunburdick/hd-homey/apps/android
echo "sdk.dir=$HOME/Android/Sdk" > local.properties
```

### "JAVA_HOME Not Set"
**Solution**: Android Studio should use bundled JDK automatically.

If needed:
```bash
export JAVA_HOME=/snap/android-studio/209/jbr
```

### "Gradle Sync Failed"
**Solution**:
1. **File → Invalidate Caches... → Invalidate and Restart**
2. Or manually sync: **File → Sync Project with Gradle Files**

### "Could Not Find Build Tools"
**Solution**:
1. **Tools → SDK Manager**
2. **SDK Tools** tab
3. Install **Android SDK Build-Tools 35.0.0**

### "Emulator: Process finished with exit code 1"
**In WSL2**: Use command-line emulator (see "WSL2 Specific" above)

**On native Linux/Mac/Windows**: Check that KVM/Hyper-V is enabled:
```bash
# Linux: Check KVM
ls -la /dev/kvm
# Should show: crw-rw---- 1 root kvm ...

# Add yourself to kvm group if needed
sudo usermod -aG kvm $USER
# Then log out and log back in
```

### "App Crashes on Launch"
**Check Logcat**:
1. **View → Tool Windows → Logcat**
2. Filter by package name: `com.hdhomey.app`
3. Look for red error lines (exceptions)

---

## Project Structure in Android Studio

Once opened, you'll see:

```
android/
├── app/
│   ├── src/
│   │   └── main/
│   │       ├── java/com/hdhomey/app/
│   │       │   ├── MainActivity.kt          ← Entry point
│   │       │   └── ui/
│   │       │       ├── setup/ServerSetupFragment.kt
│   │       │       ├── auth/AuthenticationFragment.kt
│   │       │       └── success/SuccessFragment.kt
│   │       ├── res/
│   │       │   ├── layout/                  ← XML layouts
│   │       │   ├── navigation/nav_graph.xml ← Navigation flow
│   │       │   └── values/                  ← Strings, colors, themes
│   │       └── AndroidManifest.xml
│   └── build.gradle.kts                     ← App dependencies
├── gradle/
│   └── libs.versions.toml                   ← Version catalog
├── build.gradle.kts                         ← Project-level config
└── settings.gradle.kts
```

**Key Files**:
- **MainActivity.kt**: Single Activity with NavHostFragment
- **nav_graph.xml**: Navigation graph (Setup → Auth → Success)
- **build.gradle.kts** (app): Dependencies and build config
- **libs.versions.toml**: Centralized version management

---

## Next Steps

Once the app launches:

1. **Explore the UI**: Currently shows placeholder "Discovering HD Homey..." screen
2. **Check Phase 1.2 Plan**: We'll implement server list and add server functionality
3. **Make Code Changes**: Edit Kotlin files in `src/main/java/com/hdhomey/app/`
4. **Hot Reload**: Android Studio supports incremental builds (faster rebuilds)

---

## Quick Reference

| Action | Shortcut (Linux/Windows) | Shortcut (Mac) |
|--------|--------------------------|----------------|
| Run app | `Shift+F10` | `^R` |
| Stop app | `Shift+F9` | `^F2` |
| Debug app | `Shift+F9` | `^D` |
| Build APK | `Ctrl+F9` | `⌘F9` |
| Sync Gradle | `Ctrl+Shift+O` | `⌘⇧O` |
| Open AVD Manager | Click device dropdown → "Device Manager" | Same |

---

**Status**: ✅ Phase 1.1 Complete - App launches successfully  
**Current Screen**: ServerSetupFragment (placeholder)  
**Next**: Phase 1.2 - Multi-Server Management
