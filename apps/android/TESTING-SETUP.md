# 🚀 Phase 2 Testing - Quick Setup Guide

**Goal**: Get everything running for manual testing in 5 minutes

---

## Step 1: Merge Backend (1 minute)

The backend API for Phase 2 is on a separate branch. Merge it first:

```bash
cd /Users/shaun.burdick/github/shaunburdick/hd-homey

# Fetch and merge backend branch
git fetch origin 013-android-app-phase2-backend
git merge origin/013-android-app-phase2-backend

# If there are merge conflicts, resolve them
# Most likely no conflicts since backend is separate from Android code
```

**Verify backend files exist**:
```bash
# Check if stream-token endpoint exists
ls apps/web/src/app/api/stream-token/route.ts

# Should output: apps/web/src/app/api/stream-token/route.ts
```

---

## Step 2: Start Backend Server (2 minutes)

```bash
cd apps/web

# Install dependencies (if not already done)
npm install

# Start development server
npm run dev

# Should see:
# ▲ Next.js 16.0.3
# - Local:        http://localhost:3000
# - Network:      http://192.168.x.x:3000
```

**Verify backend is running**:
- Open browser: http://localhost:3000
- Sign in to HD Homey
- Go to Tuners page
- Verify at least 1 tuner exists with channels

**Keep this terminal open** - backend must stay running during Android testing.

---

## Step 3: Open Android Project (1 minute)

### Option A: Android Studio (Recommended)
1. Open Android Studio
2. File → Open → Navigate to `/Users/shaun.burdick/github/shaunburdick/hd-homey/apps/android`
3. Wait for Gradle sync to complete
4. Click Run (green play button) or Shift+F10

### Option B: Command Line
```bash
cd /Users/shaun.burdick/github/shaunburdick/hd-homey/apps/android

# Build and install
./gradlew installDebug

# Start app
adb shell am start -n com.hdhomey.app/.ui.main.MainActivity
```

---

## Step 4: Choose Test Device (1 minute)

### Option A: Android TV Emulator (Recommended for testing)
1. Android Studio → Tools → Device Manager
2. Create Device → TV → Google TV (1080p)
3. Select System Image: API 33 (Android 13)
4. Finish and start emulator

### Option B: Physical Android Device
1. Enable Developer Options:
   - Settings → About → Tap "Build Number" 7 times
2. Enable USB Debugging:
   - Settings → Developer Options → USB Debugging → ON
3. Connect device via USB
4. Allow USB debugging on device
5. Verify connection: `adb devices`

### Option C: Android Phone/Tablet (Works but not ideal for TV UI)
- Same as Option B
- UI designed for TV but will work on phone/tablet

---

## Step 5: Start Testing! (30+ minutes)

Open the checklist and start testing:
```bash
# View checklist
open apps/android/MANUAL-TEST-CHECKLIST.md

# Or
cat apps/android/MANUAL-TEST-CHECKLIST.md
```

**Critical Path Tests (Must Pass)**:
1. ✅ Happy Path Flow (10 min)
2. ✅ D-Pad Navigation (5 min)
3. ✅ Error Handling (5 min)
4. ✅ Multiple Channel Switching (5 min)
5. ✅ Memory & Performance (5 min)

**Total**: ~30 minutes for critical tests

---

## 🔍 Quick Verification Checklist

Before starting manual tests, verify:

- [ ] Backend running at http://localhost:3000
- [ ] At least 1 tuner with channels exists in HD Homey
- [ ] Android app installed on device/emulator
- [ ] Device can reach backend (same network or localhost)
- [ ] ADB connected: `adb devices` shows your device
- [ ] Logcat visible: `adb logcat | grep hdhomey`

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check if port 3000 is in use
lsof -ti:3000 | xargs kill -9

# Try again
cd apps/web
npm run dev
```

### Android build fails
```bash
# Clean build
cd apps/android
./gradlew clean

# Rebuild
./gradlew installDebug
```

### ADB not found
```bash
# Add to PATH (in ~/.zshrc or ~/.bash_profile)
export PATH="$PATH:$HOME/Library/Android/sdk/platform-tools"

# Reload shell
source ~/.zshrc
```

### Emulator won't start
- Close and reopen Android Studio
- Device Manager → Wipe Data on emulator
- Restart emulator

### App crashes on launch
```bash
# View crash logs
adb logcat | grep "AndroidRuntime\|hdhomey"

# Clear app data and try again
adb shell pm clear com.hdhomey.app
```

---

## 📝 During Testing

### Keep these terminals open:

**Terminal 1: Backend**
```bash
cd apps/web
npm run dev
```

**Terminal 2: Logcat (Android logs)**
```bash
adb logcat | grep hdhomey
```

**Terminal 3: Commands**
```bash
cd apps/android
# Use for ADB commands during testing
```

---

## ✅ After Testing

1. **Fill out checklist**: `apps/android/MANUAL-TEST-CHECKLIST.md`
2. **Save results**: Create `apps/android/MANUAL-TEST-RESULTS.md` with filled checklist
3. **Report bugs**: Document any issues found
4. **Next steps**:
   - If all pass → Document and create PR
   - If bugs found → Fix critical bugs and re-test

---

## 🎯 Expected Happy Path Flow

1. **Launch app** → HD Homey logo appears
2. **Sign in screen** → Tap "Sign In"
3. **Device code screen** → Shows 6-digit code
4. **Web browser** → Enter code at http://localhost:3000/pairing
5. **Authorize** → Confirm pairing in web UI
6. **Server list** → Shows paired server
7. **Select server** → Tap on server
8. **Tuner list** → Shows available tuners (if multiple)
9. **Channel list** → Shows all channels sorted by number
10. **Select channel** → D-pad down, then CENTER/OK
11. **Video plays** → Fullscreen video with audio
12. **Back button** → Returns to channel list

**If this flow works → Phase 2 is working!** 🎉

---

## 📞 Need Help?

- Check logs: `adb logcat | grep hdhomey`
- Check backend logs: Terminal running `npm run dev`
- Check network: `adb shell ping 192.168.x.x` (your computer's IP)
- Check app permissions: Settings → Apps → HD Homey → Permissions

---

**Ready to test? Start with Step 1!** 🚀
