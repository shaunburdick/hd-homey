# Clean Slate Migration Summary

## Decision: Drop Old Schema, Adopt Better‑Auth Native Schema (JWT/Stateless)

**Date**: 2025-11-28  
**Session Strategy**: JWT/Stateless (same as NextAuth v5)  
**Rationale**: Since HD Homey is still in beta (v1.0.0-beta.2) with no production users, we can safely perform a clean slate migration that drops the existing `users` table and adopts Better‑Auth's native schema. Using JWT/Stateless sessions provides:

✅ **Native Better‑Auth features** (authentication, security best practices)  
✅ **Future-proof architecture** (easy to add plugins: 2FA, passkeys, OAuth)  
✅ **No custom adapter complexity** (use standard Drizzle adapter)  
✅ **Standard upgrade path** (follow Better‑Auth's migration guides)  
✅ **Better API client support** (JWT tokens for Bearer auth)  
✅ **Edge Runtime compatible** (no DB queries for session validation)  
✅ **Same performance as NextAuth** (JWT validation ~1ms)

---

## What Changes

### Database Schema

#### DROPPED (Old Schema)
```sql
DROP TABLE users;
```

Old `users` table fields:
- `id` (integer, auto-increment)
- `username` (text)
- `name` (text)
- `passHash` (text)
- `role` (text enum: 'admin' | 'viewer')
- `is_active` (boolean)
- `created_at`, `modified_at`, `deleted_at` (timestamps)

#### ADDED (Better‑Auth Schema)

**`user` table** (replaces `users`):
- `id` (text/UUID, primary key)
- `name` (text, required)
- `email` (text, unique) – stores username for compatibility
- `emailVerified` (boolean)
- `image` (text, optional)
- `username` (text, unique) – from username plugin, normalized
- `displayUsername` (text) – from username plugin, original case
- `role` (text enum: 'admin' | 'viewer') – **custom field**
- `isActive` (boolean) – **custom field**
- `deletedAt` (timestamp) – **custom field for soft deletes**
- `createdAt`, `updatedAt` (timestamps)

**`account` table** (NEW):
- Stores password hashes and OAuth tokens
- Links to `user.id` via foreign key

~~**`session` table**~~ - **NOT CREATED** (using JWT/Stateless sessions like NextAuth)

**`verification` table** (NEW):
- For email verification (future feature)

---

## Migration Strategy

### Phase 0: Backup
1. **Backup database** before migration:
   ```bash
   mkdir -p ./data/db/backups
   cp ./data/db/hd_homey.db ./data/db/backups/hd_homey_pre_migration_$(date +%Y%m%d_%H%M%S).db
   ```

2. **Document rollback** procedure in `ROLLBACK.md`

### Phase 1: Schema Migration
1. Generate Better‑Auth schema:
   ```bash
   npx @better-auth/cli generate
   ```

2. Update `src/lib/database/schema.ts`:
   - Remove old `users` table
   - Add `user`, `account`, `session`, `verification` tables
   - Add custom fields to `user` table

3. Generate Drizzle migration:
   ```bash
   npm run db:generate
   ```

4. **Review migration SQL** – ensure it drops old `users` table

5. Run migration:
   ```bash
   npm run db:migrate
   ```

### Phase 2: Code Migration
- Replace all `auth()` calls with `auth.api.getSession()`
- Update client components to use `authClient.useSession()`
- Update sign-in flow to use `authClient.signIn.username()`
- Update get-started flow to use `authClient.signUp.email()` with username

### Phase 3: Testing
- Update all test mocks
- Verify get-started flow (creates initial admin)
- Verify role-based access control
- Verify session persistence

---

## Breaking Changes

### For Users
- **ALL existing users will be deleted**
- Must run get-started flow again to create initial admin
- All other users must be re-created by admin

### For Developers
- Import changes: `@/auth` → `@/lib/auth/auth`
- Session shape changes: `session.user.id` is now string (UUID) instead of number
- Auth calls: `await auth()` → `await auth.api.getSession({ headers: await headers() })`
- Client hooks: `useSession()` from `next-auth/react` → `authClient.useSession()` from `better-auth/react`

### For Deployers
- Environment variables:
  - `NEXTAUTH_URL` → `BETTER_AUTH_URL`
  - `AUTH_SECRET` → `BETTER_AUTH_SECRET`
- Database migration required (destructive!)
- Backup database before deploying

---

## Rollback Plan

If migration fails:

1. **Stop application**
2. **Restore database backup**:
   ```bash
   cp ./data/db/backups/hd_homey_pre_migration_*.db ./data/db/hd_homey.db
   ```
3. **Revert Git commit**:
   ```bash
   git revert -m 1 <merge-commit-hash>
   git push origin main
   ```
4. **Restore environment variables**
5. **Restart application**

---

## Advantages of Clean Slate

| Aspect | Old Approach (Compatibility Layer) | Clean Slate (Better‑Auth Native JWT) |
|--------|------------------------------------|--------------------------------------|
| **Complexity** | Custom adapter, field mapping | Standard Drizzle adapter |
| **Future Features** | Hard to add (OAuth, 2FA, etc.) | Easy to add via plugins |
| **Session Storage** | JWT-only sessions | JWT-only sessions (same!) |
| **Maintenance** | Custom code to maintain | Follow Better‑Auth updates |
| **Session Management** | Limited (can't revoke JWT) | Limited (can't revoke JWT) - same tradeoff |
| **API Clients** | Good (JWT) | Better (standard Better‑Auth JWT) |
| **Edge Runtime** | Compatible | Compatible |
| **Data Loss** | None (but stuck with old schema) | Lose test users (acceptable in beta) |

---

## Timeline

- **Phase 0**: Backup (15 min)
- **Phase 1**: Server setup (3 hours)
- **Phase 2**: Client setup (1 hour)
- **Phase 3**: Update server calls (4 hours)
- **Phase 4**: Update client calls (2 hours)
- **Phase 5**: Tests & mocks (3 hours)
- **Phase 6**: Cleanup (1 hour)
- **Phase 7**: Integration testing (2 hours)
- **Phase 8**: Documentation (1 hour)
- **Total**: ~17 hours (~2-3 working days)

---

## Success Criteria

- [ ] Database backup created
- [ ] Migration completes without errors
- [ ] Get-started flow works (creates admin user)
- [ ] Sign-in flow works (username/password)
- [ ] Role-based access works (admin vs viewer)
- [ ] Streaming auth unchanged (HMAC tokens)
- [ ] All 200 tests pass
- [ ] Docker builds successfully
- [ ] Documentation updated with BREAKING CHANGE warnings

---

*This is a **BREAKING CHANGE** but acceptable given beta status. After v1.0 stable release, we would use a compatibility layer instead.*
