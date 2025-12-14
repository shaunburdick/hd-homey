# 📋 Android Phase 2 - Manual Test Checklist

**Version**: 1.0  
**Date**: December 14, 2025  
**Branch**: `013-android-app-phase2-impl`  
**Tester**: _______________  

---

## ⚙️ Test Environment Setup

### Before You Start
- [ ] HD Homey backend running (`npm run dev` in `apps/web/`)
- [ ] Backend merged: `git merge origin/013-android-app-phase2-backend`
- [ ] Android app installed (Android Studio or `./gradlew installDebug`)
- [ ] At least 1 tuner with scanned channels in HD Homey
- [ ] Device connected (emulator or physical Android TV device)

### Environment Details
```
Device: ___________________________ (e.g., Pixel 7, Android TV Emulator)
Android Version: __________________ (e.g., 13, TV API 33)
HD Homey Version: _________________ (e.g., v1.0.0-beta.5)
Network: __________________________ (WiFi / 5G / Ethernet)
App Build: ________________________ (git commit hash)
```

---

## 🎯 Priority Test Scenarios (30 minutes)

### ✅ Critical Path (Must Pass)

#### 1. Happy Path Flow (10 min)
- [ ] **1.1** Launch app successfully (no crash)
- [ ] **1.2** Sign in via device code flow works
- [ ] **1.3** Select server from list
- [ ] **1.4** Channel list loads (within 5 seconds)
- [ ] **1.5** Channels display correctly (number, name, HD badge)
- [ ] **1.6** Select a channel with D-pad CENTER/OK
- [ ] **1.7** Video player opens in fullscreen
- [ ] **1.8** Video starts playing within 10 seconds
- [ ] **1.9** Audio and video are in sync
- [ ] **1.10** BACK button returns to channel list
- [ ] **1.11** Video playback stops when exiting player

**Result**: ⬜ PASS / ⬜ FAIL  
**Notes**: _______________________________________________

---

#### 2. D-Pad Navigation (5 min)
- [ ] **2.1** D-pad UP/DOWN navigates through channels
- [ ] **2.2** Focus indicator clearly visible on selected channel
- [ ] **2.3** Focused channel auto-scrolls to center of screen
- [ ] **2.4** D-pad CENTER/OK selects channel
- [ ] **2.5** Navigation feels smooth and responsive

**Result**: ⬜ PASS / ⬜ FAIL  
**Notes**: _______________________________________________

---

#### 3. Error Handling (5 min)
- [ ] **3.1** Enable airplane mode → Network error displays
- [ ] **3.2** Error message user-friendly (no stack traces)
- [ ] **3.3** Retry button visible
- [ ] **3.4** Disable airplane mode → Retry works
- [ ] **3.5** Channels load successfully after retry

**Result**: ⬜ PASS / ⬜ FAIL  
**Notes**: _______________________________________________

---

#### 4. Multiple Channel Switching (5 min)
- [ ] **4.1** Play channel 2.1 for 10 seconds
- [ ] **4.2** BACK to channel list
- [ ] **4.3** Select channel 4.1
- [ ] **4.4** New stream starts within 10 seconds
- [ ] **4.5** Repeat for 3-5 more channels
- [ ] **4.6** No crashes or "player already released" errors
- [ ] **4.7** App remains responsive

**Result**: ⬜ PASS / ⬜ FAIL  
**Notes**: _______________________________________________

---

#### 5. Memory & Performance (5 min)

##### Check Memory Before:
```bash
adb shell dumpsys meminfo com.hdhomey.app | grep "TOTAL:"
```
**Initial Memory**: __________ MB

##### Test Steps:
- [ ] **5.1** Play 10 different channels (10 seconds each)
- [ ] **5.2** Return to channel list after each
- [ ] **5.3** App doesn't slow down or lag

##### Check Memory After:
```bash
adb shell dumpsys meminfo com.hdhomey.app | grep "TOTAL:"
```
**Final Memory**: __________ MB  
**Memory Growth**: __________ MB (should be < 50 MB)

**Result**: ⬜ PASS / ⬜ FAIL  
**Notes**: _______________________________________________

---

## 🔍 Extended Test Scenarios (Optional - 30 minutes)

### 6. Preferences & Favorites (if backend API ready)
- [ ] **6.1** Mark 2 channels as favorites in web UI
- [ ] **6.2** Refresh channel list in Android app
- [ ] **6.3** Favorite channels show ⭐ indicator
- [ ] **6.4** Favorites appear at top of list
- [ ] **6.5** Mark 1 channel as hidden in web UI
- [ ] **6.6** Refresh channel list
- [ ] **6.7** Hidden channel not visible in list

**Result**: ⬜ PASS / ⬜ FAIL / ⬜ SKIPPED (API not ready)  
**Notes**: _______________________________________________

---

### 7. Edge Cases
- [ ] **7.1** Empty channel list shows "No channels found"
- [ ] **7.2** Very long channel name displays correctly (no truncation issues)
- [ ] **7.3** Channel with special characters in name displays correctly
- [ ] **7.4** Tuner deleted → "Tuner not found" error (friendly message)

**Result**: ⬜ PASS / ⬜ FAIL  
**Notes**: _______________________________________________

---

### 8. Authentication & Sessions
- [ ] **8.1** Stop backend server → "Cannot reach server" error
- [ ] **8.2** Restart backend → Retry works
- [ ] **8.3** Simulate 401 error → "Session expired" message
- [ ] **8.4** User redirected to sign-in screen

**Result**: ⬜ PASS / ⬜ FAIL  
**Notes**: _______________________________________________

---

### 9. Video Playback Quality
- [ ] **9.1** HD channels display in HD quality
- [ ] **9.2** No stuttering or frame drops during playback
- [ ] **9.3** Audio doesn't drift out of sync after 5 minutes
- [ ] **9.4** Buffering indicator shows when network slow
- [ ] **9.5** Video resumes smoothly after buffer

**Result**: ⬜ PASS / ⬜ FAIL  
**Notes**: _______________________________________________

---

### 10. Player Controls (if implemented)
- [ ] **10.1** D-pad CENTER/OK shows player controls
- [ ] **10.2** Controls auto-hide after 5 seconds
- [ ] **10.3** Play/Pause button visible (may not work for live streams)
- [ ] **10.4** "Live" indicator visible for live streams

**Result**: ⬜ PASS / ⬜ FAIL / ⬜ SKIPPED (not in Phase 2)  
**Notes**: _______________________________________________

---

## 🐛 Bugs & Issues Found

### Critical Bugs (Blocks Release)
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### High Priority (Should Fix)
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

### Low Priority (Nice to Have)
1. _______________________________________________
2. _______________________________________________
3. _______________________________________________

---

## 📊 Performance Metrics

| Metric | Target | Actual | Pass/Fail |
|--------|--------|--------|-----------|
| Channel list load time | < 5s | _____ s | ⬜ |
| Video start time | < 10s | _____ s | ⬜ |
| Memory growth (10 switches) | < 50 MB | _____ MB | ⬜ |
| App launch time (cold start) | < 3s | _____ s | ⬜ |
| D-pad response time | < 100ms | Feels: _____ | ⬜ |

---

## 📝 Test Summary

### Overall Results
- **Total Tests Run**: _____ / 50
- **Passed**: _____
- **Failed**: _____
- **Skipped**: _____

### Critical Path Status
- ⬜ **READY TO MERGE** - All critical tests pass
- ⬜ **NEEDS FIXES** - Critical bugs found, see above
- ⬜ **BLOCKED** - Cannot test (environment/backend issues)

### Recommendation
- [ ] **Merge Phase 2** - All tests pass, ready for production
- [ ] **Fix bugs first** - Critical issues need resolution
- [ ] **More testing needed** - Not enough coverage

### Tester Comments
```
_______________________________________________
_______________________________________________
_______________________________________________
_______________________________________________
```

---

## 🔧 Quick Reference: ADB Commands

```bash
# Install app
./gradlew installDebug
# or
adb install -r apps/android/app/build/outputs/apk/debug/app-debug.apk

# Check memory
adb shell dumpsys meminfo com.hdhomey.app | grep "TOTAL:"

# View logs (filter app only)
adb logcat | grep "hdhomey"

# Force stop app
adb shell am force-stop com.hdhomey.app

# Start app
adb shell am start -n com.hdhomey.app/.ui.main.MainActivity

# Clear app data (fresh start)
adb shell pm clear com.hdhomey.app

# Take screenshot
adb shell screencap /sdcard/screenshot.png
adb pull /sdcard/screenshot.png
```

---

## 🚀 Next Steps After Testing

1. **If all tests pass**:
   - Create `MANUAL-TEST-RESULTS.md` with this checklist filled out
   - Run final verification: `./gradlew test` and `./gradlew lint`
   - Update documentation (README, PHASE2-COMPLETE.md)
   - Create PR for Phase 2

2. **If bugs found**:
   - Document bugs in detail (steps to reproduce, logs, screenshots)
   - Prioritize critical bugs
   - Fix critical bugs first
   - Re-test after fixes
   - Repeat until all critical tests pass

3. **If blocked**:
   - Document blockers (backend issues, environment problems)
   - Resolve blockers first
   - Resume testing

---

**Testing Started**: _______________  
**Testing Completed**: _______________  
**Total Time**: _______________  

**Sign-off**: _______________ (Tester Name & Date)
