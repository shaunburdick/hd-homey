# 🎯 Manual Testing - Quick Start

**You're ready to test!** All code is complete, all unit tests pass. Time for manual testing.

---

## 📋 What You Have Now

1. **TESTING-SETUP.md** - 5-minute setup guide (start here!)
2. **MANUAL-TEST-CHECKLIST.md** - 50 test scenarios with checkboxes
3. **specs/013-android-app-phase2/quickstart.md** - Detailed test scenarios (reference)

---

## 🚀 Start Testing in 3 Steps

### Step 1: Setup (5 minutes)
```bash
# Open setup guide
open apps/android/TESTING-SETUP.md
```

Follow the guide to:
1. Merge backend branch
2. Start backend server
3. Install Android app
4. Start testing

### Step 2: Test (30 minutes minimum)
```bash
# Open checklist
open apps/android/MANUAL-TEST-CHECKLIST.md
```

**Critical tests** (must pass before merge):
- ✅ Happy Path Flow (11 steps)
- ✅ D-Pad Navigation (5 checks)
- ✅ Error Handling (5 checks)  
- ✅ Multiple Channel Switching (7 checks)
- ✅ Memory & Performance (3 checks)

### Step 3: Document Results
When testing is done, save your filled checklist as:
```bash
apps/android/MANUAL-TEST-RESULTS.md
```

---

## 📊 What to Test

### Priority 1: Critical Path (30 min)
**These MUST pass before merge:**

1. **Sign in works** → Device code flow successful
2. **Channels load** → List displays within 5 seconds
3. **Video plays** → Stream starts within 10 seconds
4. **Navigation works** → D-pad UP/DOWN/CENTER responsive
5. **Errors handled** → Network error shows retry button
6. **Switching works** → Can play 10 channels without crash
7. **Memory stable** → Growth < 50 MB after 10 switches

**If all 7 pass → Ready to merge!** ✅

### Priority 2: Extended Tests (30 min - optional)
- Favorites/hidden channels (requires backend API)
- Edge cases (empty list, long names)
- Authentication errors (401, session expired)
- Video quality (HD, buffering, audio sync)

---

## ✅ Success Criteria

**Minimum for merge:**
- [ ] All 7 critical path tests pass
- [ ] No crashes during basic usage
- [ ] Memory growth < 50 MB
- [ ] Video starts within 10 seconds

**Ideal for merge:**
- [ ] All 31 priority tests pass
- [ ] Extended tests pass (or documented as skipped)
- [ ] No critical bugs found
- [ ] Performance meets targets

---

## 🐛 If You Find Bugs

### Critical Bugs (blocks merge)
- App crashes on launch
- Cannot sign in
- Channels don't load
- Video never plays
- Memory leak (>100 MB growth)

**Action**: Fix immediately, re-test, don't merge until fixed.

### High Priority (should fix before merge)
- Slow channel loading (>10s)
- Occasional crashes during switching
- Poor video quality
- D-pad navigation issues

**Action**: Document, fix if possible, or add to known issues.

### Low Priority (can fix later)
- UI polish issues
- Minor visual bugs
- Missing animations
- Feature requests

**Action**: Document for future work.

---

## 📝 After Testing

1. **All tests pass?**
   ```bash
   # Run final verification
   cd apps/android
   ./gradlew test lint
   
   # Create completion summary
   # Update docs
   # Create PR
   ```

2. **Bugs found?**
   - Fix critical bugs first
   - Re-test after each fix
   - Document any known issues
   - Re-run verification when ready

3. **Blocked?**
   - Document blockers
   - Resolve environment issues
   - Reach out for help if needed

---

## 🎯 Expected Results

### Happy Path Success Looks Like:
```
1. Launch app → HD Homey logo ✅
2. Sign in → Device code works ✅
3. Select server → Server list appears ✅
4. Browse channels → List loads in <5s ✅
5. Select channel → D-pad navigation works ✅
6. Video plays → Stream starts in <10s ✅
7. Audio synced → No lag or stutter ✅
8. Back button → Returns to list ✅
9. Switch channels → 10 switches work ✅
10. Memory stable → <50 MB growth ✅
```

**If you see this → Phase 2 is complete!** 🎉

---

## 📞 Quick Troubleshooting

### App won't start
```bash
adb logcat | grep hdhomey
# Check for crash logs
```

### Backend unreachable
```bash
# Verify backend running
curl http://localhost:3000/api/health

# Check device can reach backend
adb shell ping 192.168.x.x
```

### Video won't play
```bash
# Check stream token endpoint
curl -X POST http://localhost:3000/api/stream-token \
  -H "Content-Type: application/json" \
  -d '{"tunerId": 1, "channelId": 1}'
```

### Memory leak
```bash
# Monitor memory during testing
watch -n 5 'adb shell dumpsys meminfo com.hdhomey.app | grep TOTAL'
```

---

## 🔗 Quick Links

- **Setup Guide**: `apps/android/TESTING-SETUP.md`
- **Test Checklist**: `apps/android/MANUAL-TEST-CHECKLIST.md`
- **Detailed Scenarios**: `specs/013-android-app-phase2/quickstart.md`
- **Implementation Summary**: `specs/013-android-app-phase2/TESTING-T099-T102-COMPLETE.md`

---

## ⏱️ Time Estimates

- **Setup**: 5 minutes
- **Critical tests**: 30 minutes
- **Extended tests**: 30 minutes
- **Bug documentation**: 15 minutes
- **Total**: ~1.5 hours

---

**Ready to start?**

1. Open `apps/android/TESTING-SETUP.md`
2. Follow steps 1-4 to setup
3. Open `apps/android/MANUAL-TEST-CHECKLIST.md`
4. Start testing!

**Good luck! 🚀**
