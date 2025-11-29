# Initial Setup Redirect Fix

**Date**: 2025-11-28  
**Issue**: Proxy redirecting to `/users/signin` even when no users exist  
**Status**: ✅ **FIXED**

---

## Problem

After the Better-Auth migration and security improvements, visiting the homepage with no users configured would redirect to `/users/signin` instead of `/get-started`, preventing initial setup.

### User Experience
```
User visits http://localhost:3000/
  ↓
Proxy checks session → No session found
  ↓
Redirects to /users/signin ❌ (WRONG - can't sign in with 0 users!)
```

---

## Root Cause

The proxy-based authentication (added in commit e49068f for security) was checking for a session and redirecting to `/users/signin` **before** the protected layout could check if any users existed.

### Old Behavior (Pre-Security Fix)
The old proxy didn't check authentication - it only logged requests. The `(protected)/layout.tsx` would check user count and redirect appropriately:

```typescript
// Old proxy (simple logging only)
export function proxy(req: NextRequest) {
    Logger.info({ method: req.method, url: req.url });
    return NextResponse.next();
}
```

Then the layout would handle auth:
```typescript
// (protected)/layout.tsx
const userCount = await db.select({ count: count() }).from(user);
if (userCount[0].count === 0) {
    redirect('/get-started');  // ✅ This worked!
}
```

### New Behavior (Post-Security Fix)
The new proxy checks authentication for ALL routes:

```typescript
// New proxy (checks auth)
const session = await auth.api.getSession({ headers: await headers() });
if (session?.user === undefined) {
    redirect('/users/signin');  // ❌ Blocks before layout can check user count
}
```

This prevented the layout from ever running its user count check.

---

## Solution

Changed the proxy to redirect to `/get-started` instead of `/users/signin` when there's no session. The `/get-started` page's layout already has logic to redirect to signin if users exist.

### Code Change

**File**: `src/proxy.ts`

```typescript
// OLD: Direct to signin
if (session?.user === undefined) {
    const signInUrl = new URL('/users/signin', req.url);
    signInUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(signInUrl);
}

// NEW: Direct to get-started (which handles the "users exist" case)
if (session?.user === undefined) {
    const getStartedUrl = new URL('/get-started', req.url);
    getStartedUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(getStartedUrl);
}
```

### New Flow

```
User visits http://localhost:3000/
  ↓
Proxy checks session → No session found
  ↓
Redirects to /get-started
  ↓
/get-started layout checks user count:
  ├─ 0 users → Show setup form ✅
  └─ >0 users → Redirect to /users/signin ✅
```

---

## Why This Works

The `(start)/layout.tsx` already has the logic to redirect to signin if users exist:

```typescript
// src/app/(start)/layout.tsx
export default async function StartLayout({ children }) {
    const db = await getDb();
    const userCount = await db.select({ count: count() }).from(user);

    // If users exist, redirect to signin (setup already complete)
    if (userCount[0].count > 0) {
        redirect('/users/signin');
    }

    return <main>{children}</main>;
}
```

So now the flow works for both cases:
1. **No users**: Show `/get-started` form
2. **Users exist**: Redirect to `/users/signin`

---

## Testing

### Test Updated
**File**: `src/proxy.test.ts`

```typescript
// Changed test expectation
it('should redirect page routes without session to get-started', async () => {
    vi.mocked(auth.api.getSession).mockResolvedValue(null);

    const request = new NextRequest(new URL('http://localhost:3000/tuners'));
    const response = await proxy(request);

    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toContain('/get-started');  // ✅ Changed
    expect(response.headers.get('location')).toContain('callbackUrl=%2Ftuners');
});
```

### Test Results
✅ All 101 tests passing  
✅ Production build succeeds  
✅ Fresh install works correctly

---

## Verification

To verify the fix works:

1. **Delete database**:
   ```bash
   rm data/db/hd_homey.db
   ```

2. **Start the app**:
   ```bash
   npm run dev
   ```

3. **Visit homepage** (`http://localhost:3000/`):
   - ✅ Should redirect to `/get-started`
   - ✅ Should show "Create Admin Account" form

4. **Create first user**:
   - Fill in username, name, password
   - Submit form

5. **Try to visit `/get-started` again**:
   - ✅ Should redirect to `/users/signin` (since users now exist)

---

## Related Files

- `src/proxy.ts` - Changed redirect target
- `src/proxy.test.ts` - Updated test expectation
- `src/app/(start)/layout.tsx` - Handles user count check
- `src/app/(protected)/layout.tsx` - Still checks user count for protected routes

---

## Impact

### Before Fix
- ❌ Fresh installs broken (couldn't access setup wizard)
- ❌ Users stuck on signin page with no accounts
- ❌ Had to manually create database entries

### After Fix
- ✅ Fresh installs work perfectly
- ✅ Setup wizard accessible when needed
- ✅ Automatic redirect to signin when users exist
- ✅ Better user experience

---

**Status**: ✅ Fixed and tested  
**Tests**: 101/101 passing
