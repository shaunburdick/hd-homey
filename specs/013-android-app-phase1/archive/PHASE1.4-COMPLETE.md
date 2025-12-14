# Phase 1.4 Complete: App Launch Logic & Navigation

**Date**: 2025-01-13  
**Status**: ✅ Complete (Manual Testing Pending)

## Summary

Phase 1.4 implemented intelligent app routing based on state and proper back button handling. The app now:
- Routes to AddServerFragment on first launch (no servers)
- Routes to ServerListFragment when servers exist
- Handles back button correctly (exit app from ServerListFragment)
- Provides clear navigation from Success screen back to server list
- Added Phase 2 placeholder comments for channel viewing

## Implementation Details

### 1. MainActivity Launch Logic

**File**: `apps/android/app/src/main/java/com/hdhomey/app/MainActivity.kt`

Added `setupInitialNavigation()` method:
```kotlin
private fun setupInitialNavigation() {
    val navHostFragment = supportFragmentManager
        .findFragmentById(R.id.nav_host_fragment) as? NavHostFragment
        ?: return

    val navController = navHostFragment.navController
    val preferences = AppPreferences.getInstance(this)

    // Check if any servers exist
    val servers = preferences.loadServers()

    if (servers.isEmpty()) {
        // First launch - no servers configured
        // Navigate to AddServerFragment
        navController.navigate(R.id.addServerFragment)
    }
    // else: Stay on default startDestination (ServerListFragment)
}
```

**Key Decisions**:
- Uses `AppPreferences.getInstance(this)` for singleton pattern
- Calls `loadServers()` (not `getServers()`) - correct method name
- Only navigates on `savedInstanceState == null` (fresh launch)
- Uses correct import: `com.hdhomey.app.storage.AppPreferences`

### 2. Back Button Handling

**File**: `apps/android/app/src/main/java/com/hdhomey/app/MainActivity.kt`

Added `setupBackButtonHandling()` method:
```kotlin
private fun setupBackButtonHandling() {
    val navHostFragment = supportFragmentManager
        .findFragmentById(R.id.nav_host_fragment) as? NavHostFragment
        ?: return

    val navController = navHostFragment.navController

    // Handle back button press
    onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
        override fun handleOnBackPressed() {
            // If we're on the ServerListFragment (start destination), exit app
            if (navController.currentDestination?.id == R.id.serverListFragment) {
                finish()
            } else {
                // Otherwise, use default back navigation
                isEnabled = false
                onBackPressedDispatcher.onBackPressed()
                isEnabled = true
            }
        }
    })
}
```

**Key Decisions**:
- Uses `OnBackPressedCallback` (modern Android approach)
- Checks `currentDestination?.id` to determine behavior
- Exit app with `finish()` from ServerListFragment
- Temporarily disables callback to allow default navigation on other screens

### 3. Success Screen Navigation

**File**: `apps/android/app/src/main/res/layout/fragment_success.xml`

Changed button text:
- Before: `@string/done` ("Done")
- After: `@string/back_to_servers` ("Back to Servers")

Added Phase 2 comment:
```xml
<!-- Phase 2: Add "View Channels" button here that navigates to channel browser -->
```

**Navigation Action** (already existed):
```xml
<action
    android:id="@+id/action_success_to_serverList"
    app:destination="@id/serverListFragment"
    app:popUpTo="@id/serverListFragment"
    app:popUpToInclusive="true" />
```

The `popUpToInclusive="true"` clears the entire back stack, ensuring clean navigation.

### 4. String Resources

**File**: `apps/android/app/src/main/res/values/strings.xml`

Added:
```xml
<string name="back_to_servers">Back to Servers</string>
<string name="view_channels">View Channels</string>
```

## Build Verification

```bash
cd apps/android
export JAVA_HOME="/Applications/Android Studio.app/Contents/jbr/Contents/Home"
./gradlew assembleDebug
```

**Result**: ✅ BUILD SUCCESSFUL in 4s (39 actionable tasks: 12 executed, 27 up-to-date)

## Navigation Flows

### Flow 1: First Launch (No Servers)
```
App Launch
  → MainActivity.setupInitialNavigation()
    → Check servers: empty
    → Navigate to AddServerFragment
      → User adds server
        → Navigate back to ServerListFragment (by navigation)
```

### Flow 2: Has Servers
```
App Launch
  → MainActivity.setupInitialNavigation()
    → Check servers: found servers
    → Stay on ServerListFragment (default startDestination)
      → User selects server
        → Navigate to AuthenticationFragment
          → Device code flow
            → Navigate to SuccessFragment
              → "Back to Servers" button
                → Navigate to ServerListFragment (clear back stack)
```

### Flow 3: Back Button Behavior
```
ServerListFragment + Back → Exit app (finish())
AddServerFragment + Back → ServerListFragment (default nav)
AuthenticationFragment + Back → ServerListFragment (default nav)
SuccessFragment + Back → (shouldn't happen - button instead)
```

## Manual Testing Required

### Test Cases (Task 1.4.9, 1.4.10)

**Test 1: First Launch**
1. Uninstall app
2. Reinstall/launch app
3. **Expected**: Should navigate to AddServerFragment
4. Add a server (e.g., http://10.0.2.2:3000)
5. **Expected**: Should return to ServerListFragment with server visible

**Test 2: Has Servers**
1. Kill and relaunch app
2. **Expected**: Should go to ServerListFragment
3. **Expected**: Should see previously added server

**Test 3: Full Auth Flow**
1. From ServerListFragment, tap server
2. **Expected**: Navigate to AuthenticationFragment
3. Complete device code pairing
4. **Expected**: Navigate to SuccessFragment
5. Tap "Back to Servers" button
6. **Expected**: Navigate to ServerListFragment
7. **Expected**: Back stack cleared (pressing back exits app)

**Test 4: Back Button**
1. From ServerListFragment, press back
2. **Expected**: App exits (finish())
3. Launch app again, navigate to AddServerFragment
4. Press back
5. **Expected**: Return to ServerListFragment
6. Press back
7. **Expected**: App exits

## Phase 1.4 Acceptance Criteria

✅ **App routes to correct screen based on state**
- First launch (no servers) → AddServerFragment
- Has servers → ServerListFragment

✅ **Navigation flows implemented**
- Add server → Returns to ServerListFragment
- Auth → Success → Back to Servers (clear back stack)

✅ **Back button handled correctly**
- From ServerListFragment → Exits app
- From other screens → Standard back navigation

⏸️ **Task 1.4.8 - "Disconnect" action**: Deferred to Phase 2 (requires channel UI)

⏳ **Tasks 1.4.9, 1.4.10 - Manual Testing**: Pending (requires emulator/device testing)

## Technical Notes

### Import Issues Resolved
- **Problem**: `AppPreferences` initially imported from wrong package
- **Solution**: Changed from `com.hdhomey.app.data.preferences.AppPreferences` to `com.hdhomey.app.storage.AppPreferences`
- **Lesson**: Always verify directory structure matches imports

### Method Name Correction
- **Problem**: Called `preferences.getServers()` but method is `loadServers()`
- **Solution**: Changed to `preferences.loadServers()`
- **Lesson**: Check actual method signatures before using

### Navigation Component Best Practices
- Used `popUpTo` and `popUpToInclusive` for clean back stack
- Used `OnBackPressedCallback` for modern back handling
- Checked `currentDestination?.id` for conditional back behavior

## Files Modified

```
apps/android/app/src/main/java/com/hdhomey/app/MainActivity.kt
apps/android/app/src/main/res/layout/fragment_success.xml
apps/android/app/src/main/res/values/strings.xml
specs/013-android-app-phase1/tasks.md
specs/013-android-app-phase1/PHASE1.4-COMPLETE.md
```

## Next Steps

### Immediate (Phase 1.5)
- [ ] Manual testing on Android TV emulator
- [ ] Verify all navigation flows work correctly
- [ ] Test back button behavior on physical device
- [ ] Polish UI (loading indicators, error states)
- [ ] Add app icon and TV banner

### Future (Phase 2)
- [ ] Implement "View Channels" button on SuccessFragment
- [ ] Create channel browser UI
- [ ] Implement "Disconnect" action that returns to ServerListFragment
- [ ] Add settings/profile screen

## Conclusion

Phase 1.4 successfully implemented intelligent app routing and back button handling. The app now provides a smooth onboarding experience for new users (first launch → add server) and returning users (launch → server list). All core navigation flows are in place and ready for manual testing.

**Status**: ✅ Implementation Complete | ⏳ Manual Testing Pending
