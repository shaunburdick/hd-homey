# Better-Auth Migration Guide

**Version**: v1.0.0-beta.3  
**Date**: 2025-11-29

---

## Overview

This guide documents the complete migration from NextAuth v5 to Better-Auth 1.1.0 for HD Homey. This was a **clean-slate migration** with breaking changes, appropriate for a beta release.

---

## What Changed

### Authentication Library
- **Before**: NextAuth v5 (beta)
- **After**: Better-Auth 1.1.0 with username plugin

### Password Hashing
- **Before**: bcrypt (10 rounds) - format: `$2b$10$...`
- **After**: scrypt (Better-Auth native) - format: `salt:hash` (hex)

### Database Schema
- **Before**: Separate `users` table, multiple migration files
- **After**: Better-Auth native tables (`user`, `session`, `account`, `verification`) in single schema file

### Session Strategy
- **Before**: JWT sessions via NextAuth
- **After**: JWT sessions via Better-Auth (same strategy, different implementation)

---

## Breaking Changes

⚠️ **IMPORTANT**: This is a breaking migration requiring fresh database initialization.

### 1. Password Format Incompatible
- **Impact**: All existing passwords are invalid
- **Action Required**: Users must recreate accounts
- **Reason**: bcrypt → scrypt hash format incompatible

### 2. Database Schema Changed
- **Impact**: Existing databases cannot be upgraded
- **Action Required**: Fresh database initialization required
- **Reason**: Table names, field names, and structure changed

### 3. Environment Variables
- **Changed**: Recommend using `BETTER_AUTH_URL` (fallback to `NEXTAUTH_URL`)
- **Impact**: Minimal - old `NEXTAUTH_URL` still works as fallback
- **Action Required**: Update to `BETTER_AUTH_URL` in production

### 4. Auth API Endpoints
- **Changed**: Auth endpoints follow Better-Auth convention
- **Impact**: Custom integrations may need updates
- **Action Required**: Test external clients (if any)

---

## Migration Steps

### For Fresh Installs (v1.0.0-beta.3+)

**No migration needed!** Just install and run:

```bash
# Pull latest image
docker compose pull

# Start with fresh database
docker compose up -d

# Create initial admin account at /get-started
```

### For Existing Beta Users (v1.0.0-beta.2 → beta.3)

**Option 1: Fresh Start (Recommended)**

```bash
# Stop containers
docker compose down

# Backup old data (optional)
cp -r data/ data.backup/

# Remove old database
rm -rf data/db/

# Pull new image and start
docker compose pull
docker compose up -d

# Recreate admin account at /get-started
# Re-add tuners
```

**Option 2: Manual Password Reset (Not Recommended)**

There is no automated migration path. All passwords must be reset manually, which is impractical. **Use Option 1 instead.**

---

## Code Changes

### Import Changes

**Before (NextAuth)**:
```typescript
import { auth } from '@/auth';
import { useSession } from '@/lib/auth';
```

**After (Better-Auth)**:
```typescript
import { auth } from '@/lib/auth/auth';
import { useSession } from '@/lib/auth/auth-client';
```

### Session Retrieval

**Before (NextAuth)**:
```typescript
const session = await auth();
```

**After (Better-Auth)**:
```typescript
const session = await auth.api.getSession({
    headers: await headers()
});
```

### Password Functions

**Before (bcrypt)**:
```typescript
import bcrypt from 'bcrypt';

await bcrypt.hash(password, 10);
await bcrypt.compare(password, hash);
```

**After (Better-Auth scrypt)**:
```typescript
import { hashPassword, verifyPassword } from 'better-auth/crypto';

await hashPassword(password);
await verifyPassword({ hash, password });
```

### Schema Changes

**Before (NextAuth)**:
```typescript
// Separate users table
export const users = sqliteTable('users', {
    id: text('id').primaryKey(),
    username: text('username').notNull().unique(),
    // ...
});
```

**After (Better-Auth)**:
```typescript
// Better-Auth native user table
export const user = sqliteTable('user', {
    id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
    username: text('username').unique(),
    email: text('email').notNull().unique(),
    // ... Better-Auth required fields
    // Custom HD Homey fields
    role: text('role').default('viewer').notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
});
```

---

## Testing

All tests updated and passing:

```bash
npm test

# Results:
# ✓ 200/200 tests passing (100%)
# ✓ 16 test files
# ✓ ~2.5s execution time
```

### Key Test Updates

1. **Mock Auth**: Updated to Better-Auth session shape
2. **Password Format**: Updated assertions for scrypt format (`salt:hash`)
3. **User Creation**: Updated to test direct DB inserts
4. **Error Handling**: Added redirect error handling tests

---

## Rollback Plan

### If Issues Found During Testing

**Revert the commits**:
```bash
git revert 7a88558  # docs: final summary
git revert 80a47c6  # docs: documentation updates
git revert 589a76f  # feat: migrate to Better-Auth
```

**Or reset to previous commit**:
```bash
git reset --hard 13e4be1  # Last commit before migration
```

**Restore old database**:
```bash
# If you backed up
rm -rf data/db/
cp -r data.backup/db/ data/db/
```

### If Issues Found in Production

1. **Stop the service immediately**
2. **Revert to v1.0.0-beta.2 image**:
   ```bash
   docker compose down
   docker pull ghcr.io/shaunburdick/hd-homey:1.0.0-beta.2
   # Update compose.yml image tag to 1.0.0-beta.2
   docker compose up -d
   ```
3. **Restore database backup**
4. **Report issue on GitHub**

---

## Verification Checklist

### Before Deploying to Production

- [ ] Fresh install test (create admin, add tuner, watch channel)
- [ ] Sign-in test (username/password works)
- [ ] Sign-out test (session cleared)
- [ ] Admin operations test (create user, manage tuners)
- [ ] Viewer role test (cannot access admin routes)
- [ ] Stream playback test (in-browser and external)
- [ ] Password change test (profile page)
- [ ] Settings page test (stream secret, transcoding)
- [ ] Docker image builds successfully
- [ ] All tests pass in CI
- [ ] Documentation reviewed and accurate

### After Deploying to Production

- [ ] Monitor logs for errors
- [ ] Test user creation flow
- [ ] Verify stream authentication still works
- [ ] Check transcoding sessions
- [ ] Validate admin/viewer permissions
- [ ] Test on mobile devices

---

## Support

### Common Issues

**Issue**: Sign-in fails with "Invalid credentials"
- **Cause**: Old password in database
- **Fix**: Recreate user account

**Issue**: Database errors on startup
- **Cause**: Old schema incompatible
- **Fix**: Fresh database initialization

**Issue**: Tests failing locally
- **Cause**: Node modules out of date
- **Fix**: `npm ci` to reinstall dependencies

### Getting Help

- **Documentation**: See `AGENTS.md` for dev guide
- **GitHub Issues**: https://github.com/shaunburdick/hd-homey/issues
- **Migration Docs**: `.specs/features/008-auth-migration/`

---

## References

### Commits
- `589a76f` - Main migration commit
- `80a47c6` - Documentation updates
- `7a88558` - Final summary

### Files Changed
- **Core Auth**: `src/lib/auth/auth.ts`, `src/lib/user.ts`
- **Schema**: `src/lib/database/schema.ts`
- **Migrations**: `migrations/0000_large_microchip.sql`
- **Actions**: `src/lib/actions/users.ts`, `src/lib/actions/profile.ts`
- **Tests**: All test files updated for Better-Auth

### External Resources
- [Better-Auth Documentation](https://www.better-auth.com/)
- [Better-Auth Migration Guide](https://www.better-auth.com/docs/guides/next-auth-migration-guide)
- [Username Plugin Docs](https://www.better-auth.com/docs/plugins/username)
- [Drizzle Adapter Docs](https://www.better-auth.com/docs/adapters/drizzle)

---

**Migration completed successfully! 🎉**

*Last updated: 2025-11-29*
