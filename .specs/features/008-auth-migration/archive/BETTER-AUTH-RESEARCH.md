# Better Auth Research - Complete Guide

**Date**: Nov 28, 2025  
**Author**: AI Agent  
**Purpose**: Deep research phase for clean Better Auth migration (Phase 0)

This document captures comprehensive findings from Better Auth documentation to guide a proper, test-driven migration from NextAuth v5 to Better Auth.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Core Concepts](#core-concepts)
3. [Database Schema](#database-schema)
4. [User Management Patterns](#user-management-patterns)
5. [Session Management](#session-management)
6. [Authentication Methods](#authentication-methods)
7. [HD Homey Implementation Plan](#hd-homey-implementation-plan)
8. [Testing Strategy](#testing-strategy)
9. [Migration Checklist](#migration-checklist)

---

## Executive Summary

### What is Better Auth?

Better Auth is a **framework-agnostic TypeScript authentication library** that provides comprehensive auth features out of the box. Unlike NextAuth v5 (which is React/Next.js specific), Better Auth can work with any backend framework.

### Key Differences from NextAuth v5

| Feature | NextAuth v5 | Better Auth |
|---------|-------------|-------------|
| **Framework** | Next.js only | Framework-agnostic |
| **Database** | Optional (JWT only) | Optional (JWT only) |
| **Session Strategy** | JWT or Database | JWT or Database |
| **User Creation** | Auto via adapters | Explicit API methods |
| **Type Safety** | Good | Excellent (full inference) |
| **Plugin System** | Limited | Extensive |
| **CLI Tools** | None | Schema generation & migration |

### Current HD Homey Status

**Installed Version**: `better-auth@1.4.3` ✅

**Current Config** (in `src/lib/auth/auth.ts`):
- ✅ Database adapter configured (Drizzle + SQLite)
- ✅ JWT/Stateless sessions (7-day expiry)
- ✅ Username plugin enabled
- ✅ Custom user fields: `role`, `isActive`, `deletedAt`
- ✅ Drizzle instance properly initialized

**Problems**:
- ❌ User creation code is broken (wrong API usage)
- ❌ 8 test files disabled
- ❌ Multiple `@ts-ignore` workarounds
- ❌ Schema may not match Better Auth requirements

---

## Core Concepts

### 1. Installation & Setup

Better Auth requires minimal setup:

```bash
npm install better-auth
```

**Environment Variables**:
```env
BETTER_AUTH_SECRET=<random-32-char-string>
BETTER_AUTH_URL=http://localhost:3000
```

### 2. Auth Instance Creation

**Server-side** (`src/lib/auth/auth.ts`):
```typescript
import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { username } from 'better-auth/plugins';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';

const connection = new Database('./data/hd_homey.db');
const db = drizzle(connection, { schema });

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: 'sqlite',
    }),
    
    emailAndPassword: {
        enabled: true, // Required for username plugin
    },
    
    plugins: [
        username(), // Adds username support
    ],
    
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // Refresh every 24 hours
    },
    
    user: {
        additionalFields: {
            role: {
                type: 'string',
                required: true,
                defaultValue: 'viewer',
                input: false, // Don't allow user to set role
            },
        },
    },
});
```

**Client-side** (`src/lib/auth/auth-client.ts`):
```typescript
'use client';
import { createAuthClient } from 'better-auth/react';
import { usernameClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
    baseURL: window.location.origin,
    plugins: [
        usernameClient(), // Must match server plugin
    ],
});
```

### 3. Route Handler

**Next.js App Router** (`app/api/auth/[...all]/route.ts`):
```typescript
import { auth } from '@/lib/auth/auth';
import { toNextJsHandler } from 'better-auth/next-js';

export const { POST, GET } = toNextJsHandler(auth);
```

---

## Database Schema

### Core Tables Required

Better Auth requires 4 core tables:

#### 1. `user` Table
```sql
CREATE TABLE user (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    emailVerified BOOLEAN NOT NULL DEFAULT 0,
    image TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
);
```

#### 2. `session` Table
```sql
CREATE TABLE session (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    expiresAt INTEGER NOT NULL,
    ipAddress TEXT,
    userAgent TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);
```

#### 3. `account` Table
```sql
CREATE TABLE account (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    accountId TEXT NOT NULL,
    providerId TEXT NOT NULL,
    accessToken TEXT,
    refreshToken TEXT,
    accessTokenExpiresAt INTEGER,
    refreshTokenExpiresAt INTEGER,
    scope TEXT,
    idToken TEXT,
    password TEXT,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL,
    FOREIGN KEY (userId) REFERENCES user(id) ON DELETE CASCADE
);
```

#### 4. `verification` Table
```sql
CREATE TABLE verification (
    id TEXT PRIMARY KEY,
    identifier TEXT NOT NULL,
    value TEXT NOT NULL,
    expiresAt INTEGER NOT NULL,
    createdAt INTEGER NOT NULL,
    updatedAt INTEGER NOT NULL
);
```

### Username Plugin Schema

Adds 2 fields to `user` table:

```sql
ALTER TABLE user ADD COLUMN username TEXT UNIQUE;
ALTER TABLE user ADD COLUMN displayUsername TEXT;
```

### HD Homey Custom Fields

```sql
ALTER TABLE user ADD COLUMN role TEXT NOT NULL DEFAULT 'viewer';
ALTER TABLE user ADD COLUMN isActive INTEGER NOT NULL DEFAULT 1;
ALTER TABLE user ADD COLUMN deletedAt INTEGER;
```

### Schema Generation

Use Better Auth CLI:
```bash
# Generate Drizzle schema
npx @better-auth/cli generate

# Or migrate directly (built-in adapter only)
npx @better-auth/cli migrate
```

---

## User Management Patterns

### ✅ Correct: Sign Up with Username

**Client-side**:
```typescript
const { data, error } = await authClient.signUp.email({
    email: 'user@example.com',
    name: 'John Doe',
    password: 'password123',
    username: 'johndoe', // Username plugin
    role: 'viewer', // Custom field (if input: true)
});
```

**Server-side** (for admin user creation):
```typescript
// Method 1: Use Better Auth API directly
const data = await auth.api.signUpEmail({
    body: {
        email: 'admin@example.com',
        name: 'Admin User',
        password: 'password123',
        username: 'admin',
        role: 'admin', // Custom field
    },
});

// Method 2: Create user + account manually (for more control)
import { getDb } from '@/lib/database/db';
import bcrypt from 'bcrypt';
import crypto from 'crypto';

const db = await getDb();
const userId = crypto.randomUUID();
const hashedPassword = await bcrypt.hash(password, 10);

await db.transaction(async (tx) => {
    // Create user
    await tx.insert(schema.users).values({
        id: userId,
        email,
        name,
        username,
        displayUsername: username,
        role: 'admin',
        isActive: true,
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
    });
    
    // Create credential account
    await tx.insert(schema.accounts).values({
        id: crypto.randomUUID(),
        userId,
        accountId: userId,
        providerId: 'credential',
        password: hashedPassword,
        createdAt: new Date(),
        updatedAt: new Date(),
    });
});
```

### ❌ Wrong: Don't Use Non-existent Methods

```typescript
// WRONG - These don't exist:
await auth.api.signUpUsername(...)        // ❌
await auth.api.createUser(...)            // ❌
await auth.createUser(...)                // ❌
await generateId()                        // ❌ (not exported)
```

### ✅ Correct: Sign In with Username

**Client-side**:
```typescript
const { data, error } = await authClient.signIn.username({
    username: 'johndoe',
    password: 'password123',
});
```

**Server-side**:
```typescript
const data = await auth.api.signInUsername({
    body: {
        username: 'johndoe',
        password: 'password123',
    },
});
```

### ✅ Correct: Update User

**Client-side**:
```typescript
await authClient.updateUser({
    name: 'New Name',
    image: 'https://example.com/avatar.jpg',
    username: 'newusername',
});
```

**Server-side**:
```typescript
await auth.api.updateUser({
    body: {
        name: 'New Name',
    },
    headers: request.headers, // Must include session cookie
});
```

### ✅ Correct: Change Password

```typescript
await authClient.changePassword({
    currentPassword: 'old123',
    newPassword: 'new123',
    revokeOtherSessions: true, // Optional
});
```

### ✅ Correct: Delete User

```typescript
// Enable in config first:
export const auth = betterAuth({
    user: {
        deleteUser: {
            enabled: true,
        },
    },
});

// Then call:
await authClient.deleteUser({
    password: 'current-password', // Required if user has password
});
```

---

## Session Management

### Session Flow

1. **Sign In**: Creates session → Returns session cookie
2. **Validation**: Cookie checked on every request
3. **Refresh**: Session updated when `updateAge` reached
4. **Sign Out**: Session deleted

### Get Session (Server)

```typescript
import { headers } from 'next/headers';
import { auth } from '@/lib/auth/auth';

const session = await auth.api.getSession({
    headers: await headers(),
});

if (session) {
    console.log(session.user.email);
    console.log(session.user.role); // Custom field
}
```

### Get Session (Client)

```typescript
'use client';
import { authClient } from '@/lib/auth/auth-client';

// Hook (reactive)
const { data: session } = authClient.useSession();

// Function (one-time)
const session = await authClient.getSession();
```

### Session Expiration

```typescript
export const auth = betterAuth({
    session: {
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // Refresh every 24 hours
        freshAge: 60 * 60 * 24, // Fresh session = 1 day
    },
});
```

- **expiresIn**: Total session lifetime
- **updateAge**: How often to refresh session in DB
- **freshAge**: How recent session must be for sensitive operations

### JWT/Stateless Sessions

```typescript
export const auth = betterAuth({
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 60 * 60 * 24 * 7, // 7 days
            strategy: 'compact', // or 'jwt' or 'jwe'
        },
    },
});
```

**Strategies**:
- `compact`: Base64url + HMAC (smallest, fastest)
- `jwt`: Standard JWT (interoperable)
- `jwe`: Encrypted JWT (most secure)

### Revoking Sessions

```typescript
// Revoke single session
await authClient.revokeSession({ token: 'session-token' });

// Revoke all other sessions
await authClient.revokeOtherSessions();

// Revoke all sessions
await authClient.revokeSessions();
```

---

## Authentication Methods

### Username Plugin

**Server Config**:
```typescript
import { username } from 'better-auth/plugins';

export const auth = betterAuth({
    emailAndPassword: {
        enabled: true, // Required!
    },
    plugins: [
        username({
            minUsernameLength: 3,
            maxUsernameLength: 30,
            usernameValidator: (username) => {
                // Only alphanumeric, underscore, dot
                return /^[a-zA-Z0-9_.]+$/.test(username);
            },
            usernameNormalization: (username) => {
                return username.toLowerCase();
            },
        }),
    ],
});
```

**Client Config**:
```typescript
import { usernameClient } from 'better-auth/client/plugins';

export const authClient = createAuthClient({
    plugins: [usernameClient()],
});
```

**Usage**:
```typescript
// Sign up
await authClient.signUp.email({
    email: 'user@example.com',
    name: 'User',
    password: 'pass123',
    username: 'user123',
    displayUsername: 'User123', // Optional
});

// Sign in
await authClient.signIn.username({
    username: 'user123',
    password: 'pass123',
});

// Check availability
const { data } = await authClient.isUsernameAvailable({
    username: 'newuser',
});
```

---

## HD Homey Implementation Plan

### Phase 1: Schema Migration

#### 1.1 Generate Better Auth Schema

```bash
npx @better-auth/cli generate
```

This will create Drizzle schema for:
- Core tables (user, session, account, verification)
- Username plugin fields (username, displayUsername)
- Preserve custom fields (role, isActive, deletedAt)

#### 1.2 Review Generated Schema

Compare with current `src/lib/database/schema.ts`:
- ✅ Keep existing user fields
- ✅ Add missing Better Auth fields
- ✅ Update relationships/indexes
- ✅ Verify foreign keys

#### 1.3 Create Migration

```bash
npm run db:generate
```

#### 1.4 Apply Migration

```bash
npm run db:migrate
```

### Phase 2: User Creation Fixes

#### 2.1 Fix Get Started Flow

**File**: `src/app/(start)/get-started/actions.ts`

**Current (Broken)**:
```typescript
// ❌ WRONG - generateId doesn't exist
const userId = generateId();
```

**Fix**:
```typescript
import crypto from 'crypto';

// Method 1: Use Better Auth API
const result = await auth.api.signUpEmail({
    body: {
        email: formData.get('email'),
        name: formData.get('name'),
        password: formData.get('password'),
        username: formData.get('username'),
        role: AuthRoles.Admin, // First user is admin
    },
});

// Method 2: Manual creation (if you need custom logic)
const userId = crypto.randomUUID();
// ... rest of creation logic
```

#### 2.2 Fix User Management Actions

**File**: `src/lib/actions/users.ts`

**Current (Broken)**:
```typescript
// ❌ WRONG
const userId = generateId();
role: role as string, // ❌ Wrong cast
```

**Fix**:
```typescript
import crypto from 'crypto';
import { AuthRoles } from '@/lib/auth-roles';

// For admin-created users
const userId = crypto.randomUUID();
role: role as AuthRoles, // ✅ Correct cast

// Or use Better Auth API
const result = await auth.api.signUpEmail({
    body: { ... },
});
```

### Phase 3: Authentication Helpers

#### 3.1 Server-side Session Helper

**File**: `src/lib/auth/helpers.ts`

```typescript
import { headers } from 'next/headers';
import { auth } from './auth';
import type { Session } from './auth';

/**
 * Get current session (server-side)
 * @returns Session or null
 */
export async function getServerSession(): Promise<Session | null> {
    const session = await auth.api.getSession({
        headers: await headers(),
    });
    
    if (!session) return null;
    
    return session as Session;
}

/**
 * Require authenticated session (server-side)
 * @throws Error if not authenticated
 */
export async function requireServerSession(): Promise<Session> {
    const session = await getServerSession();
    
    if (!session) {
        throw new Error('Unauthorized');
    }
    
    return session;
}

/**
 * Require admin session (server-side)
 * @throws Error if not admin
 */
export async function requireAdminSession(): Promise<Session> {
    const session = await requireServerSession();
    
    if (session.user.role !== 'admin') {
        throw new Error('Forbidden: Admin access required');
    }
    
    return session;
}
```

#### 3.2 Client-side Session Hook

Already exported from `auth-client.ts`:
```typescript
export const { useSession } = authClient;
```

Usage:
```typescript
const { data: session, isPending, error } = useSession();
```

### Phase 4: Testing Strategy

#### 4.1 Schema Tests

**File**: `src/lib/database/schema.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { users, sessions, accounts, verification } from './schema';

describe('Better Auth Schema', () => {
    it('should have all required Better Auth fields', () => {
        // Test user table
        expect(users.id).toBeDefined();
        expect(users.email).toBeDefined();
        expect(users.username).toBeDefined();
        expect(users.role).toBeDefined();
        
        // Test session table
        expect(sessions.userId).toBeDefined();
        expect(sessions.token).toBeDefined();
        
        // Test account table
        expect(accounts.password).toBeDefined();
        expect(accounts.providerId).toBeDefined();
    });
});
```

#### 4.2 User Creation Tests

**File**: `src/lib/actions/users.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { createUser } from './users';

describe('User Creation', () => {
    beforeEach(async () => {
        // Clean test database
    });
    
    it('should create user with username', async () => {
        const result = await createUser({
            email: 'test@example.com',
            username: 'testuser',
            password: 'password123',
            name: 'Test User',
            role: 'viewer',
        });
        
        expect(result.user.username).toBe('testuser');
        expect(result.user.role).toBe('viewer');
    });
    
    it('should hash password', async () => {
        // Test that password is hashed in account table
    });
    
    it('should normalize username', async () => {
        const result = await createUser({
            username: 'TestUser',
            // ...
        });
        
        expect(result.user.username).toBe('testuser');
        expect(result.user.displayUsername).toBe('TestUser');
    });
});
```

#### 4.3 Sign-in Tests

**File**: `src/app/users/signin/actions.test.ts`

```typescript
import { describe, it, expect } from 'vitest';
import { signInAction } from './actions';

describe('Sign In', () => {
    it('should sign in with username', async () => {
        // Create test user first
        
        const result = await signInAction({
            username: 'testuser',
            password: 'password123',
        });
        
        expect(result.success).toBe(true);
    });
    
    it('should reject invalid credentials', async () => {
        const result = await signInAction({
            username: 'testuser',
            password: 'wrongpass',
        });
        
        expect(result.errors).toBeDefined();
    });
});
```

### Phase 5: Manual Testing Checklist

#### User Registration
- [ ] Navigate to `/get-started`
- [ ] Create first admin user
- [ ] Verify redirect to dashboard
- [ ] Check session exists in DevTools cookies
- [ ] Verify user in database

#### User Sign In
- [ ] Navigate to `/users/signin`
- [ ] Sign in with username
- [ ] Verify redirect
- [ ] Check session cookie
- [ ] Test "Remember me" checkbox

#### Admin Functions
- [ ] Create new user as admin
- [ ] Edit user details
- [ ] Change user role
- [ ] Deactivate user
- [ ] Reactivate user
- [ ] Delete user

#### Session Management
- [ ] Sign out
- [ ] Verify session cleared
- [ ] Test session expiration
- [ ] Test session refresh

#### Password Management
- [ ] Change password
- [ ] Verify old password no longer works
- [ ] Verify new password works
- [ ] Test "revoke other sessions"

---

## Migration Checklist

### Pre-Migration

- [x] Read Better Auth documentation
- [ ] Generate schema with CLI
- [ ] Review schema differences
- [ ] Create database backup

### Database

- [ ] Generate Drizzle schema: `npx @better-auth/cli generate`
- [ ] Review generated schema
- [ ] Create migration: `npm run db:generate`
- [ ] Apply migration: `npm run db:migrate`
- [ ] Verify all tables exist
- [ ] Verify all indexes exist

### Auth Configuration

- [x] Better Auth installed (v1.4.3)
- [x] Auth instance configured
- [x] Username plugin enabled
- [x] Custom fields configured
- [ ] Verify API route handler

### User Management

- [ ] Fix `src/app/(start)/get-started/actions.ts`
- [ ] Fix `src/lib/actions/users.ts`
- [ ] Fix `src/lib/actions/profile.ts`
- [ ] Test user creation
- [ ] Test user updates
- [ ] Test password changes

### Authentication

- [ ] Fix sign-in action
- [ ] Test username sign-in
- [ ] Test sign-out
- [ ] Test session validation
- [ ] Test role checks

### Testing

- [ ] Re-enable `src/lib/database/schema.test.ts`
- [ ] Re-enable `src/lib/actions/users.test.ts`
- [ ] Re-enable `src/lib/actions/profile.test.ts`
- [ ] Re-enable all other disabled tests
- [ ] All tests passing
- [ ] No `@ts-ignore` needed

### Manual Testing

- [ ] Get Started flow
- [ ] Sign In flow
- [ ] Sign Out flow
- [ ] User CRUD operations
- [ ] Password management
- [ ] Session management
- [ ] Role-based access

### Documentation

- [ ] Update AGENTS.md
- [ ] Update relevant specs
- [ ] Remove migration temp docs
- [ ] Update CHANGELOG.md

---

## Key Takeaways

### ✅ Do This

1. **Use Better Auth API methods**:
   - `auth.api.signUpEmail()` for user creation
   - `auth.api.signInUsername()` for sign-in
   - `auth.api.getSession()` for session retrieval

2. **Use standard Node.js/Web APIs**:
   - `crypto.randomUUID()` for ID generation
   - `bcrypt.hash()` for password hashing
   - `headers()` from Next.js for getting request headers

3. **Test everything immediately**:
   - Don't disable tests
   - Write tests before code
   - Test against real database (with setup/teardown)

4. **Follow Better Auth patterns**:
   - Client uses `authClient.signIn.username()`
   - Server uses `auth.api.signInUsername()`
   - Session from `auth.api.getSession({ headers })`

### ❌ Don't Do This

1. **Don't use non-existent APIs**:
   - No `auth.api.signUpUsername()`
   - No `auth.createUser()`
   - No `generateId()` import

2. **Don't disable tests to hide problems**:
   - Fix the root cause
   - Update test expectations
   - Re-run until passing

3. **Don't use `@ts-ignore` as bandaid**:
   - Fix the actual type error
   - Add proper type definitions
   - Use correct imports

4. **Don't skip documentation reading**:
   - Read official docs thoroughly
   - Follow exact examples
   - Verify method signatures

---

## Next Steps

With this research complete, we can now:

1. ✅ Skip proof-of-concept (config already correct)
2. ➡️ Generate proper schema with CLI
3. ➡️ Fix user creation code
4. ➡️ Re-enable and fix all tests
5. ➡️ Manual testing
6. ➡️ Documentation updates

**Estimated Time**: 8-10 hours (down from 14 with existing config)

---

## References

- [Better Auth Documentation](https://www.better-auth.com/docs)
- [Better Auth Installation](https://www.better-auth.com/docs/installation)
- [Username Plugin](https://www.better-auth.com/docs/plugins/username)
- [Database Schema](https://www.better-auth.com/docs/concepts/database)
- [Session Management](https://www.better-auth.com/docs/concepts/session-management)
- [User Management](https://www.better-auth.com/docs/concepts/users-accounts)
