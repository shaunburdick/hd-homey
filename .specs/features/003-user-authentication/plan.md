# Implementation Plan: User Authentication & Authorization

**Feature ID**: `003-user-authentication`  
**Spec**: [spec.md](./spec.md)  
**Date**: 2025-11-15  
**Status**: Complete ✅  
**Completed**: 2025-11-15

## Current Status

### ✅ What's Already Implemented

1. **Database Schema** (`src/lib/database/schema.ts`)
   - Users table with all required fields
   - Unique constraint on username
   - Role enum support

2. **NextAuth.js Setup** (`src/auth.ts`)
   - Credentials provider configured
   - Password verification logic
   - User lookup from database

3. **Sign In Page** (`src/app/users/signin/page.tsx`)
   - Form with username/password
   - Error handling for invalid credentials
   - Working signin action

4. **User Pages** (Protected)
   - User list page (`/users`)
   - Create user page (`/users/new`)
   - User detail page (`/users/[id]`)

5. **User Actions** (`src/lib/actions/users.ts`)
   - `createUser()` with validation
   - `signin()` wrapper

6. **Business Logic** (`src/lib/user.ts`)
   - Password hashing with bcrypt
   - Password verification

7. **Get-Started Layout** (`src/app/(start)/layout.tsx`)
   - Checks if users exist
   - Blocks access if already configured

### ❌ What's Missing

1. **Authentication Middleware** - Currently only has logging, no auth check
2. **Session with Role** - Session callback doesn't include user role
3. **Get-Started Page Logic** - Empty page, needs user creation form
4. **Role Guard Component** - Referenced in spec but not created
5. **Protected Routes Check** - Middleware doesn't redirect unauthenticated users
6. **Initial Setup Redirect** - No redirect to get-started when no users exist

## Implementation Tasks

### Phase 1: Fix NextAuth Session (Est: 15 min)

**Problem**: Session doesn't include user role for authorization

- [ ] Update `src/auth.ts` session callback to include role
- [ ] Add JWT callback to persist role in token
- [ ] Test that session includes `user.role`

**Files to modify**:
- `src/auth.ts`

**Expected result**:
```typescript
// Session shape after fix
{
  user: {
    id: string,
    username: string,
    name: string,
    role: "admin" | "viewer"
  }
}
```

---

### Phase 2: Implement Authentication Middleware (Est: 20 min)

**Problem**: Routes aren't protected - anyone can access without signing in

- [ ] Replace logging middleware with NextAuth middleware
- [ ] Configure protected vs public routes
- [ ] Add redirect logic for unauthenticated users
- [ ] Handle initial setup flow (redirect to get-started if no users)

**Files to modify**:
- `src/middleware.ts`

**Routes**:
- **Public**: `/users/signin`, `/get-started`, `/api/auth/*`
- **Protected**: Everything else

---

### Phase 3: Complete Get-Started Page (Est: 30 min)

**Problem**: Page exists but is empty - no way to create first user

- [ ] Create form for first admin user
- [ ] Use `createUser` action with role hardcoded to "admin"
- [ ] Add validation and error display
- [ ] Redirect to signin after user creation
- [ ] Add welcome message and instructions

**Files to modify**:
- `src/app/(start)/get-started/page.tsx`

**Form fields**:
- Username (required)
- Name (required)
- Password (required)
- Role: hardcoded to "admin" (hidden field)

---

### Phase 4: Create RoleGuard Component (Est: 15 min)

**Problem**: Need component to conditionally show/hide admin-only UI

- [ ] Create `src/components/RoleGuard.tsx`
- [ ] Use `useSession()` to get current user role
- [ ] Show children only if role matches
- [ ] Add loading state

**Files to create**:
- `src/components/RoleGuard.tsx`

**Usage**:
```typescript
<RoleGuard allowedRoles={['admin']}>
  <Link href="/tuners/new">Add Tuner</Link>
</RoleGuard>
```

---

### Phase 5: Add Role-Based UI Guards (Est: 20 min)

**Problem**: Viewers can see admin controls (create/edit links)

- [ ] Add RoleGuard to "Add Tuner" link
- [ ] Add RoleGuard to "Edit Tuner" link
- [ ] Add RoleGuard to "Add User" link
- [ ] Add RoleGuard to "Refresh Channels" button
- [ ] Test as Viewer role

**Files to modify**:
- `src/app/(protected)/tuners/page.tsx`
- `src/app/(protected)/tuners/[id]/page.tsx`
- `src/app/(protected)/users/page.tsx`

---

### Phase 6: Add Server-Side Authorization (Est: 25 min)

**Problem**: Server actions don't check user role before mutations

- [ ] Create helper function to get session server-side
- [ ] Check role in `createTuner` action
- [ ] Check role in `createUser` action
- [ ] Return proper error if not authorized
- [ ] Test that Viewers get errors when trying admin actions

**Files to modify**:
- `src/app/(protected)/tuners/actions.ts`
- `src/lib/actions/users.ts`

**Helper to create**:
```typescript
// src/lib/auth.ts
export async function requireRole(role: AuthRoles) {
  const session = await auth();
  if (!session?.user?.role || session.user.role !== role) {
    throw new Error('Unauthorized');
  }
  return session;
}
```

---

### Phase 7: Testing & Validation (Est: 30 min)

- [ ] Test: Cannot access protected routes when not signed in
- [ ] Test: Redirected to `/users/signin` when unauthenticated
- [ ] Test: First-run redirects to `/get-started`
- [ ] Test: Can create first admin user via get-started
- [ ] Test: Cannot access `/get-started` after first user created
- [ ] Test: Admin can see all controls
- [ ] Test: Viewer cannot see admin controls
- [ ] Test: Viewer gets error trying to use server actions
- [ ] Test: Session includes user role
- [ ] Test: Sign out works

---

## Constitution Compliance

- ✅ NextAuth.js v5 (not v4)
- ✅ Credentials provider
- ✅ Bcrypt password hashing
- ✅ Next.js middleware for route protection
- ✅ Server actions for mutations
- ✅ Soft-delete pattern
- ✅ TypeScript strict mode

## Security Checklist

- [ ] Passwords hashed with bcrypt before storage
- [ ] Session tokens securely generated (NextAuth handles)
- [ ] No passwords in logs or error messages
- [ ] Generic error messages for invalid login
- [ ] All protected routes check authentication
- [ ] Server actions check authorization
- [ ] SQL injection prevented (Drizzle ORM)
- [ ] XSS prevented (React escaping)

## Testing Commands

```bash
# Run linter
npm run lint

# Run tests
npm test

# Build
npm run build

# Test manually
npm run dev
# Visit http://localhost:3000 (should redirect to get-started or signin)
```

## Rollback Plan

If issues arise:
1. Revert middleware changes first (most risky)
2. Keep auth.ts changes (safe improvements)
3. Get-started page can be disabled by removing layout guard

## Open Questions

- ✅ Should viewers be able to create channels? **No - admin only**
- ✅ Should we allow password changes? **Out of scope for now**
- ✅ Should we log authentication attempts? **Basic logging only**

---

**Ready to implement! Start with Phase 1.**
