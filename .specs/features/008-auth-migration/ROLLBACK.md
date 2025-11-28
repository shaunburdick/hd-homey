# Rollback Instructions

If the migration fails or causes issues, follow these steps to rollback:

## Quick Rollback

```bash
# 1. Stop the application
docker compose down
# OR if running locally
pkill -f "next"

# 2. Restore database backup
cp ./data/db/backups/hd_homey_pre_migration_*.db ./data/db/hd_homey.db

# 3. Revert code changes
git checkout main

# 4. Reinstall dependencies
npm ci

# 5. Restart application
docker compose up -d
# OR if running locally
npm run dev
```

## Detailed Rollback Steps

### 1. Stop the Application

**Docker**:
```bash
docker compose down
```

**Local Development**:
```bash
# Find and kill the Next.js process
pkill -f "next"
```

### 2. Restore Database

The pre-migration database backup is located in `./data/db/backups/`.

```bash
# List available backups
ls -lh ./data/db/backups/

# Restore the pre-migration backup
# Replace the timestamp with your actual backup file
cp ./data/db/backups/hd_homey_pre_migration_YYYYMMDD_HHMMSS.db ./data/db/hd_homey.db

# Verify restoration
sqlite3 ./data/db/hd_homey.db "SELECT name FROM sqlite_master WHERE type='table';"
# Should show: users, tuners, channels, settings (old schema)
```

### 3. Revert Code Changes

**If migration branch not merged**:
```bash
git checkout main
```

**If migration branch already merged**:
```bash
# Revert the merge commit
git revert -m 1 <merge-commit-hash>
git push origin main
```

**Find merge commit hash**:
```bash
git log --oneline --merges | grep "008-auth-migration"
```

### 4. Restore Environment Variables

Edit `.env` and restore NextAuth variables:

```bash
# Old NextAuth variables
NEXTAUTH_URL=http://localhost:3000
AUTH_SECRET=your-secret-here

# Remove Better-Auth variables
# BETTER_AUTH_SECRET=...
# BETTER_AUTH_URL=...
```

### 5. Reinstall Dependencies

```bash
# This will restore next-auth and remove better-auth
npm ci
```

### 6. Restart Application

**Docker**:
```bash
docker compose build
docker compose up -d

# Check logs
docker compose logs -f
```

**Local Development**:
```bash
npm run dev
```

### 7. Verify Rollback

**Check database schema**:
```bash
sqlite3 ./data/db/hd_homey.db ".schema users"
# Should show old users table with: id, username, name, passHash, role, etc.
```

**Test sign-in**:
1. Navigate to http://localhost:3000/users/signin
2. Sign in with existing credentials
3. Verify you can access protected routes

**Check logs**:
```bash
# Docker
docker compose logs -f | grep -i "auth\|error"

# Local
# Check terminal output for errors
```

## Troubleshooting

### Database Restored But App Won't Start

**Issue**: NextAuth not installed
```bash
npm install next-auth@5.0.0-beta.30
npm run build
```

### "Table 'users' does not exist" Error

**Issue**: Database not restored correctly
```bash
# Verify backup exists
ls -lh ./data/db/backups/

# Try restore again
cp ./data/db/backups/hd_homey_pre_migration_*.db ./data/db/hd_homey.db

# Check schema
sqlite3 ./data/db/hd_homey.db "SELECT name FROM sqlite_master WHERE type='table';"
```

### Sign-In Still Fails After Rollback

**Issue**: Environment variables not updated
```bash
# Verify .env has NextAuth variables
grep -E "NEXTAUTH|AUTH_SECRET" .env

# Restart app after updating .env
docker compose restart
```

### Code Still References Better-Auth

**Issue**: Git revert incomplete
```bash
# Check for better-auth imports
rg "better-auth" --type ts

# If found, you're still on the migration branch
git status
git checkout main
```

## Prevention

To avoid needing rollback:

1. **Always backup before migration**
2. **Test migration on local copy first**
3. **Verify all tests pass before deploying**
4. **Monitor logs after deployment**
5. **Have rollback plan ready**

## Support

If rollback fails or you need help:

1. Check GitHub Issues: https://github.com/shaunburdick/hd-homey/issues
2. Review migration spec: `.specs/features/008-auth-migration/spec.md`
3. Contact maintainer with logs and error messages

---

**Last Updated**: 2025-11-28
