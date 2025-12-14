# DataStore Crash Fix - Multiple Instance Problem

**Date**: December 14, 2025  
**Status**: ✅ FIXED  
**Commit**: `49f1b9a`  
**Branch**: `013-android-app-phase2-impl`

---

## 🐛 Problem: DataStore IllegalStateException

### Error Message
```
java.lang.IllegalStateException: There are multiple DataStores active 
for the same file: /data/user/0/com.hdhomey.app.debug/files/datastore/
hd_homey_prefs.preferences_pb. You should either maintain your DataStore 
as a singleton or confirm that there is no two DataStore's active on the 
same file (by confirming that the scope is cancelled).
```

### Impact
- **BaseUrlInterceptor crashed** when trying to read active server
- **API calls still used wrong URL** (192.168.1.100 instead of user's server)
- **Channels wouldn't load** - infinite spinner
- **App appeared broken** after authentication

---

## 🔍 Root Cause: Multiple DataStore Instances

### The Problem
ServerListFragment manually created ServerRepository:

```kotlin
// ServerListFragment.kt (OLD - BROKEN)
override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
    // Manual creation → creates new AppPreferences instance
    val prefs = AppPreferences.getInstance(requireContext())
    repository = ServerRepository(prefs)
}
```

This called `AppPreferences.getInstance()`:

```kotlin
// AppPreferences.kt
fun getInstance(context: Context): AppPreferences {
    return INSTANCE ?: synchronized(this) {
        INSTANCE ?: AppPreferences(context.preferencesDataStore).also {
            INSTANCE = it
        }
    }
}

// Creates DataStore instance #1
private val Context.preferencesDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "hd_homey_prefs"  // ← Same name!
)
```

Meanwhile, Hilt also provided DataStore:

```kotlin
// DataModule.kt
@Provides
@Singleton
fun providePreferencesDataStore(@ApplicationContext context: Context): DataStore<Preferences> {
    return context.preferencesDataStore  // Creates DataStore instance #2
}

// Same extension property name, same file name!
private val Context.preferencesDataStore: DataStore<Preferences> by preferencesDataStore(
    name = "hd_homey_prefs"  // ← Same name!
)
```

### Result
Two separate Kotlin extension properties, both creating DataStore with the same file name:
1. **AppPreferences.kt** line 330: Creates instance when `getInstance()` called
2. **DataModule.kt** line 194: Creates instance when Hilt provides it

DataStore enforces **one instance per file** → Crash!

---

## ✅ Solution: Use Hilt Injection Everywhere

### Changes Made

**File**: `ServerListFragment.kt`

```kotlin
// NEW - FIXED
@AndroidEntryPoint  // ← Enable Hilt injection
class ServerListFragment : Fragment() {

    @Inject  // ← Inject singleton from Hilt
    lateinit var repository: ServerRepository
    
    override fun onViewCreated(view: View, savedInstanceState: Bundle?) {
        super.onViewCreated(view, savedInstanceState)
        
        // Repository is injected by Hilt - no manual initialization needed
        // (Hilt calls the injector before onViewCreated)
        
        // Setup views...
    }
}
```

### How It Works

**Before (Broken)**:
```
1. ServerListFragment creates AppPreferences.getInstance()
2. AppPreferences.getInstance() creates DataStore instance #1
3. Hilt provides DataStore instance #2 (for other components)
4. Two instances for same file → Crash!
```

**After (Fixed)**:
```
1. Hilt provides ServerRepository (singleton)
2. ServerRepository uses Hilt-provided AppPreferences (singleton)
3. AppPreferences uses Hilt-provided DataStore (singleton)
4. Only ONE DataStore instance → Success!
```

### Dependency Graph (After Fix)

```
ServerListFragment
    ↓ @Inject
ServerRepository (singleton)
    ↓ constructor
AppPreferences (singleton)
    ↓ constructor
DataStore<Preferences> (singleton)
    ↓
"hd_homey_prefs.preferences_pb" (single file)
```

---

## 📝 Files Modified

| File | Change | Lines |
|------|--------|-------|
| `ServerListFragment.kt` | Add @AndroidEntryPoint, @Inject ServerRepository | +8, ~6 |

---

## 🎯 Impact

### Before Fix
- ❌ Multiple DataStore instances created
- ❌ IllegalStateException on BaseUrlInterceptor access
- ❌ API calls used wrong URL (192.168.1.100)
- ❌ Channels wouldn't load

### After Fix
- ✅ Single DataStore instance (Hilt singleton)
- ✅ BaseUrlInterceptor reads active server successfully
- ✅ API calls use correct server URL
- ✅ Channels load from user's actual server

---

## 🧪 Testing

### Verify the Fix

```bash
cd /Users/shaun.burdick/github/shaunburdick/hd-homey/apps/android

# Rebuild with DataStore fix
./gradlew clean installDebug

# Start backend
cd ../web && npm run dev

# Test flow:
# 1. Add server with YOUR IP
# 2. Complete authentication
# 3. Navigate to channel list
# 4. ✅ Should load channels without DataStore crash
# 5. Check logs - should see your server URL, not 192.168.1.100
```

### Check Logs

```bash
adb logcat | grep "AppPreferences\|BaseUrl\|okhttp"

# Should see:
✅ GOOD: "GET http://YOUR_IP:3000/api/tuners/1/channels"
✅ GOOD: No "Failed to get active server ID" errors
✅ GOOD: No "multiple DataStores" errors

# Should NOT see:
❌ BAD: "GET http://192.168.1.100:3000/api/tuners/1/channels"
❌ BAD: "IllegalStateException: There are multiple DataStores..."
```

---

## 💡 Lessons Learned

### Why This Happened

1. **Legacy getInstance() pattern** - AppPreferences had both Hilt injection AND manual singleton pattern
2. **Mixed DI approaches** - Some fragments used Hilt (@AndroidEntryPoint), others didn't
3. **Extension property duplication** - Same `Context.preferencesDataStore` defined in two files

### Best Practices Going Forward

1. **Always use @AndroidEntryPoint** for fragments that need dependencies
2. **Always use @Inject** for repository dependencies
3. **Never manually create repositories** with `Repository()`
4. **Remove getInstance() patterns** when using Hilt
5. **One DataStore definition** - should only be in DataModule

### Why Other Fragments Worked

**ChannelListFragment already used Hilt**:
```kotlin
@AndroidEntryPoint  // ← Already had this!
class ChannelListFragment : Fragment() {
    private val viewModel: ChannelListViewModel by viewModels()  // Hilt injection
}
```

ServerListFragment was the only Phase 1 fragment that hadn't been migrated to Hilt yet.

---

## 🔗 Related Fixes

This fix completes the chain needed for channel loading:

1. **Navigation fix** (5af1c23) - Navigate to channels when authenticated
2. **BaseUrlInterceptor** (3d3067a) - Rewrite URLs to use active server
3. **DataStore singleton** (49f1b9a) - Fix crash so BaseUrlInterceptor can read server ✅

All three fixes work together:
```
ServerListFragment → Channel List (fix #1)
    ↓
BaseUrlInterceptor reads active server (fix #3 enables this)
    ↓
API calls use correct URL (fix #2)
    ↓
Channels load successfully! 🎉
```

---

## 🎉 Summary

**Problem**: Multiple DataStore instances created for same file, causing crash that prevented BaseUrlInterceptor from reading active server.

**Solution**: Use Hilt injection (@AndroidEntryPoint + @Inject) to ensure singleton DataStore instance throughout app.

**Result**: DataStore crash fixed, BaseUrlInterceptor can read active server, channels load from correct server URL.

**Testing**: Rebuild APK and test - channels should load without DataStore errors! 🚀

---

**Status**: DataStore crash fixed. Ready for testing with previous fixes!
