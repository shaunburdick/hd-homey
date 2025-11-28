# Testing the Proxy Implementation

## Step 1: Clean Up Old Files ⚠️

**Delete these files** (they were created incorrectly and are causing errors):

```bash
rm src/middleware.ts
rm src/middleware.test.ts
rm MIDDLEWARE-IMPLEMENTATION.md
```

These files should NOT exist because:
- Next.js 16 renamed `middleware.ts` → `proxy.ts`
- We should update the existing `proxy.ts`, not create new middleware files
- They're causing TypeScript errors

## Step 2: Run the Test Suite ✅

After deleting the old files, run:

```bash
# Make the test script executable
chmod +x test-proxy-implementation.sh

# Run the comprehensive test script
./test-proxy-implementation.sh
```

Or run tests manually:

```bash
# 1. Type checking
npm run typecheck

# 2. Linting
npm run lint

# 3. Run proxy tests specifically
npm run test:unit -- src/proxy.test.ts

# 4. Run full test suite
npm run test:unit

# 5. Full test with coverage
npm test
```

## Step 3: Verify Implementation 🔍

### Check Route Protection

The proxy should now protect:

**Protected API Routes** (return 401 JSON):
```bash
curl http://localhost:3000/api/tuners
# Expected: {"error":"Unauthorized","message":"Authentication required. Please sign in."}
```

**Protected Pages** (redirect to signin):
```bash
curl -I http://localhost:3000/tuners
# Expected: HTTP 307, Location: /users/signin?callbackUrl=%2Ftuners
```

**Public Routes** (allow access):
```bash
curl http://localhost:3000/users/signin
# Expected: 200 OK (signin page HTML)
```

**Token-Authenticated Routes** (validate in handler):
```bash
curl http://localhost:3000/api/transcode/1/2/playlist.m3u8?token=invalid
# Expected: Handler validates token, returns 401/403
```

### Check Admin Routes

Admin-only operations should be protected:

```bash
# Without admin role - should fail
curl -X POST http://localhost:3000/api/tuners/1 \
  -H "Cookie: authjs.session-token=VIEWER_SESSION" \
  -F "name=Test"
# Expected: {"error":"Forbidden","message":"Admin access required"}

# With admin role - should work
curl -X POST http://localhost:3000/api/tuners/1 \
  -H "Cookie: authjs.session-token=ADMIN_SESSION" \
  -F "name=Test"
# Expected: Success or redirect
```

## Step 4: Run Development Server 🚀

Start the dev server and test manually:

```bash
npm run dev
```

Then test in browser:

1. **Test Unauthenticated Access:**
   - Visit http://localhost:3000/tuners
   - Should redirect to /users/signin

2. **Test Login:**
   - Login with credentials
   - Should redirect back to /tuners

3. **Test API Access:**
   - Open browser console
   - Try: `fetch('/api/tuners').then(r => r.json())`
   - Should return tuners data (if authenticated)

4. **Test Logout:**
   - Logout
   - Try accessing /api/tuners again
   - Should return 401 Unauthorized

## Expected Test Results ✅

### Unit Tests (src/proxy.test.ts)

Should see output like:
```
✓ src/proxy.test.ts (20) 
  ✓ Proxy Route Protection (20)
    ✓ Public Routes (3)
      ✓ should allow access to signin page without auth
      ✓ should allow access to get-started page without auth
      ✓ should allow access to NextAuth API routes without auth
    ✓ Token-Authenticated Routes (2)
      ✓ should allow transcode routes through (validated in handler)
      ✓ should allow stream routes through (validated in handler)
    ✓ Static Assets (3)
      ✓ should allow _next/static without auth
      ✓ should allow icon files without auth
      ✓ should allow image files without auth
    ✓ Session-Authenticated Routes - API (3)
      ✓ should block API routes without session
      ✓ should allow API routes with valid session
      ✓ should protect tuner modification endpoints
    ✓ Session-Authenticated Routes - Pages (3)
      ✓ should redirect page routes without session to signin
      ✓ should allow page routes with valid session
      ✓ should include callback URL when redirecting to signin
    ✓ Protected Routes Coverage (5)
      ✓ should protect /tuners routes
      ✓ should protect /settings route
      ✓ should protect /users management routes
      ✓ should protect /profile route
      ✓ should protect /about route

Test Files  1 passed (1)
     Tests  20 passed (20)
```

### Full Test Suite

All existing tests should continue to pass:
```
✓ src/app/(protected)/page.test.tsx
✓ src/lib/actions/profile.test.ts
✓ src/lib/actions/users.test.ts
✓ src/lib/auth.test.ts
✓ src/lib/database/schema.test.ts
✓ src/lib/hdhr/tuner.test.ts
✓ src/lib/settings.test.ts
✓ src/lib/stream-token.test.ts
✓ src/lib/transcoding/ffmpeg.test.ts
✓ src/lib/transcoding/session-manager.test.ts
✓ src/lib/version.test.ts
✓ src/proxy.test.ts  <-- NEW
✓ src/proxy.test.ts

Test Files  13 passed (13)
     Tests  170+ passed (170+)  <-- Was 154, now 170+
```

## Troubleshooting 🔧

### Issue: TypeScript errors about '@/auth'

**Cause:** Old middleware.ts files still exist  
**Fix:** Delete src/middleware.ts and src/middleware.test.ts

### Issue: Tests fail with "auth is not a function"

**Cause:** Mock not set up correctly  
**Fix:** Check that proxy.test.ts has proper vi.mock() before import

### Issue: Proxy not protecting routes

**Cause:** May need to restart dev server  
**Fix:** Stop (Ctrl+C) and restart `npm run dev`

### Issue: "Cannot access database" in proxy

**Cause:** Trying to access DB in proxy (Edge Runtime)  
**Fix:** proxy.ts should ONLY call auth() - no database access

## Summary Checklist ✓

Before considering this complete:

- [ ] Deleted src/middleware.ts
- [ ] Deleted src/middleware.test.ts  
- [ ] Deleted MIDDLEWARE-IMPLEMENTATION.md
- [ ] All TypeScript errors resolved
- [ ] npm run typecheck passes
- [ ] npm run lint passes
- [ ] npm run test:unit passes (170+ tests)
- [ ] Proxy tests (20) all pass
- [ ] Dev server starts without errors
- [ ] Manual testing in browser works
- [ ] API routes return 401 when unauthenticated
- [ ] Pages redirect to signin when unauthenticated
- [ ] Admin routes require admin role

## Files to Keep ✅

**Correct implementation:**
- ✅ `src/proxy.ts` - Updated with auth logic
- ✅ `src/proxy.test.ts` - Test suite
- ✅ `src/app/api/tuners/[id]/route.ts` - With admin check
- ✅ `src/app/api/tuners/[id]/poll/route.ts` - With auth check
- ✅ `AGENTS.md` - Updated documentation
- ✅ `PROXY-IMPLEMENTATION.md` - Implementation guide
- ✅ `test-proxy-implementation.sh` - Test script

## Next Steps

Once all tests pass:

1. Commit the changes:
```bash
git add src/proxy.ts src/proxy.test.ts
git add src/app/api/tuners/
git add AGENTS.md PROXY-IMPLEMENTATION.md
git commit -m "feat: add comprehensive route protection via proxy

- Update proxy.ts with authentication logic
- Add admin checks to tuner modification endpoints
- Add comprehensive test suite (20+ tests)
- Update documentation

Fixes critical security vulnerability where API routes were unprotected.
Uses NextAuth v5 JWT sessions for Edge Runtime compatibility."
```

2. Test in staging/production environment

3. Monitor logs for authentication issues

4. Update CHANGELOG.md with security improvements

---

**Need Help?**

If you encounter any issues during testing, check:
1. Are the old middleware.ts files deleted?
2. Does `npm run typecheck` pass?
3. Does `npm run lint` pass?
4. Are all tests passing individually?

The implementation is solid - most issues will be from leftover files or configuration!
