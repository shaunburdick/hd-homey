# Better-Auth Username Plugin Migration

**Date:** November 28, 2025  
**Issue:** Using email field for usernames (incorrect approach)  
**Status:** ✅ Fixed - Now using Better-Auth username plugin

## The Problem

The initial Better-Auth migration incorrectly used the `emailAndPassword` authentication method and stored usernames in the `email` field. This was a workaround rather than the proper solution.

## The Correct Solution

Better-Auth provides a dedicated **username plugin** specifically for username/password authentication without requiring actual email addresses.

## Changes Made

### 1. Added Username Plugin to Better-Auth Configuration

**File:** `src/lib/auth/auth.ts`

```typescript
import { username } from 'better-auth/plugins';

export const auth = betterAuth({
    // ... other config
    plugins: [
        username(), // Username/password authentication
    ],
    // Removed emailAndPassword configuration
});
```

### 2. Updated Database Schema

**File:** `src/lib/database/schema.ts`

Added `username` field to the user table:

```typescript
export const user = sqliteTable('user', {
    id: text('id').primaryKey(),
    email: text('email').notNull().unique(), // Still required by Better-Auth
    // ... other fields
    username: text('username').notNull().unique(), // NEW: Username plugin field
    // ... custom fields
});
```

### 3. Created Migration

**File:** `migrations/0003_add_username_column.sql`

```sql
ALTER TABLE `user` ADD COLUMN `username` text NOT NULL DEFAULT '';
CREATE UNIQUE INDEX `user_username_unique` ON `user` (`username`);
UPDATE `user` SET `username` = `email` WHERE `username` = '';
```

### 4. Updated Authentication Calls

#### Get Started Page (First User Creation)
**File:** `src/app/(start)/get-started/actions.ts`

```typescript
// BEFORE (incorrect)
await auth.api.signUpEmail({
    body: {
        email: validUsername, // Wrong: storing username in email field
        password: validPassword,
        name: validName,
        role: AuthRoles.Admin,
    },
});

// AFTER (correct)
await auth.api.signUpUsername({
    body: {
        username: validUsername, // Correct: using username field
        password: validPassword,
        name: validName,
        email: `${validUsername}@local.hdhomey.app`, // Plugin requires email, use local domain
        role: AuthRoles.Admin,
    },
});
```

#### Sign-In Page
**File:** `src/app/users/signin/page.tsx`

```typescript
// BEFORE (incorrect)
await authClient.signIn.email({
    email: username, // Wrong: calling email method with username
    password,
});

// AFTER (correct)
await authClient.signIn.username({
    username, // Correct: using username method
    password,
});
```

#### User Creation (Admin)
**File:** `src/lib/actions/users.ts`

```typescript
// BEFORE (incorrect)
await auth.api.signUpEmail({
    body: {
        email: username, // Wrong
        password,
        name,
        role,
    },
});

// AFTER (correct)
await auth.api.signUpUsername({
    body: {
        username,
        password,
        name,
        email: `${username}@local.hdhomey.app`, // Plugin requires email
        role,
    },
});
```

## Why This Is Better

### Before (Email Field Workaround)
- ❌ Misused `email` field for usernames
- ❌ Confusing: "email" in database, "username" in UI
- ❌ Not the intended use of Better-Auth
- ❌ Could cause issues with email-related features

### After (Username Plugin)
- ✅ Dedicated `username` field in database
- ✅ Proper separation of username and email
- ✅ Uses Better-Auth's official username authentication
- ✅ Clear, semantic schema
- ✅ Email field available for future features (notifications, password reset, etc.)

## Email Field Handling

The username plugin still requires an `email` field in the user table (Better-Auth requirement). For HD Homey:

- **Username:** User-provided, used for sign-in (e.g., `admin`)
- **Email:** Auto-generated as `{username}@local.hdhomey.app`
- **Future:** Can be updated to real emails if email features are added

## Migration Path

Since your database had no users yet, the migration is seamless:
1. ✅ Schema updated with `username` column
2. ✅ Migration script created
3. ✅ Auth configuration updated
4. ✅ Sign-in/sign-up updated to use username methods
5. ✅ All 101 tests passing (100%)

## Verification

### Tests Pass
```bash
npm test
# Result: 101/101 tests passing (100%)
```

### Database Schema
```sql
sqlite3 data/db/hd_homey.db ".schema user"

-- Shows:
CREATE TABLE `user` (
    `id` text PRIMARY KEY NOT NULL,
    `email` text NOT NULL UNIQUE,
    `username` text NOT NULL UNIQUE,  -- NEW!
    `name` text NOT NULL,
    -- ... other fields
);
```

## Next Steps

1. **Run migrations:** The migration will run automatically on next app start
2. **Create first user:** Visit `http://localhost:3000/get-started`
3. **Sign in:** Use your username (not email) to sign in

## Documentation References

- [Better-Auth Username Plugin](https://www.better-auth.com/docs/plugins/username)
- [Better-Auth Plugins Overview](https://www.better-auth.com/docs/plugins)

## Related Files

- Migration spec: `.specs/features/008-auth-migration/MIGRATION-COMPLETE.md`
- Test fixes: `.specs/features/008-auth-migration/TEST-FIX-SUMMARY.md`
- Trusted origins fix: `.specs/features/008-auth-migration/TRUSTED-ORIGINS-FIX.md`
- Login setup: `.specs/features/008-auth-migration/LOGIN-SETUP.md`
