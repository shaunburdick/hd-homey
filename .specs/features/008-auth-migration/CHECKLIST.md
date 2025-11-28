# Quick Implementation Checklist

Use this as a quick reference while implementing the migration.

## Pre-Migration

- [x] Read `CLEAN-SLATE-SUMMARY.md`
- [x] Review `spec.md` and `plan.md`
- [x] Backup database: `cp ./data/db/hd_homey.db ./data/db/backups/hd_homey_$(date +%Y%m%d_%H%M%S).db`
- [x] Create feature branch: `git checkout -b 008-auth-migration`

## Installation

- [x] Install Better‑Auth: `npm install better-auth`
- [x] Set env vars: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL` (reusing existing AUTH_SECRET)

## Schema Migration

- [x] Generate Better‑Auth schema: Created manually based on Better-Auth requirements
- [x] Update `src/lib/database/schema.ts`:
  - Drop `users` table
  - Add `user`, `account`, `verification` tables
  - **NO `session` table** (using JWT/Stateless)
  - Add custom fields to `user` table: `role`, `isActive`, `deletedAt`
- [x] Generate migration: Created `0002_better_auth_migration.sql` manually
- [x] Review migration SQL (should DROP `users` table, create 3 new tables)
- [x] Run migration: Applied manually via sqlite3

## Server Setup

- [x] Create `src/lib/auth/auth.ts`:
  - Better‑Auth instance with emailAndPassword
  - **JWT/Stateless session config** (same as NextAuth)
  - Cookie cache with 7-day JWT
  - Custom user fields: `role`, `isActive`, `deletedAt`
- [x] Create `src/lib/auth/types.ts` (type exports)
- [x] Create `src/lib/auth/helpers.ts` (requireRole, requireAdmin)
- [x] Update API route handler: `src/app/api/auth/[...all]/route.ts`

## Client Setup

- [x] Create `src/lib/auth/auth-client.ts` (React client)
- [x] Update `src/components/nav.tsx` (use `authClient.useSession()`)
- [x] Update `src/components/RoleGuard.tsx` (use `authClient.useSession()`)
- [x] Remove `src/components/SessionProvider.tsx` (Better-Auth doesn't need provider)

## Server-Side Updates

- [x] Update `src/proxy.ts` (use `auth.api.getSession()`)
- [x] Update `src/lib/actions/profile.ts`
- [x] Update `src/lib/actions/settings.ts`
- [x] Update `src/lib/actions/transcoding.ts`
- [x] Update `src/app/api/tuners/[id]/route.ts`
- [x] Update `src/app/api/tuners/[id]/poll/route.ts`
- [x] Update `src/app/api/transcode/status/route.ts`
- [x] Find all `auth()` calls: `rg "await auth\(\)" --type ts`
- [x] Replace with `auth.api.getSession({ headers: await headers() })`

## Client-Side Updates

- [x] Update sign-in page (`src/app/users/signin/page.tsx`)
- [x] Update get-started page (`src/app/(start)/get-started/actions.ts`)
- [x] Replace `signIn()` with `authClient.signIn.email()`
- [x] Replace `signOut()` with `authClient.signOut()`

## Tests & Mocks

- [x] Update `src/test-utils/mock-auth.ts` (mock Better‑Auth session)
- [x] Update `src/proxy.test.ts`
- [x] Update `src/lib/actions/profile.test.ts`
- [x] Update `src/lib/auth.test.ts`
- [x] Fix linting errors (import order, nullish coalescing, etc.)
- [ ] Run full test suite: `npm test`
- [ ] Fix any remaining test failures

## Cleanup

- [x] Remove `src/auth.ts` (old NextAuth config)
- [x] Remove `src/lib/auth.ts` (old auth helpers)
- [x] Remove `src/components/SessionProvider.tsx` (not needed)
- [x] Update all imports from `@/auth` to `@/lib/auth/auth`
- [x] Uninstall NextAuth: `npm uninstall next-auth`
- [x] Search for remaining NextAuth imports: No imports found
- [ ] Run build: `npm run build`
- [ ] Run tests: `npm test`

## Documentation

- [ ] Update `README.md` (replace NextAuth → Better‑Auth)
- [ ] Update `AGENTS.md` (update auth patterns)
- [ ] Update `CHANGELOG.md` (add BREAKING CHANGE entry)
- [ ] Create migration guide (`.specs/features/008-auth-migration/MIGRATION.md`)

## Testing

### Manual QA - Web UI
- [ ] Get-started flow (create admin)
- [ ] Sign-in flow (username/password)
- [ ] Role-based access (admin vs viewer)
- [ ] Streaming (HMAC tokens unchanged)
- [ ] Sign-out flow
- [ ] Session persistence (refresh page)

### Manual QA - API
- [ ] Unauthenticated API call returns 401
- [ ] Sign-in via API (`POST /api/auth/sign-in/username`)
- [ ] Authenticated GET request with cookie
- [ ] Admin-only endpoint as admin (success)
- [ ] Admin-only endpoint as viewer (403 Forbidden)
- [ ] Sign-out via API
- [ ] Session persists across multiple requests

### Docker
- [ ] Docker build: `docker build -t hd-homey:test .`
- [ ] Docker run: `docker run -p 3000:3000 --env-file .env hd-homey:test`

## Pre-Merge

- [ ] All tests pass: `npm test`
- [ ] Lint passes: `npm run lint`
- [ ] Build succeeds: `npm run build`
- [ ] Docker builds: `docker compose build`
- [ ] Manual QA complete
- [ ] Documentation updated
- [ ] Spec status: IMPLEMENTED

## Merge & Release

- [ ] Merge to main: `git merge 008-auth-migration`
- [ ] Tag release: `git tag v1.0.0-beta.3`
- [ ] Push: `git push origin main --tags`
- [ ] Monitor CI: Check GitHub Actions
- [ ] Verify Docker image: `docker pull ghcr.io/shaunburdick/hd-homey:v1.0.0-beta.3`

## Post-Deployment

- [ ] Monitor logs for auth errors
- [ ] Test get-started flow in production
- [ ] Verify streaming still works
- [ ] Update project status in `.specs/FEATURE-STATUS.md`

---

## Quick Commands Reference

```bash
# Backup database
cp ./data/db/hd_homey.db ./data/db/backups/hd_homey_$(date +%Y%m%d_%H%M%S).db

# Install Better-Auth
npm install better-auth

# Generate schema
npx @better-auth/cli generate

# Generate migration
npm run db:generate

# Run migration
npm run db:migrate

# Find auth() calls
rg "await auth\(\)" --type ts

# Find NextAuth imports
rg "next-auth" --type ts

# Run tests
npm test

# Build
npm run build

# Docker
docker compose build
docker compose up -d
docker compose logs -f
```

---

## Rollback (If Needed)

```bash
# Stop app
docker compose down

# Restore database
cp ./data/db/backups/hd_homey_*.db ./data/db/hd_homey.db

# Revert git
git revert -m 1 <merge-commit-hash>

# Restore env vars
# NEXTAUTH_URL=...
# AUTH_SECRET=...

# Restart
docker compose up -d
```
