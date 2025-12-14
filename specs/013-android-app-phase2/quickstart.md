# Phase 2 Quickstart Guide: Manual Testing

**Purpose**: This guide provides manual test scenarios for validating Phase 2 functionality without automated tests.

**Audience**: Developers testing Phase 2 implementation during and after development.

**Scope**: Channel browsing, HLS video playback, favorites integration, error handling.

---

## Prerequisites

### Backend Requirements
✅ **Phase 1 Complete**: Multi-server management and device pairing working  
✅ **HD Homey Server Running**: `npm run dev` or Docker container  
✅ **HDHomeRun Device**: Physical device or emulator with channels scanned  
✅ **Authenticated User**: At least one server paired via device code flow  

### Android App Requirements
✅ **Phase 1 Deployed**: App can manage servers and authenticate  
✅ **Phase 2 Code Built**: Latest code from `013-android-app-phase2` branch  
✅ **Physical Device or Emulator**: Android TV device (API 21+) or emulator with Google TV image  
✅ **Network Access**: Android device can reach HD Homey server (same network or VPN)  

### Test Data Setup
1. **Server with Channels**: 
   - Pair at least one HD Homey server
   - Server must have at least one tuner with scanned channels
   - Verify channels visible in web UI: `https://{server}/tuners/{id}`

2. **Channel Preferences** (Optional):
   - Mark 2-3 channels as favorites in web UI
   - Mark 1-2 channels as hidden in web UI
   - These will test favorites display in Android app

3. **Network Conditions**:
   - Test on both WiFi and mobile data (if applicable)
   - Prepare for poor network simulation (airplane mode toggle)

---

## Test Scenarios

### 1. Channel List Loading

**Goal**: Verify channel list loads and displays correctly.

#### Test 1.1: Initial Channel List Load
**Steps**:
1. Launch app (fresh install or clear app data)
2. Pair server via device code flow (Phase 1)
3. Navigate to **Channel List** screen
4. Observe loading indicator
5. Verify channels appear after loading

**Expected Results**:
- ✅ Loading indicator visible during fetch
- ✅ Channels displayed sorted by guideNumber (2.1, 2.2, 4.1, 4.2, etc.)
- ✅ Each channel shows: guideNumber, guideName, HD badge (if hd=1)
- ✅ No duplicate channels
- ✅ Scroll works smoothly with D-pad

**Actual Results**: _[Fill during test]_

**Screenshot**: _[Optional]_

---

#### Test 1.2: Channel List with Favorites
**Precondition**: Mark 2-3 channels as favorites in web UI

**Steps**:
1. Load channel list
2. Scroll through channels
3. Observe favorite channels

**Expected Results**:
- ✅ Favorite channels marked with ⭐ or visual indicator
- ✅ Favorites appear at top of list (before non-favorites)
- ✅ Non-favorite channels appear after favorites
- ✅ Hidden channels not displayed

**Actual Results**: _[Fill during test]_

---

#### Test 1.3: Channel List Error Handling
**Steps**:
1. Turn off WiFi/network on device
2. Try to load channel list
3. Observe error state
4. Turn on network
5. Retry loading

**Expected Results**:
- ✅ Error message displayed: "Failed to load channels"
- ✅ Retry button or pull-to-refresh available
- ✅ No crash on network error
- ✅ Channels load successfully after network restored

**Actual Results**: _[Fill during test]_

---

### 2. D-Pad Navigation

**Goal**: Verify TV remote D-pad navigation works intuitively.

#### Test 2.1: Channel List Navigation
**Steps**:
1. Load channel list
2. Use D-pad DOWN to navigate through channels
3. Use D-pad UP to navigate backward
4. Press D-pad CENTER/OK on a channel
5. Verify focus indicator visible at all times

**Expected Results**:
- ✅ D-pad DOWN moves focus to next channel
- ✅ D-pad UP moves focus to previous channel
- ✅ Focus indicator clearly visible (border, highlight, scale)
- ✅ Focused channel centered in viewport (auto-scroll)
- ✅ D-pad CENTER/OK opens video player

**Actual Results**: _[Fill during test]_

---

### 3. Video Playback

**Goal**: Verify HLS video streams play correctly.

#### Test 3.1: Basic Playback
**Steps**:
1. Select a channel from list (D-pad CENTER/OK)
2. Observe loading state
3. Wait for video to start playing
4. Verify video plays smoothly for 30 seconds
5. Press BACK button to return to channel list

**Expected Results**:
- ✅ Loading indicator displayed while buffering
- ✅ Video starts playing within 5-10 seconds
- ✅ Audio and video in sync
- ✅ No stuttering or freezing
- ✅ BACK button returns to channel list
- ✅ Playback stops when leaving screen

**Actual Results**: _[Fill during test]_

**Performance Notes**: _[Frame drops, buffering delays, etc.]_

---

#### Test 3.2: Playback Controls
**Steps**:
1. Start playing a channel
2. Press D-pad CENTER/OK to show controls
3. Try PLAY/PAUSE button
4. Observe control overlay timeout (5 seconds)

**Expected Results**:
- ✅ Controls appear on D-pad CENTER/OK
- ✅ PLAY/PAUSE button works (live streams may not support pause)
- ✅ Controls auto-hide after 5 seconds of inactivity
- ✅ D-pad interaction keeps controls visible

**Actual Results**: _[Fill during test]_

**Notes**: Live HLS streams may not support pause/seek. Controls should indicate "Live" status.

---

#### Test 3.3: Multiple Channel Switching
**Steps**:
1. Play channel 2.1 for 10 seconds
2. Press BACK to return to list
3. Select channel 4.1
4. Wait for playback to start
5. Repeat for 2-3 more channels

**Expected Results**:
- ✅ Previous stream stops when returning to list
- ✅ New stream starts within 5-10 seconds
- ✅ No memory leaks (check `adb shell dumpsys meminfo <package>`)
- ✅ App remains responsive after switching
- ✅ No "player already released" crashes

**Actual Results**: _[Fill during test]_

**Memory Usage**:
- Initial: _____ MB
- After 5 switches: _____ MB
- Memory leak: YES / NO

---

### 4. Token Authentication

**Goal**: Verify HMAC stream tokens work correctly.

#### Test 4.1: Token Expiry Handling (15 minutes)
**Precondition**: Requires patience or time manipulation

**Steps**:
1. Start playing a channel
2. Note current time
3. Let stream play for 16 minutes (token expires after 15 min)
4. Observe behavior after expiry

**Expected Results**:
- ✅ Stream continues playing beyond 15 minutes (ExoPlayer may cache segments)
- ✅ If stream stops, error message displayed
- ✅ Retry automatically generates new token
- ✅ No crashes on token expiry

**Actual Results**: _[Fill during test]_

**Note**: ExoPlayer may cache segments, so stream might continue playing even with expired token. This is acceptable behavior.

---

#### Test 4.2: Invalid Token Handling
**Precondition**: Modify backend to return invalid token (or use Postman to test API)

**Steps**:
1. Manually trigger invalid token response from backend
2. Try to play a channel
3. Observe error handling

**Expected Results**:
- ✅ Error message: "Failed to load stream"
- ✅ Retry button available
- ✅ No crash
- ✅ Log error details (Logcat)

**Actual Results**: _[Fill during test]_

---

### 5. JWT Session Management

**Goal**: Verify JWT token (7-day expiry) handled correctly.

#### Test 5.1: JWT Expiry (7 days)
**Precondition**: Requires time travel or waiting 7 days

**Steps**:
1. Pair server and authenticate
2. Wait 7 days (or manipulate system time)
3. Try to load channel list
4. Observe authentication error

**Expected Results**:
- ✅ API returns 401 Unauthorized
- ✅ App shows error: "Session expired. Please sign in again."
- ✅ User redirected to server management screen
- ✅ Re-pairing works correctly

**Actual Results**: _[Fill during test]_

---

### 6. Error Scenarios

**Goal**: Verify graceful error handling across all error types.

#### Test 6.1: Server Unreachable
**Steps**:
1. Pair server successfully
2. Stop HD Homey backend (`docker compose down`)
3. Try to load channel list
4. Observe error state

**Expected Results**:
- ✅ Error message: "Cannot reach server. Check your connection."
- ✅ Retry button or pull-to-refresh available
- ✅ No crash
- ✅ Restart backend and retry works

**Actual Results**: _[Fill during test]_

---

#### Test 6.2: Tuner Deleted/Unavailable
**Steps**:
1. Load channel list for tuner ID 1
2. Delete tuner via web UI
3. Pull-to-refresh channel list in app
4. Observe error

**Expected Results**:
- ✅ Error message: "Tuner not found"
- ✅ User can navigate back to server selection
- ✅ No crash

**Actual Results**: _[Fill during test]_

---

#### Test 6.3: No Channels Available
**Steps**:
1. Add tuner with no scanned channels (or delete all channels)
2. Load channel list
3. Observe empty state

**Expected Results**:
- ✅ Empty state message: "No channels available"
- ✅ Hint to scan channels in web UI
- ✅ No crash or infinite loading

**Actual Results**: _[Fill during test]_

---

### 7. Performance & Stability

**Goal**: Verify app remains stable under load.

#### Test 7.1: Memory Usage
**Steps**:
1. Launch app
2. Check initial memory: `adb shell dumpsys meminfo <package>`
3. Navigate through channels (play 10 different channels)
4. Check memory after: `adb shell dumpsys meminfo <package>`

**Expected Results**:
- ✅ Memory growth < 50 MB after 10 channel switches
- ✅ No OutOfMemory crashes
- ✅ GC activity reasonable (check Logcat)

**Actual Results**:
- Initial memory: _____ MB
- After 10 switches: _____ MB
- Memory growth: _____ MB

---

#### Test 7.2: Cold Start Performance
**Steps**:
1. Force stop app: `adb shell am force-stop <package>`
2. Start app: `adb shell am start -n <package>/.<MainActivity>`
3. Measure time to channel list displayed
4. Use `adb logcat` to check startup time logs

**Expected Results**:
- ✅ App launches within 3 seconds
- ✅ Channel list loads within 5 seconds (with network)
- ✅ No ANR (Application Not Responding) dialogs

**Actual Results**:
- Launch time: _____ seconds
- Channel list load time: _____ seconds

---

### 8. Accessibility

**Goal**: Verify screen readers and accessibility features work.

#### Test 8.1: TalkBack Navigation
**Steps**:
1. Enable TalkBack: Settings > Accessibility > TalkBack
2. Navigate channel list with TalkBack
3. Select a channel
4. Listen to player controls with TalkBack

**Expected Results**:
- ✅ TalkBack announces channel numbers and names
- ✅ Focused channel clearly announced
- ✅ Player controls have content descriptions
- ✅ All interactive elements accessible

**Actual Results**: _[Fill during test]_

---

## Test Results Summary

### Test Session Metadata
- **Date**: _______________
- **Tester**: _______________
- **Device**: _______________ (Model, Android version)
- **App Version**: _______________ (Git commit hash)
- **Backend Version**: _______________ (HD Homey version)

### Pass/Fail Summary
| Test ID | Test Name | Result | Notes |
|---------|-----------|--------|-------|
| 1.1 | Initial Channel List Load | ⬜ PASS / ⬜ FAIL | |
| 1.2 | Channel List with Favorites | ⬜ PASS / ⬜ FAIL | |
| 1.3 | Channel List Error Handling | ⬜ PASS / ⬜ FAIL | |
| 2.1 | Channel List Navigation | ⬜ PASS / ⬜ FAIL | |
| 3.1 | Basic Playback | ⬜ PASS / ⬜ FAIL | |
| 3.2 | Playback Controls | ⬜ PASS / ⬜ FAIL | |
| 3.3 | Multiple Channel Switching | ⬜ PASS / ⬜ FAIL | |
| 4.1 | Token Expiry Handling | ⬜ PASS / ⬜ FAIL | |
| 4.2 | Invalid Token Handling | ⬜ PASS / ⬜ FAIL | |
| 5.1 | JWT Expiry | ⬜ PASS / ⬜ FAIL | |
| 6.1 | Server Unreachable | ⬜ PASS / ⬜ FAIL | |
| 6.2 | Tuner Deleted/Unavailable | ⬜ PASS / ⬜ FAIL | |
| 6.3 | No Channels Available | ⬜ PASS / ⬜ FAIL | |
| 7.1 | Memory Usage | ⬜ PASS / ⬜ FAIL | |
| 7.2 | Cold Start Performance | ⬜ PASS / ⬜ FAIL | |
| 8.1 | TalkBack Navigation | ⬜ PASS / ⬜ FAIL | |

**Total**: _____ PASS / _____ FAIL

### Critical Issues Found
_[List any blocking bugs or critical issues]_

1. 
2. 
3. 

### Non-Critical Issues Found
_[List minor bugs or UX issues]_

1. 
2. 
3. 

### Performance Metrics
- **Average channel load time**: _____ seconds
- **Average stream start time**: _____ seconds
- **Memory growth after 10 switches**: _____ MB
- **App launch time**: _____ seconds

### Recommendations
_[Suggested improvements or fixes]_

1. 
2. 
3. 

---

## Appendix: Testing Tools

### ADB Commands
```bash
# Install APK
adb install -r app/build/outputs/apk/debug/app-debug.apk

# Check memory usage
adb shell dumpsys meminfo <package>

# Force stop app
adb shell am force-stop <package>

# Start app
adb shell am start -n <package>/.<MainActivity>

# View logs (filter by app)
adb logcat | grep <package>

# Simulate poor network
adb shell tc qdisc add dev wlan0 root netem delay 500ms 200ms
```

### Network Conditions
```bash
# Good WiFi: < 50ms latency, > 10 Mbps
# Poor WiFi: 200-500ms latency, 1-5 Mbps
# Mobile Data: 50-150ms latency, 2-10 Mbps
# Offline: No network
```

### Backend API Testing (Postman/curl)
```bash
# Get channels
curl -H "Authorization: Bearer <jwt>" \
  https://{server}/api/tuners/1/channels

# Generate stream token
curl -X POST -H "Authorization: Bearer <jwt>" \
  -H "Content-Type: application/json" \
  -d '{"tunerId": 1, "channelId": 5}' \
  https://{server}/api/stream-token

# Get preferences (once implemented)
curl -H "Authorization: Bearer <jwt>" \
  https://{server}/api/preferences/channels?tunerId=1
```

---

## Notes for Testers

1. **Focus on User Experience**: Test like a real user, not just happy paths.
2. **Document Everything**: Screenshots, logs, and detailed notes help debugging.
3. **Test on Real Devices**: Emulators don't catch all issues (especially video performance).
4. **Check Logcat**: Many issues are silent in UI but logged to Logcat.
5. **Vary Network Conditions**: Poor network reveals buffering and error handling issues.
6. **Test with Multiple Tuners**: Verify app handles multiple tuners/servers gracefully.

---

**Version**: 1.0  
**Last Updated**: December 14, 2025  
**Phase**: Android App Phase 2 Planning
