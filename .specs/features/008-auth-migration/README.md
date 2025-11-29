# SPEC-008: Better-Auth Migration Documentation

**Status**: ⚠️ IN PROGRESS - First attempt incomplete, recommend restart  
**Date**: 2025-11-28  
**Branch**: `008-auth-migration` (first attempt)

---

## Quick Summary

**What happened**: First migration attempt from NextAuth v5 to Better-Auth has significant technical debt:
- 8 disabled test files
- Untested user creation (likely runtime errors)
- Multiple workarounds instead of proper solutions

**Current state**: 119/119 enabled tests passing, but missing ~30-40 tests from disabled files

**Recommendation**: **Start fresh** with proper research phase (14 hours vs 16-18 hours to fix)

---

## Documentation Index

### 📖 Read These In Order

1. **[STATUS.md](./STATUS.md)** ⭐ START HERE
   - Current state summary
   - Technical debt inventory
   - Risk assessment
   - Decision matrix (continue vs restart)

2. **[LESSONS-LEARNED.md](./LESSONS-LEARNED.md)** ⭐ CRITICAL READING
   - What went wrong and why (detailed analysis)
   - Critical mistakes made
   - Anti-patterns to avoid
   - Recommended approach for second attempt
   - Success criteria

3. **[QUICK-REFERENCE.md](./QUICK-REFERENCE.md)** 📝 KEEP HANDY
   - Correct patterns (use these!)
   - Anti-patterns (avoid these!)
   - Common errors and solutions
   - Testing checklists
   - Red flags to watch for

4. **[spec.md](./spec.md)** 📋 ORIGINAL SPEC
   - Updated with "needs restart" status
   - Original requirements and architecture
   - Success criteria

5. **[plan.md](./plan.md)** 📅 ORIGINAL PLAN
   - Updated with warning about first attempt
   - Original implementation phases
   - Time estimates

---

## Files Currently Disabled

These test files need to be fixed before the migration is complete:

```
src/lib/database/schema.test.ts.disabled          (foundation - fix first)
src/lib/actions/users.test.ts.disabled           (depends on schema)
src/lib/actions/profile.test.ts.disabled         (depends on users)
src/lib/hdhr/tuner.test.ts.disabled              (depends on schema)
src/app/(protected)/page.test.tsx.disabled       (depends on auth mocks)
src/app/(protected)/tuners/actions.test.ts.disabled  (depends on auth mocks)
src/app/api/tuners/route.test.ts.disabled        (depends on auth mocks)
src/app/api/tuners/[id]/route.test.ts.disabled   (depends on auth mocks)
```

**Total**: ~30-40 disabled tests

---

## Decision Tree

```
Do you need this auth migration urgently?
│
├─ YES → Continue with first attempt (Option A)
│         • 16-18 hours to complete
│         • Medium quality result
│         • High technical debt
│         • Medium confidence
│         • Read: STATUS.md → "If Choosing to Continue"
│
└─ NO → Start fresh (Option B) ✅ RECOMMENDED
          • 14 hours to complete
          • High quality result
          • Zero technical debt
          • High confidence
          • Read: LESSONS-LEARNED.md → "Phase 0: Deep Research"
```

---

## Quick Facts

### What's Working ✅
- 119 enabled tests passing
- Proxy-level authentication
- Role-based access helpers
- User creation code compiles

### What's Not Working ❌
- 8 test files disabled (~30-40 tests)
- User creation never manually tested
- Test database schema doesn't match production
- Multiple workarounds in code

### Risk Level
- **Continue (Option A)**: 🔴 HIGH - Cascading issues, runtime errors likely
- **Restart (Option B)**: 🟢 LOW - Proper research, test-as-you-go, clean result

---

## Key Lessons Learned

### ❌ Never Do These
1. Disable tests during migration
2. Use ts-ignore to hide type errors
3. Commit untested code
4. Assume APIs exist without checking docs
5. "I'll fix it later" (you won't)

### ✅ Always Do These
1. Research thoroughly before starting
2. Test each module immediately
3. Fix issues completely (no workarounds)
4. Manual test critical flows
5. Keep all tests enabled

---

## Next Steps

### If You're Starting Fresh (Recommended)
1. Read [LESSONS-LEARNED.md](./LESSONS-LEARNED.md) completely (30 min)
2. Phase 0: Deep Research (4 hours)
   - Read Better-Auth docs cover-to-cover
   - Build proof-of-concept project
   - Test user creation, sign-in, sessions
   - Document findings
3. Phase 1: Clean Migration (8 hours)
   - No disabled tests allowed
   - Test as you go
   - Proper solutions only
4. Phase 2: Documentation (2 hours)
   - Update docs
   - Clean up code
   - Verify everything works

### If You're Continuing (Not Recommended)
1. Read [STATUS.md](./STATUS.md) "If Choosing to Continue" section
2. Create detailed fix plan for each disabled test
3. Fix in dependency order (schema → users → profile → etc.)
4. Manual test after each fix
5. Expect 2-4 hours of additional runtime error fixes

---

## Support Resources

- Better-Auth Docs: https://www.better-auth.com/docs
- Username Plugin: https://www.better-auth.com/docs/plugins/username
- Drizzle Adapter: https://www.better-auth.com/docs/adapters/drizzle
- HD Homey AGENTS.md: [../../AGENTS.md](../../AGENTS.md)

---

## Timeline Comparison

| Phase | Continue (A) | Restart (B) |
|-------|-------------|-------------|
| Fix disabled tests | 12 hours | - |
| Fix runtime errors | 2-4 hours | - |
| Research | - | 4 hours |
| Clean migration | - | 8 hours |
| Documentation | 2 hours | 2 hours |
| **Total** | **16-18 hours** | **14 hours** ✅ |

**Winner**: Restart (Option B) - Faster AND higher quality

---

## Success Metrics

Migration is complete when:
- [ ] All 200+ tests passing (zero disabled)
- [ ] Zero ts-ignore in auth code
- [ ] Manual testing 100% complete
- [ ] First user creation works
- [ ] Sign-in as admin works
- [ ] Sign-in as viewer works
- [ ] Admin routes restricted to admin
- [ ] Streaming (token auth) works
- [ ] Docker builds and runs
- [ ] Confident enough to deploy

---

## Contact

Questions about this migration?
- Review [LESSONS-LEARNED.md](./LESSONS-LEARNED.md) first
- Check [QUICK-REFERENCE.md](./QUICK-REFERENCE.md) for patterns
- Read [STATUS.md](./STATUS.md) for decision guidance

---

*"The first attempt taught us what NOT to do. The second attempt will be done right."*
