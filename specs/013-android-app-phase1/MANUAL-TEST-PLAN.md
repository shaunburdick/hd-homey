# Phase 1.5A & 1.5B Manual Test Plan

**Date**: December 13, 2025  
**APK Location**: `apps/android/app/build/outputs/apk/debug/app-debug.apk`  
**APK Size**: 21MB  
**Version**: Phase 1.5 (with Critical & High Priority fixes)

## Setup

### Option 1: Android Emulator (Recommended)
```bash
# Start Android Studio
# Tools → Device Manager → Create Device
# Select: TV (1080p) or Phone (Pixel 6)
# System Image: Android 13 (API 33) or higher
# Launch emulator

# Install APK
cd /Users/shaun.burdick/github/shaunburdick/hd-homey/apps/android
./gradlew installDebug

# Or manually:
adb install app/build/outputs/apk/debug/app-debug.apk
```

### Option 2: Physical Device
```bash
# Enable Developer Mode on device
# Settings → About → Tap Build Number 7 times

# Enable USB Debugging
# Settings → Developer Options → USB Debugging

# Connect device via USB
adb devices  # Verify device appears

# Install APK
cd /Users/shaun.burdick/github/shaunburdick/hd-homey/apps/android
./gradlew installDebug
```

### Prerequisites
- **HD Homey server must be running** (web app)
- Server URL: `http://192.168.1.X:3000` or `http://10.0.2.2:3000` (emulator localhost alias)
- At least one user account created on server

---

## Test Scenarios

### 🔴 Critical: Phase 1.5A Tests

#### Test 1: Authentication Retry (Code Expiration)
**Feature**: Users can retry after code expires  
**Commit**: `b64c539`

**Steps**:
1. Launch app
2. Tap "Add Server"
3. Enter name: "Test Server"
4. Enter URL: `http://10.0.2.2:3000` (or your server IP)
5. Tap "Connect"
6. ✅ **Verify**: Health check succeeds, navigates to auth screen
7. ✅ **Verify**: Device code displayed (e.g., "ABCD12")
8. ✅ **Verify**: Countdown timer starts (e.g., "Code expires in 4:59")
9. ✅ **Verify**: "Cancel" button visible at bottom
10. **WAIT 5 MINUTES** (or mock expiration)
11. ✅ **Verify**: Countdown reaches 0:00
12. ✅ **Verify**: Error message: "Code expired. Click 'Try Again' to generate a new code."
13. ✅ **Verify**: "Try Again" and "Cancel" buttons visible
14. Tap "Try Again"
15. ✅ **Verify**: New device code generated
16. ✅ **Verify**: Countdown resets to 5:00
17. ✅ **Verify**: Error message cleared

**Expected Results**:
- ✅ Code expiration handled gracefully
- ✅ Retry generates new code without leaving screen
- ✅ Cancel button available throughout

---

#### Test 2: Authentication Cancel
**Feature**: Users can cancel authentication mid-flow  
**Commit**: `b64c539`

**Steps**:
1. From server list, tap existing server (or add new one)
2. Device code displays
3. ✅ **Verify**: "Cancel" button visible at bottom
4. Tap "Cancel" (do NOT authorize on web)
5. ✅ **Verify**: Navigates back to server list
6. ✅ **Verify**: Polling stopped (no background activity)
7. ✅ **Verify**: Server still in list (not authenticated)

**Expected Results**:
- ✅ Cancel returns to server list immediately
- ✅ Server remains in list but not authenticated
- ✅ No crashes or background polling

---

#### Test 3: Authentication Network Error
**Feature**: Users can retry after network errors  
**Commit**: `b64c539` + `8ee6263`

**Steps**:
1. From server list, tap server
2. **ENABLE AIRPLANE MODE** on device
3. Wait for error
4. ✅ **Verify**: Error message displayed (e.g., "Lost connection while checking authorization. Your network might be unstable. Try again.")
5. ✅ **Verify**: "Try Again" and "Cancel" buttons visible
6. ✅ **Verify**: Device code still visible (not replaced with "ERROR")
7. **DISABLE AIRPLANE MODE**
8. Tap "Try Again"
9. ✅ **Verify**: New code generated successfully
10. ✅ **Verify**: Error cleared

**Expected Results**:
- ✅ Network errors show helpful message
- ✅ Device code preserved on error
- ✅ Retry recovers after network restored

---

#### Test 4: Server Delete via Swipe
**Feature**: Users can delete servers by swiping  
**Commit**: `9bc9cbb`

**Steps**:
1. Add 2-3 servers to list
2. Swipe LEFT on middle server
3. ✅ **Verify**: Confirmation dialog appears
4. ✅ **Verify**: Dialog shows server name
5. ✅ **Verify**: Dialog warns about auth data deletion
6. Tap "Cancel"
7. ✅ **Verify**: Server remains in list (not deleted)
8. Swipe RIGHT on same server
9. ✅ **Verify**: Confirmation dialog appears again
10. Tap "Delete"
11. ✅ **Verify**: Server removed from list
12. ✅ **Verify**: Smooth animation (no flash)

**Expected Results**:
- ✅ Swipe left or right triggers delete
- ✅ Confirmation dialog shows before deletion
- ✅ Cancel preserves server
- ✅ Delete removes server permanently

---

#### Test 5: Server Delete via Context Menu
**Feature**: Users can delete servers via long-press menu  
**Commit**: `9bc9cbb`

**Steps**:
1. Add 2-3 servers to list
2. **LONG PRESS** on a server (hold for 1 second)
3. ✅ **Verify**: Context menu appears with "Edit" and "Delete"
4. Tap "Delete"
5. ✅ **Verify**: Confirmation dialog appears
6. Tap "Delete"
7. ✅ **Verify**: Server removed from list

**Alternative Path**:
1. Long-press on server
2. Tap outside menu (dismiss)
3. ✅ **Verify**: Menu closes, no action taken

**Expected Results**:
- ✅ Long-press shows context menu
- ✅ Edit option visible (currently placeholder)
- ✅ Delete works same as swipe
- ✅ Menu dismisses on tap outside

---

#### Test 6: Health Check Retry
**Feature**: Users can retry failed health checks  
**Commit**: `ab822f7` + `8ee6263`

**Steps**:
1. Tap "Add Server"
2. Enter name: "Bad Server"
3. Enter URL: `http://192.168.1.999:3000` (invalid IP)
4. Tap "Connect"
5. ✅ **Verify**: Loading indicator appears
6. Wait for timeout (~5 seconds)
7. ✅ **Verify**: Error message: "Cannot reach server. Check the URL and your network connection, then try again." (or similar)
8. ✅ **Verify**: Button text changed to "Try Again"
9. ✅ **Verify**: Name and URL fields preserved (not cleared)
10. Edit URL to valid server: `http://10.0.2.2:3000`
11. Tap "Try Again"
12. ✅ **Verify**: Health check runs again
13. ✅ **Verify**: Button text back to "Connect"
14. ✅ **Verify**: Success → navigates to auth screen

**Expected Results**:
- ✅ Health check errors show helpful message
- ✅ Button changes to "Try Again"
- ✅ Form data preserved on retry
- ✅ Retry works without re-entering data

---

### 🟡 High Priority: Phase 1.5B Tests

#### Test 7: Error Message Clarity
**Feature**: Error messages are actionable and specific  
**Commit**: `8ee6263`

**Test Cases**:

**7a. Connection Timeout**:
1. Add server with very slow/unresponsive URL
2. Wait for timeout
3. ✅ **Verify**: Error mentions "timed out" and suggests server might be slow

**7b. Invalid Hostname**:
1. Add server with URL: `http://invalid-hostname-123:3000`
2. Tap Connect
3. ✅ **Verify**: Error mentions "Cannot find server" or "Unknown host"
4. ✅ **Verify**: Error suggests checking URL

**7c. Network Disconnect**:
1. Start adding server
2. Enable airplane mode before health check completes
3. ✅ **Verify**: Error mentions network/WiFi/mobile data
4. ✅ **Verify**: Error suggests checking connection

**Expected Results**:
- ✅ Each error type has specific message
- ✅ All messages explain WHAT happened
- ✅ All messages suggest WHAT TO DO
- ✅ No technical jargon (DNS, HTTP codes, etc.)

---

#### Test 8: Authentication Loading Status
**Feature**: Clear feedback at every authentication stage  
**Commit**: `0b8906c`

**Steps**:
1. Add server and start authentication
2. ✅ **Verify**: "Connecting to server..." appears with spinner
3. ✅ **Verify**: Status changes to "Generating device code..." with spinner
4. Wait for code to generate
5. ✅ **Verify**: Status changes to "Waiting for authorization..." WITHOUT spinner
6. ✅ **Verify**: Device code visible
7. ✅ **Verify**: Countdown timer visible
8. Go to server web UI and authorize the code
9. ✅ **Verify**: Status changes to "Authorization successful!" (brief)
10. ✅ **Verify**: Navigates to success screen

**Expected Results**:
- ✅ Status visible at every stage
- ✅ Spinner during connecting and generating
- ✅ No spinner during polling (subtle feedback)
- ✅ Success message before navigation
- ✅ Users always know what's happening

---

#### Test 9: URL Validation Debouncing
**Feature**: Validation doesn't interrupt typing  
**Commit**: `a166bb2`

**Steps**:
1. Tap "Add Server"
2. Focus on URL field
3. Type slowly: "1" → pause → "9" → pause → "2"
4. ✅ **Verify**: NO error appears while typing
5. Type: "192.168.1.100:3000" (no http://)
6. Wait 500ms (pause typing)
7. ✅ **Verify**: Error appears: "Invalid URL format..." OR auto-prepends http://
8. Clear field
9. Type: "http://192.168.1.100:3000"
10. Wait 500ms
11. ✅ **Verify**: No error (valid URL)
12. Tap outside field (blur/lose focus)
13. ✅ **Verify**: Validation runs immediately (no 500ms delay)

**Expected Results**:
- ✅ No errors while typing
- ✅ Validation after 500ms pause
- ✅ Immediate validation on blur
- ✅ Smooth typing experience

---

#### Test 10: URL Hints and Helpers
**Feature**: Clear guidance on URL format  
**Commit**: `a166bb2`

**Steps**:
1. Tap "Add Server"
2. Observe URL field (don't type yet)
3. ✅ **Verify**: Hint text shows example: "http://192.168.1.100:3000"
4. ✅ **Verify**: Helper text below shows: "Enter your HD Homey server URL (include http:// or https://)"
5. Start typing
6. ✅ **Verify**: Hint disappears as you type (normal behavior)
7. Clear field
8. ✅ **Verify**: Hint reappears

**Expected Results**:
- ✅ Hint provides example format
- ✅ Helper text explains requirements
- ✅ Users know exactly what to enter

---

## Additional Tests (Regression)

### Test 11: Server List Empty State
**Feature**: Friendly empty state when no servers  

**Steps**:
1. Delete all servers (swipe to delete each)
2. ✅ **Verify**: Empty state message visible
3. ✅ **Verify**: "Add Server" button prominent
4. Tap "Add Server"
5. ✅ **Verify**: Navigates to add server screen

---

### Test 12: Multiple Server Management
**Feature**: Add and manage multiple servers  

**Steps**:
1. Add server: "Home" (your home network IP)
2. Add server: "Office" (different IP)
3. Add server: "Localhost" (10.0.2.2:3000 for emulator)
4. ✅ **Verify**: All 3 servers visible in list
5. Authenticate to "Home" server
6. ✅ **Verify**: "Home" shows "● Authenticated"
7. ✅ **Verify**: Other servers show "● Not Authenticated"
8. Delete "Office" server
9. ✅ **Verify**: Only "Home" and "Localhost" remain
10. Tap "Localhost"
11. ✅ **Verify**: Starts authentication for correct server

---

### Test 13: Successful Authentication Flow (End-to-End)
**Feature**: Complete happy path  

**Steps**:
1. Add server with valid URL
2. Health check succeeds
3. Device code generates (e.g., "ABCD12")
4. Open browser to server URL + `/get-started`
5. Enter device code from app
6. Click "Authorize"
7. ✅ **Verify**: App shows "Authorization successful!"
8. ✅ **Verify**: Navigates to success screen
9. ✅ **Verify**: Success message shows username and role
10. ✅ **Verify**: "Back to Servers" button visible
11. Tap "Back to Servers"
12. ✅ **Verify**: Returns to server list
13. ✅ **Verify**: Server shows "● Authenticated"

---

## Test Results Template

Copy this template to record your results:

```markdown
## Test Results - Phase 1.5A & 1.5B

**Tester**: [Your Name]  
**Date**: December 13, 2025  
**Device**: [Emulator/Physical Device Name]  
**Android Version**: [e.g., Android 13]  
**Server URL**: [e.g., http://10.0.2.2:3000]

### Test 1: Authentication Retry (Code Expiration)
- [ ] Code displays correctly
- [ ] Countdown works
- [ ] Code expires after 5 minutes
- [ ] Error message clear
- [ ] Retry button appears
- [ ] Retry generates new code
- **Status**: PASS / FAIL / BLOCKED
- **Notes**: 

### Test 2: Authentication Cancel
- [ ] Cancel button visible
- [ ] Cancel returns to server list
- [ ] Polling stops
- **Status**: PASS / FAIL / BLOCKED
- **Notes**: 

### Test 3: Authentication Network Error
- [ ] Error message helpful
- [ ] Device code preserved
- [ ] Retry works after network restored
- **Status**: PASS / FAIL / BLOCKED
- **Notes**: 

### Test 4: Server Delete via Swipe
- [ ] Swipe left works
- [ ] Swipe right works
- [ ] Confirmation dialog appears
- [ ] Cancel preserves server
- [ ] Delete removes server
- **Status**: PASS / FAIL / BLOCKED
- **Notes**: 

### Test 5: Server Delete via Context Menu
- [ ] Long-press shows menu
- [ ] Delete works
- [ ] Menu dismisses correctly
- **Status**: PASS / FAIL / BLOCKED
- **Notes**: 

### Test 6: Health Check Retry
- [ ] Error message clear
- [ ] Button changes to "Try Again"
- [ ] Form data preserved
- [ ] Retry works
- **Status**: PASS / FAIL / BLOCKED
- **Notes**: 

### Test 7: Error Message Clarity
- [ ] Timeout error specific
- [ ] Invalid hostname error clear
- [ ] Network error actionable
- **Status**: PASS / FAIL / BLOCKED
- **Notes**: 

### Test 8: Authentication Loading Status
- [ ] "Connecting..." appears
- [ ] "Generating code..." appears
- [ ] "Waiting for authorization..." appears
- [ ] "Authorization successful!" appears
- **Status**: PASS / FAIL / BLOCKED
- **Notes**: 

### Test 9: URL Validation Debouncing
- [ ] No errors while typing
- [ ] Validation after 500ms
- [ ] Immediate validation on blur
- **Status**: PASS / FAIL / BLOCKED
- **Notes**: 

### Test 10: URL Hints and Helpers
- [ ] Hint shows example
- [ ] Helper text clear
- **Status**: PASS / FAIL / BLOCKED
- **Notes**: 

### Additional Tests
- [ ] Test 11: Empty state
- [ ] Test 12: Multiple servers
- [ ] Test 13: End-to-end flow

### Overall Summary
- **Total Tests**: 13
- **Passed**: 
- **Failed**: 
- **Blocked**: 
- **Critical Issues Found**: 
- **Minor Issues Found**: 
- **Recommendations**: 
```

---

## Known Limitations

1. **Edit Server**: Context menu shows "Edit" but it's not implemented yet (placeholder)
2. **Code Expiration**: Currently 5 minutes - can't be changed without server modification
3. **Auto-retry**: No automatic retry on transient network errors (must click "Try Again")
4. **Offline Detection**: App doesn't pre-detect airplane mode (waits for timeout)

---

## Success Criteria

**Phase 1.5A (Critical)**:
- ✅ All authentication error states have recovery options
- ✅ Users can cancel authentication at any time
- ✅ Users can delete servers from list
- ✅ Health check failures can be retried

**Phase 1.5B (High Priority)**:
- ✅ All error messages are clear and actionable
- ✅ Loading status visible at every authentication stage
- ✅ URL validation doesn't interrupt typing

**Overall**:
- ✅ No crashes during normal use
- ✅ No "dead-ends" where users get stuck
- ✅ All user actions have clear feedback
- ✅ App feels responsive and polished

---

## Reporting Issues

If you find bugs, create issues with:
1. **Title**: Brief description (e.g., "Retry button doesn't appear after code expiration")
2. **Steps to Reproduce**: Exact steps taken
3. **Expected Result**: What should happen
4. **Actual Result**: What actually happened
5. **Device Info**: Emulator or physical device, Android version
6. **Screenshot/Video**: If applicable

**Example Issue**:
```
Title: Swipe delete doesn't work on first server in list

Steps:
1. Add 3 servers
2. Swipe LEFT on first server
3. Nothing happens

Expected: Confirmation dialog should appear
Actual: No dialog, server stays in list
Device: Pixel 6 Emulator, Android 13
```

---

## Quick Start Script

```bash
# Start emulator (if not running)
# Android Studio → Device Manager → Launch

# Install APK
cd /Users/shaun.burdick/github/shaunburdick/hd-homey/apps/android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
./gradlew installDebug

# Or via ADB
adb install app/build/outputs/apk/debug/app-debug.apk

# Launch app
adb shell am start -n com.hdhomey.app/.MainActivity

# View logs (helpful for debugging)
adb logcat | grep "HdHomey"
```

---

**Ready to test!** 🚀 Follow the test scenarios above and record your results. Good luck!
