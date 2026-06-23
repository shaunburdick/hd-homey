# HD Homey Android TV App - Manual Test Guide

**Phase 1: Multi-Server Management & Device Pairing**  
**Version**: 1.0.0-beta.6  
**Last Updated**: December 13, 2025

This guide provides step-by-step instructions for manually testing the HD Homey Android TV app's Phase 1 features.

---

## Prerequisites

### Required Setup
1. **HD Homey Server Running**
   - Web app must be accessible on your network
   - At least one user account created
   - Server URL example: `http://192.168.1.100:3000`

2. **Android Device/Emulator**
   - Android 12+ (API 31+)
   - Android TV, phone, or tablet
   - Developer mode enabled (for physical devices)

3. **APK Installed**
   ```bash
   cd /Users/shaun.burdick/github/shaunburdick/hd-homey/apps/android
   export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
   ./gradlew installDebug
   ```

---

## Quick Start Testing Checklist

**Essential Happy Path** (5 minutes):
- [ ] Add a server successfully
- [ ] Complete device pairing with valid code
- [ ] View authenticated server in list
- [ ] Delete a server

**Comprehensive Testing** (30-45 minutes):
- [ ] Test all scenarios below
- [ ] Verify error handling
- [ ] Check UI polish (animations, loading states)
- [ ] Test D-pad navigation (TV devices)

---

## Test Scenarios

### 1. Multi-Server Management

#### 1.1 Add First Server (Happy Path)
**What you're testing**: Basic server addition flow

**Steps**:
1. Launch app (first time)
2. Observe empty state screen
   - ✅ Welcome message visible
   - ✅ "Add Server" button prominent
3. Tap "Add Server"
4. Enter server name: "Home Server"
5. Enter server URL: `http://192.168.1.100:3000` (use your server IP)
6. Tap "Connect"
7. Wait for health check (2-3 seconds)
   - ✅ Loading indicator visible
   - ✅ Button shows "Connecting..."
8. Health check succeeds
   - ✅ Navigates to authentication screen
   - ✅ Device code displayed (e.g., "ABCD12")
   - ✅ Countdown timer starts (e.g., "Code expires in 4:59")

**Expected Result**: Server added and authentication screen appears

---

#### 1.2 Add Multiple Servers
**What you're testing**: Managing multiple server configurations

**Steps**:
1. From server list, tap "Add Server"
2. Add second server: "Office", `http://192.168.2.50:3000`
3. Add third server: "Test", `http://10.0.2.2:3000` (emulator)
4. Return to server list
   - ✅ All 3 servers visible
   - ✅ Each shows "● Not Authenticated" status
   - ✅ Server names and URLs match input

**Expected Result**: Multiple servers listed correctly

---

#### 1.3 Delete Server (Swipe Gesture)
**What you're testing**: Swipe-to-delete interaction

**Steps**:
1. In server list, swipe LEFT on a server
   - ✅ Confirmation dialog appears
   - ✅ Dialog shows server name
   - ✅ Dialog warns about auth data deletion
2. Tap "Cancel"
   - ✅ Dialog dismisses
   - ✅ Server remains in list
3. Swipe RIGHT on same server
   - ✅ Dialog appears again
4. Tap "Delete"
   - ✅ Server removed from list
   - ✅ Smooth fade-out animation

**Expected Result**: Swipe gestures work, confirmation prevents accidental deletion

---

#### 1.4 Delete Server (Context Menu)
**What you're testing**: Long-press context menu

**Steps**:
1. LONG PRESS on a server (hold ~1 second)
   - ✅ Context menu appears
   - ✅ "Edit" option visible (disabled/placeholder)
   - ✅ "Delete" option visible
2. Tap "Delete"
   - ✅ Confirmation dialog appears
3. Tap "Delete"
   - ✅ Server removed

**Alternative**:
- Long press, tap outside menu
- ✅ Menu dismisses without action

**Expected Result**: Context menu provides alternative deletion method

---

### 2. Device Pairing (OAuth 2.0 Device Code Flow)

#### 2.1 Successful Authorization (Happy Path)
**What you're testing**: Complete end-to-end authentication

**Steps**:
1. Add server (or tap unauthenticated server)
2. Authentication screen appears
   - ✅ Device code visible (6 characters, uppercase)
   - ✅ Countdown timer: "Code expires in 4:59"
   - ✅ Status: "Waiting for authorization..."
   - ✅ "Cancel" button at bottom
3. Open browser to server URL + `/get-started`
4. Enter device code from app
5. Click "Authorize" in browser
6. Return to app (1-2 seconds)
   - ✅ Status changes to "Authorization successful!"
   - ✅ Navigates to success screen
   - ✅ Success message shows username and role
   - ✅ Checkmark animation plays
7. Tap "Back to Servers"
   - ✅ Server shows "● Authenticated"

**Expected Result**: Seamless pairing with clear feedback

---

#### 2.2 Code Expiration & Retry
**What you're testing**: Handling expired device codes

**Steps**:
1. Start authentication
2. Device code appears with countdown
3. **WAIT 5 MINUTES** (or until timer reaches 0:00)
   - ✅ Countdown reaches "Code expires in 0:00"
   - ✅ Error message appears: "Code expired. Click 'Try Again' to generate a new code."
   - ✅ "Try Again" button appears
   - ✅ "Cancel" button still visible
4. Tap "Try Again"
   - ✅ New device code generated
   - ✅ Countdown resets to 5:00
   - ✅ Error message cleared
5. Complete authorization with new code
   - ✅ Authentication succeeds

**Expected Result**: Expired codes can be regenerated without restarting flow

---

#### 2.3 Cancel Authentication
**What you're testing**: User can abort pairing mid-flow

**Steps**:
1. Start authentication (device code appears)
2. Countdown running
3. Tap "Cancel" (do NOT authorize in browser)
   - ✅ Navigates back to server list immediately
   - ✅ Server remains in list (not authenticated)
   - ✅ No background activity (polling stopped)

**Expected Result**: Clean cancellation without side effects

---

#### 2.4 Network Error During Polling
**What you're testing**: Network resilience during authorization

**Steps**:
1. Start authentication (device code appears)
2. **ENABLE AIRPLANE MODE** on device
3. Wait 5-10 seconds
   - ✅ Error message appears: "Lost connection while checking authorization. Your network might be unstable. Try again."
   - ✅ Device code still visible (not replaced with "ERROR")
   - ✅ "Try Again" and "Cancel" buttons visible
4. **DISABLE AIRPLANE MODE**
5. Tap "Try Again"
   - ✅ New code generated
   - ✅ Error cleared
   - ✅ Polling resumes

**Expected Result**: Network errors are recoverable

---

### 3. Error Handling

#### 3.1 Invalid Server URL
**What you're testing**: URL validation and error messages

**Steps**:
1. Tap "Add Server"
2. Enter name: "Bad Server"
3. Enter URL: `http://192.168.1.999:3000` (invalid IP)
4. Tap "Connect"
   - ✅ Loading indicator appears
5. Wait for timeout (~5 seconds)
   - ✅ Error message: "Cannot reach server. Check the URL and your network connection, then try again."
   - ✅ Button changes to "Try Again"
   - ✅ Name and URL fields preserved
6. Edit URL to valid server
7. Tap "Try Again"
   - ✅ Health check runs again
   - ✅ Success → navigates to auth screen

**Expected Result**: Clear error messages with retry capability

---

#### 3.2 URL Validation (Real-Time)
**What you're testing**: Input validation doesn't interrupt typing

**Steps**:
1. Tap "Add Server"
2. Focus on URL field
   - ✅ Hint text: "http://192.168.1.100:3000"
   - ✅ Helper text: "Enter your HD Homey server URL (include http:// or https://)"
3. Type slowly: "1" → pause → "9" → pause → "2"
   - ✅ No error while typing
4. Type: "192.168.1.100:3000" (no http://)
5. Wait 500ms (stop typing)
   - ✅ Error appears OR auto-prepends http://
6. Clear field, type: "http://192.168.1.100:3000"
7. Wait 500ms
   - ✅ No error (valid URL)

**Expected Result**: Validation debounced, doesn't interrupt typing

---

### 4. UI Polish & Accessibility

#### 4.1 Loading States
**What you're testing**: User feedback during async operations

**Steps**:
1. Add server → health check
   - ✅ "Connecting to server..." with spinner
2. Health check succeeds → auth start
   - ✅ "Generating device code..." with spinner
3. Code generated
   - ✅ "Waiting for authorization..." WITHOUT spinner
   - ✅ Device code visible
   - ✅ Countdown timer running
4. Authorize in browser
   - ✅ "Authorization successful!" (brief)
5. Navigate to success screen
   - ✅ Checkmark animation

**Expected Result**: Clear feedback at every step

---

#### 4.2 Animations & Transitions
**What you're testing**: Visual polish

**Observe**:
- ✅ Server list items fade in smoothly
- ✅ Delete animations smooth (no flash)
- ✅ Screen transitions natural (not instant)
- ✅ Success screen checkmark animates
- ✅ Shimmer loading effect on server list (if slow load)

**Expected Result**: Professional, polished feel

---

#### 4.3 D-Pad Navigation (Android TV)
**What you're testing**: TV remote control support

**Steps**:
1. Use TV remote D-pad (up/down/left/right)
2. Navigate through server list
   - ✅ Focus highlights clearly visible
   - ✅ Up/down moves between servers
   - ✅ Center button = select server
3. In forms (Add Server):
   - ✅ Tab between fields with D-pad
   - ✅ Focus indicators clear
4. In dialogs:
   - ✅ Can navigate to Cancel/Confirm buttons
   - ✅ Back button dismisses dialog

**Expected Result**: Full remote control support, no need for mouse/touch

---

## Test Results Template

Use this checklist to record your testing:

```markdown
## Test Results - Phase 1

**Tester**: [Your Name]  
**Date**: [Date]  
**Device**: [Emulator/Physical/TV]  
**Android Version**: [e.g., Android 13]  
**Server URL**: [e.g., http://192.168.1.100:3000]

### Multi-Server Management
- [ ] 1.1: Add first server (happy path)
- [ ] 1.2: Add multiple servers
- [ ] 1.3: Delete server (swipe)
- [ ] 1.4: Delete server (context menu)

### Device Pairing
- [ ] 2.1: Successful authorization
- [ ] 2.2: Code expiration & retry
- [ ] 2.3: Cancel authentication
- [ ] 2.4: Network error during polling

### Error Handling
- [ ] 3.1: Invalid server URL
- [ ] 3.2: URL validation (real-time)

### UI Polish & Accessibility
- [ ] 4.1: Loading states
- [ ] 4.2: Animations & transitions
- [ ] 4.3: D-pad navigation (TV only)

### Summary
- **Total Tests**: 11
- **Passed**: __
- **Failed**: __
- **Critical Issues**: 
- **Minor Issues**: 
- **Notes**: 
```

---

## Known Limitations (Phase 1)

1. **Edit Server**: Context menu shows "Edit" but not implemented (placeholder)
2. **Channel Browsing**: Not available until Phase 2
3. **Video Playback**: Not available until Phase 2
4. **Code Expiration**: Fixed at 5 minutes (server-controlled)
5. **Offline Detection**: App doesn't pre-detect airplane mode (waits for timeout)

---

## Troubleshooting

### App Won't Connect to Server
- ✅ Verify server is running: Open `http://192.168.1.100:3000` in browser
- ✅ Check device is on same network as server
- ✅ For emulator: Use `http://10.0.2.2:3000` (localhost alias)
- ✅ Ensure URL includes `http://` or `https://`

### Device Code Doesn't Work
- ✅ Enter code in browser within 5 minutes
- ✅ Check server URL in browser matches app
- ✅ Verify user account exists on server
- ✅ Try generating new code ("Try Again" button)

### App Crashes
- ✅ Check logcat: `adb logcat | grep "HdHomey"`
- ✅ Uninstall and reinstall APK
- ✅ Clear app data: Settings → Apps → HD Homey → Clear Data

---

## Reporting Bugs

**Create an issue with**:
1. **Title**: Brief description (e.g., "Retry button doesn't appear after code expiration")
2. **Steps to Reproduce**: Exact steps taken
3. **Expected Result**: What should happen
4. **Actual Result**: What actually happened
5. **Device Info**: Device type, Android version
6. **Screenshot/Video**: If applicable

**Example**:
```
Title: Swipe delete doesn't work on first server

Steps:
1. Add 3 servers
2. Swipe LEFT on first server
3. Nothing happens

Expected: Confirmation dialog should appear
Actual: No dialog, server stays in list
Device: Pixel 6 Emulator, Android 13
Screenshot: [attached]
```

---

## Quick Commands

```bash
# Install APK
cd /Users/shaun.burdick/github/shaunburdick/hd-homey/apps/android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
./gradlew installDebug

# Launch app
adb shell am start -n com.hdhomey.app/.MainActivity

# View logs
adb logcat | grep "HdHomey"

# Uninstall app
adb uninstall com.hdhomey.app

# Clear app data (without uninstall)
adb shell pm clear com.hdhomey.app
```

---

## Success Criteria

**Phase 1 is successful if**:
- ✅ Users can add/delete multiple servers
- ✅ Device pairing completes successfully
- ✅ All error states have recovery options (retry/cancel)
- ✅ No crashes during normal use
- ✅ UI feels polished and responsive
- ✅ TV remote control works (for TV devices)

---

**Ready to test!** 🚀 Follow the scenarios above and report any issues you find.

**For detailed technical test plan**, see: `specs/013-android-app-phase1/MANUAL-TEST-PLAN.md`
