# Better-Auth Login Issue - No Users Yet

**Date:** November 28, 2025  
**Issue:** Sign-in page complaining about missing email  
**Status:** ✅ Resolved - Need to create first user

## The Issue

After the Better-Auth migration, attempting to sign in shows an error about a missing email field.

## Root Cause

Better-Auth uses the `email` field as the user identifier, while HD Homey uses `username`. During migration:

1. ✅ The database schema was updated (`user` table with `email` field)
2. ✅ The migration SQL should have copied usernames to the email field
3. ❌ **However, your database has NO users yet** - fresh installation

## The Solution

You need to create your first admin user. HD Homey has a dedicated setup page for this.

### Steps to Create Your First User

1. **Navigate to the Get Started page:**
   ```
   http://localhost:3000/get-started
   ```

2. **Fill out the form:**
   - **Username:** Your desired username (e.g., `admin`)
   - **Display Name:** Your full name (e.g., `John Smith`)
   - **Password:** A strong password (minimum 8 characters)

3. **Click "Create Admin Account"**

4. **You'll be redirected to the sign-in page** - use the username/password you just created

## How It Works

The get-started page uses Better-Auth's `signUpEmail` API, mapping the username to the email field:

```typescript
await auth.api.signUpEmail({
    body: {
        email: username,        // Username goes into email field
        password: password,
        name: name,
        role: AuthRoles.Admin,  // First user is always admin
    },
});
```

## For Existing Installations

If you had users before the migration, the migration SQL script should have:
- Migrated data from `users` table to `user` table  
- Copied `username` to `email` field
- Migrated passwords to the `account` table

Check the migration file: `migrations/0002_better_auth_migration.sql`

## Verification

After creating your user, you can verify it was created correctly:

```bash
sqlite3 data/db/hd_homey.db "SELECT id, email, name, role FROM user;"
```

You should see your user with:
- `email`: Your username
- `name`: Your display name  
- `role`: `admin`

## Username vs Email Field

**Important:** HD Homey still uses "username" terminology in the UI for user-friendliness, but internally it's stored in Better-Auth's `email` field. This mapping happens automatically:

- **Sign-in form:** Shows "Username" label
- **Get-started form:** Shows "Username" label  
- **Behind the scenes:** Username is stored in the `email` column
- **Users never see "email"** - it's an implementation detail

This provides a better user experience while maintaining compatibility with Better-Auth's email-based authentication.
