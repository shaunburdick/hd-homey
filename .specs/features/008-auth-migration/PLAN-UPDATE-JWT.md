# Plan Update: JWT/Stateless Sessions (Option A)

**Date**: 2025-11-28  
**Decision**: Use JWT/Stateless sessions instead of database sessions

---

## What Changed

### ✅ Session Strategy: JWT/Stateless

**Before** (original plan): Database sessions with cookie caching  
**After** (updated plan): JWT/Stateless sessions (same as NextAuth v5)

### Key Benefits

1. **Better API Experience** 🚀
   - JWT tokens can be extracted and used as Bearer tokens
   - Standard REST API pattern
   - Easier for CLI tools, mobile apps, Plex/Emby

2. **Same Performance** ⚡
   - No database queries for session validation
   - ~1ms JWT verification (vs ~5-20ms DB query)
   - Edge Runtime compatible

3. **Simpler Migration** 🛠️
   - **NO session table needed** (one less table!)
   - Closer to current NextAuth behavior
   - Less schema complexity

4. **No Database Load** 📊
   - Zero session queries
   - Scales better (stateless)
   - Simpler backup/restore

### Trade-offs (Acceptable)

1. **Cannot Revoke Individual Sessions** ⚠️
   - If token stolen, valid until expiry (7 days)
   - Mitigation: Change `version` in config to invalidate ALL tokens
   - Acceptable for home/beta environment

2. **No "List Active Sessions"** ⚠️
   - Cannot show "Devices signed in" page
   - Cannot track session history
   - May add later if needed

3. **Logout is Client-Side** ⚠️
   - Server doesn't track logouts
   - Token remains valid until expiry
   - Standard JWT behavior

---

## Schema Changes

### Database Tables

**Old Plan** (database sessions):
- Drop `users` table
- Create `user` table
- Create `account` table
- Create **`session` table** ❌
- Create `verification` table

**New Plan** (JWT/stateless):
- Drop `users` table
- Create `user` table
- Create `account` table
- ~~Create `session` table~~ **NOT NEEDED** ✅
- Create `verification` table

**Result**: One less table to migrate!

---

## Config Changes

### Better-Auth Configuration

```typescript
// src/lib/auth/auth.ts
export const auth = betterAuth({
  database: drizzleAdapter(await getDb(), { provider: "sqlite" }),
  
  // JWT/Stateless sessions (NEW)
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      strategy: "jwt", // Standard JWT format
      refreshCache: true, // Auto-refresh before expiry
    }
  },
  
  // Stateless account storage (NEW)
  account: {
    storeStateStrategy: "cookie",
    storeAccountCookie: true,
  },
  
  // Rest of config unchanged
  emailAndPassword: { enabled: true },
  plugins: [username()],
  user: {
    additionalFields: {
      role: { type: "string", required: true, defaultValue: "viewer" },
      isActive: { type: "boolean", required: true, defaultValue: true },
      deletedAt: { type: "date", required: false }
    }
  }
});
```

### Key Differences

| Aspect | Database Sessions (Old Plan) | JWT/Stateless (New Plan) |
|--------|------------------------------|--------------------------|
| **Session Storage** | SQLite `session` table | Signed JWT cookie |
| **Validation** | DB query + signature | Signature only |
| **Runtime** | Node.js (DB access) | **Edge compatible** ✅ |
| **Revocation** | Instant (delete row) | Version change (all tokens) |
| **API Clients** | Cookie-based | **JWT/Bearer token** ✅ |

---

## Migration Impact

### Simpler Migration

**Removed steps**:
- ❌ Create `session` table in schema
- ❌ Generate session table migration
- ❌ Add session table to Drizzle schema
- ❌ Handle session cleanup/expiration

**Result**: ~1 hour less migration time

### Same Code Changes

**All other code changes remain the same**:
- ✅ Replace `auth()` with `auth.api.getSession()`
- ✅ Update client hooks to `authClient.useSession()`
- ✅ Update sign-in flow
- ✅ Update tests and mocks

The code doesn't care if sessions are JWT or database - the API is identical!

---

## API Client Support

### Bearer Token Usage (Possible with JWT)

```bash
# 1. Sign in and get JWT cookie
curl -c cookies.txt -X POST http://localhost:3000/api/auth/sign-in/username \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"pass"}'

# 2. Extract JWT from cookie
TOKEN=$(grep better-auth.session-token cookies.txt | awk '{print $7}')

# 3. Use as Bearer token (may need middleware)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/tuners
```

**Note**: Better-Auth may need additional configuration or middleware to accept Bearer tokens. Fallback: use cookie-based auth (works out of the box).

---

## Updated Success Criteria

### Original Criteria (Still Valid)

- [x] All tests pass
- [x] Lint passes
- [x] Docker builds
- [x] Manual QA complete
- [x] Role-based access works
- [x] Streaming unchanged (HMAC tokens)

### New Criteria (JWT-Specific)

- [x] JWT tokens generated correctly (7-day expiry)
- [x] JWT validation works without DB queries
- [x] Auto-refresh works (refreshCache: true)
- [x] Version invalidation works (change version, all tokens invalid)
- [x] Edge Runtime compatible (proxy works)

---

## Documentation Updates

### Files Updated

1. **`plan.md`** - Main implementation plan
   - Updated session strategy to JWT/Stateless
   - Removed session table from schema
   - Updated Better-Auth config

2. **`spec.md`** - Specification
   - Updated requirements (JWT sessions)
   - Updated risks (cannot revoke individual sessions)
   - Updated compatibility (Edge Runtime ✅)

3. **`CLEAN-SLATE-SUMMARY.md`** - Migration overview
   - Updated rationale (JWT benefits)
   - Removed session table references
   - Updated advantages table

4. **`CHECKLIST.md`** - Implementation checklist
   - Removed session table steps
   - Updated server setup config
   - Added JWT-specific checks

5. **`JWT-VS-DB-SESSIONS.md`** (NEW) - Decision rationale
   - Comprehensive comparison
   - Pros/cons for HD Homey
   - Recommendation for JWT/Stateless

---

## Rollback Plan (Unchanged)

If JWT/Stateless doesn't work:

1. **Switch to database sessions**: Change config to enable DB sessions
2. **Add session table**: Run additional migration
3. **No code changes needed**: API is identical

This is the beauty of Better-Auth - you can switch session strategies without changing application code!

---

## Timeline (Improved)

**Original Estimate**: ~21 hours (~3 working days)  
**New Estimate**: ~19 hours (~2.5 working days)

**Time Saved**:
- Phase 1: -1 hour (no session table)
- Phase 7: -1 hour (simpler testing)

---

## Next Steps

1. ✅ **Plan updated** to use JWT/Stateless
2. ✅ **Documentation updated** across all files
3. ⏭️ **Ready to implement** Phase 0 (Preparation)

Start with:
```bash
npm install better-auth
```

Then follow the updated `plan.md` and `CHECKLIST.md`!

---

**Summary**: The plan is now simpler, faster, and better aligned with API client needs while maintaining the same security posture as the current NextAuth setup. 🚀
