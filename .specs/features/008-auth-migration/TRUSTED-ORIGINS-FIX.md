# Better-Auth Trusted Origins Fix

**Date:** November 28, 2025  
**Issue:** Runtime error "A provided trusted origin is invalid"  
**Status:** ✅ Fixed

## Problem

When running HD Homey locally, users encountered this runtime error:

```
Runtime BetterAuthError: A provided trusted origin is invalid, 
make sure your trusted origins list is properly defined.
```

## Root Cause

In `src/lib/auth/auth.ts`, the `trustedOrigins` configuration had a logic error:

```typescript
// BEFORE (BROKEN)
trustedOrigins: (process.env.BETTER_AUTH_URL !== null) 
    ? [process.env.BETTER_AUTH_URL] 
    : [],
```

**The Problem:**
- Environment variables that don't exist return `undefined`, not `null`
- The condition `!== null` always evaluated to `true` for undefined variables
- This resulted in an array with `[undefined]` instead of an empty array
- Better-Auth rejected `undefined` as an invalid origin

## Solution

Fixed the logic to properly handle undefined environment variables and provide sensible defaults:

```typescript
// AFTER (FIXED)
trustedOrigins: (process.env.BETTER_AUTH_URL !== undefined && process.env.BETTER_AUTH_URL !== '')
    ? [process.env.BETTER_AUTH_URL]
    : [process.env.NEXTAUTH_URL ?? 'http://localhost:3000'],
```

**Now it works like this:**

1. **Production:** If `BETTER_AUTH_URL` is set, use it (e.g., `https://tuner.example.com`)
2. **Custom Local:** If only `NEXTAUTH_URL` is set, use it (e.g., `http://192.168.1.100:3000`)
3. **Default Local:** Otherwise, default to `http://localhost:3000`

## Testing

### Tests Pass ✅
```bash
npm test
# Result: 101/101 tests passing (100%)
```

### Build Succeeds ✅
```bash
npm run build
# Result: Production build completes successfully
```

### Local Development Works ✅
The application now starts successfully in local development with the default `http://localhost:3000` origin.

## Files Modified

1. **`src/lib/auth/auth.ts`** - Fixed `trustedOrigins` logic

## Environment Variables

**For Local Development:**
- No configuration needed - defaults to `http://localhost:3000`

**For Production:**
```bash
# Option 1: Use BETTER_AUTH_URL (preferred for Better-Auth)
BETTER_AUTH_URL=https://tuner.example.com

# Option 2: Use NEXTAUTH_URL (compatibility with existing config)
NEXTAUTH_URL=https://tuner.example.com
```

## Related Documentation

- Main migration doc: `.specs/features/008-auth-migration/MIGRATION-COMPLETE.md`
- Test fixes: `.specs/features/008-auth-migration/TEST-FIX-SUMMARY.md`

## Deployment Notes

No changes required for existing deployments. The fix improves local development and makes production configuration more flexible.
