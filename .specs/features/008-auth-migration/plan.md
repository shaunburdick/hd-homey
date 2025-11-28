# Implementation Plan: NextAuth → Better‑Auth Migration

**Feature ID**: `008-auth-migration`  
**Spec**: [spec.md](./ spec.md)  
**Date**: 2025-11-28  
**Branch**: `008-auth-migration`

## Summary

Complete migration from NextAuth v5 to Better‑Auth using username-based authentication with **JWT/Stateless sessions**. This is a **clean slate migration** that replaces the existing `users` table with Better‑Auth's native schema (minus the session table - sessions remain stateless like NextAuth), targeting the latest Better‑Auth release with 100% test coverage. Since the project is still in beta (no production users), we can safely drop and recreate the auth schema.

**Session Strategy**: JWT/Stateless (same as current NextAuth) for better API client support and Edge Runtime compatibility.

## Technical Context

**Framework**: Next.js 16.0.3 + React 19.2.0 + TypeScript 5  
**Database**: SQLite with Drizzle ORM (better-sqlite3)  
**Current Auth**: NextAuth.js v5.0.0-beta.30 (JWT sessions, Credentials provider)  
**Target Auth**: Better‑Auth (latest, username plugin + **JWT/Stateless sessions**)  
**Migration Type**: **Clean slate** (drop & recreate users table, NO session table)  
**Session Strategy**: **JWT/Stateless** (same as NextAuth) - better for API clients  
**Styling**: new.css (classless)  
**Testing**: Vitest + React Testing Library  
**Deployment**: Docker + Edge Runtime compatibility ✅

## Constitution Check

Review against HD Homey Constitution:

- [x] ✅ Follows Next.js app router conventions (API routes under `/app/api/auth/[...all]/route.ts`)
- [x] ✅ Uses server components by default (no changes to component structure)
- [x] ✅ Server actions for mutations (auth operations remain server-side)
- [x] ✅ TypeScript strict mode compliance (Better‑Auth has full TS support)
- [x] ✅ Drizzle ORM for database access (using Drizzle adapter for Better‑Auth)
- [x] ⚠️ ~~TypeBox validation~~ (Better‑Auth has built-in validation; we'll keep TypeBox for business logic)
- [x] ✅ Unit tests for business logic (migrate all existing auth tests)
- [x] ✅ Soft deletes for data (users table already has `deleted_at`)
- [x] ✅ Authentication required (proxy/middleware continues to enforce)
- [x] ✅ Mobile responsive (no UI changes)

**Violations/Justifications**: Better‑Auth provides its own input validation for auth endpoints, so we won't use TypeBox for those specific routes. All other business logic continues to use TypeBox.

## Architecture

### Key Differences: NextAuth vs Better‑Auth

| Aspect | NextAuth v5 | Better‑Auth |
|--------|-------------|-------------|
| **Session retrieval (server)** | `await auth()` | `await auth.api.getSession({ headers: await headers() })` |
| **Session retrieval (client)** | `useSession()` from `next-auth/react` | `authClient.useSession()` from `better-auth/react` |
| **Sign in (server)** | `await signIn("credentials", ...)` | `await auth.api.signInEmail({ body: { ... } })` |
| **Sign out (server)** | `await signOut()` | `await auth.api.signOut({ headers: await headers() })` |
| **Sign out (client)** | `await signOut()` | `await authClient.signOut()` |
| **Provider config** | `providers: [Credentials({ ... })]` | `emailAndPassword: { enabled: true }` + username plugin |
| **Route handler** | `export const { GET, POST } = handlers` | `export const { GET, POST } = toNextJsHandler(auth)` |
| **Types** | `import type { Session } from 'next-auth'` | `import type { Session } from 'better-auth'` |

### Directory Structure

```
src/
├── lib/
│   ├── auth/
│   │   ├── auth.ts                     # Better‑Auth server instance (NEW)
│   │   ├── auth-client.ts              # Better‑Auth React client (NEW)
│   │   ├── helpers.ts                  # requireRole/requireAdmin (UPDATED)
│   │   └── types.ts                    # Auth type re-exports (NEW)
│   ├── auth-roles.ts                   # AuthRoles enum (UNCHANGED)
│   └── user.ts                         # Password utilities (UNCHANGED)
├── app/
│   ├── api/
│   │   └── auth/
│   │       └── [...all]/
│   │           └── route.ts            # Better‑Auth handler (UPDATED)
│   └── (protected)/                    # Protected routes (proxy updated)
├── proxy.ts                            # Middleware (UPDATED to use Better‑Auth)
├── components/
│   ├── nav.tsx                         # Uses authClient.useSession() (UPDATED)
│   ├── RoleGuard.tsx                   # Uses authClient.useSession() (UPDATED)
│   └── SessionProvider.tsx             # DEPRECATED (Better‑Auth doesn't need provider)
├── test-utils/
│   ├── mock-auth.ts                    # UPDATED for Better‑Auth mocks
│   └── setup-test-db.ts                # UNCHANGED
└── auth.ts                             # OLD NextAuth config (REMOVE)

migrations/
└── XXXX_better_auth_schema.sql         # Better‑Auth tables (NEW)
```

### Data Model

#### Database Changes - Clean Slate Approach

**Decision**: Since we're in beta with no production users, we'll **drop the existing `users` table** and adopt Better‑Auth's native schema. This gives us:
- ✅ Native Better‑Auth features (session management, security)
- ✅ Future-proof for plugins (2FA, passkeys, etc.)
- ✅ No custom adapter complexity
- ✅ Standard migration path for upgrades

**Current Schema (TO BE DROPPED)**:
```sql
DROP TABLE IF EXISTS users;
```

**New Better‑Auth Schema** (generated via CLI):

1. **`user` table** (Better‑Auth core):
```typescript
user {
  id: text (primary key, UUID)
  name: text (required)
  email: text (required, unique) // Will store username for compatibility
  emailVerified: boolean
  image: text (optional)
  createdAt: timestamp
  updatedAt: timestamp
  
  // Added by username plugin:
  username: text (unique, normalized)
  displayUsername: text (original username)
}
```

2. **`account` table** (Better‑Auth core):
```typescript
account {
  id: text (primary key)
  userId: text (foreign key -> user.id)
  accountId: text (same as userId for credential accounts)
  providerId: text ('credential' for username/password)
  password: text (hashed, for credential auth)
  createdAt: timestamp
  updatedAt: timestamp
}
```

3. ~~**`session` table**~~ - **NOT NEEDED** (JWT/Stateless sessions)

4. **`verification` table** (Better‑Auth core, for future email verification):
```typescript
verification {
  id: text (primary key)
  identifier: text (username or email)
  value: text (verification code)
  expiresAt: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}
```

**Note**: With JWT/Stateless sessions, the `session` table is **not created**. Session data is stored in signed JWT cookies instead.

**Custom Fields** (extending Better‑Auth):
```typescript
// Add 'role' field to user table
user {
  // ... standard fields
  role: text (enum: 'admin' | 'viewer', default: 'viewer')
  isActive: boolean (default: true)
  deletedAt: timestamp (optional, for soft deletes)
}
```

**Migration Steps**:
1. Generate Better‑Auth schema via CLI
2. Add custom `role`, `isActive`, `deletedAt` fields to `user` table
3. Drop old `users` table
4. Rename Better‑Auth `user` table to `user` (or keep as-is)
5. Update Drizzle schema to match

**Drizzle Schema Update** (`src/lib/database/schema.ts`):
```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { AuthRoles } from '../auth-roles';

// Better-Auth user table (replaces old 'users')
export const user = sqliteTable('user', {
  id: text('id').primaryKey(), // UUID from Better-Auth
  name: text('name').notNull(),
  email: text('email').notNull().unique(), // Username stored here
  emailVerified: integer('emailVerified', { mode: 'boolean' }).notNull().default(false),
  image: text('image'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  
  // Username plugin fields
  username: text('username').notNull().unique(),
  displayUsername: text('displayUsername'),
  
  // Custom HD Homey fields
  role: text('role', { enum: [AuthRoles.Admin, AuthRoles.Viewer] }).notNull().default(AuthRoles.Viewer),
  isActive: integer('isActive', { mode: 'boolean' }).notNull().default(true),
  deletedAt: integer('deletedAt', { mode: 'timestamp' })
});

export type User = typeof user.$inferSelect;

// Better-Auth account table
export const account = sqliteTable('account', {
  id: text('id').primaryKey(),
  userId: text('userId').notNull().references(() => user.id, { onDelete: 'cascade' }),
  accountId: text('accountId').notNull(),
  providerId: text('providerId').notNull(),
  password: text('password'), // For credential provider
  accessToken: text('accessToken'),
  refreshToken: text('refreshToken'),
  accessTokenExpiresAt: integer('accessTokenExpiresAt', { mode: 'timestamp' }),
  refreshTokenExpiresAt: integer('refreshTokenExpiresAt', { mode: 'timestamp' }),
  scope: text('scope'),
  idToken: text('idToken'),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

// NO session table - using JWT/Stateless sessions

// Better-Auth verification table
export const verification = sqliteTable('verification', {
  id: text('id').primaryKey(),
  identifier: text('identifier').notNull(),
  value: text('value').notNull(),
  expiresAt: integer('expiresAt', { mode: 'timestamp' }).notNull(),
  createdAt: integer('createdAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  updatedAt: integer('updatedAt', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`)
});

// Keep existing tuners, channels, settings tables (unchanged)
// ...
```

### API Endpoints

#### Better‑Auth Endpoints (NEW)

Better‑Auth provides its own auth endpoints:

| Method | Path | Purpose | Changes |
|--------|------|---------|---------|
| POST | `/api/auth/sign-in/username` | Sign in with username/password | Replaces NextAuth credentials flow |
| POST | `/api/auth/sign-up/email` | Create new user account | New (Better‑Auth native) |
| POST | `/api/auth/sign-out` | Sign out | Replaces NextAuth `signOut` |
| GET | `/api/auth/get-session` | Get current session | Replaces NextAuth `auth()` |

#### HD Homey API Routes (UNCHANGED)

All existing API routes continue to work with session-based authentication via proxy:

| Method | Path | Auth Method | Admin Only | Changes |
|--------|------|-------------|------------|---------|
| GET | `/api/tuners` | Session (proxy) | No | None |
| GET | `/api/tuners/[id]` | Session (proxy) | No | None |
| POST | `/api/tuners/[id]` | Session (proxy) | **Yes** | Update to use `auth.api.getSession()` |
| GET | `/api/tuners/[id]/channels` | Session (proxy) | No | None |
| GET | `/api/tuners/[id]/poll` | Session (proxy) | No | Update to use `auth.api.getSession()` |
| GET | `/api/transcode/status` | Session (proxy) | No | None |
| DELETE | `/api/transcode/status` | Session (proxy) | Admin (via query) | None |
| GET | `/api/transcode/[tunerId]/[channelId]/playlist.m3u8` | **Token** (HMAC) | No | None |
| GET | `/api/transcode/[tunerId]/[channelId]/[segment]` | **Token** (HMAC) | No | None |

**Authentication Flow**:
1. **Proxy** checks session for all `/api/*` routes (except `/api/auth/*` and token-authenticated routes)
2. **API handlers** call `auth.api.getSession()` for additional authorization checks (e.g., admin-only operations)
3. **Token routes** (`/api/transcode/*`) bypass proxy and validate HMAC tokens directly

**Key Changes**:
- API routes calling `auth()` must switch to `auth.api.getSession({ headers: await headers() })`
- Proxy updated to use `auth.api.getSession()` instead of `auth()`
- No changes to HMAC token validation (streaming authentication)

### Components

#### Updated Components

1. **`src/lib/auth/auth.ts`** (NEW)
   - Better‑Auth server instance
   - Username/password plugin configuration
   - JWT session strategy (stateless)
   - Custom session shape with `role` field

2. **`src/lib/auth/auth-client.ts`** (NEW)
   - React client for Better‑Auth
   - Exports: `authClient`, `useSession`, `signIn`, `signOut`

3. **`src/lib/auth/helpers.ts`** (UPDATED from `src/lib/auth.ts`)
   - `requireRole(role: AuthRoles)` – now uses `auth.api.getSession()`
   - `requireAdmin()` – unchanged logic, new auth call

4. **`src/proxy.ts`** (UPDATED)
   - Replace `import { auth } from '@/auth'`
   - With `import { auth } from '@/lib/auth/auth'`
   - Call `auth.api.getSession({ headers: await headers() })`

5. **`src/components/nav.tsx`** (UPDATED)
   - Replace `useSession` from `next-auth/react`
   - With `authClient.useSession()` from `@/lib/auth/auth-client`

6. **`src/components/RoleGuard.tsx`** (UPDATED)
   - Same as `nav.tsx`

7. **`src/test-utils/mock-auth.ts`** (UPDATED)
   - Mock `auth.api.getSession` instead of `auth()`
   - Keep same session shape for compatibility

## Implementation Steps

### Phase 0: Preparation & Research (Est: 2 hours)

- [x] Read Better‑Auth docs (installation, migration, username plugin)
- [x] Review current auth implementation (all files using `auth()`)
- [x] Create spec and plan documents
- [ ] **Install Better‑Auth**:
  ```bash
  npm install better-auth
  ```
- [ ] Check Better‑Auth version:
  ```bash
  npm list better-auth
  ```
- [ ] Set environment variables:
  ```bash
  # .env
  BETTER_AUTH_SECRET=${AUTH_SECRET}  # Reuse existing secret
  BETTER_AUTH_URL=${NEXTAUTH_URL}    # Reuse existing URL
  ```

**Test Command**: `npm list better-auth`

---

### Phase 0.5: Database Backup (Est: 15 minutes) ⚠️ CRITICAL

- [ ] **Backup existing database**:
  ```bash
  # Create backup directory if it doesn't exist
  mkdir -p ./data/db/backups
  
  # Backup current database
  cp ./data/db/hd_homey.db ./data/db/backups/hd_homey_pre_migration_$(date +%Y%m%d_%H%M%S).db
  
  # Verify backup
  ls -lh ./data/db/backups/
  ```

- [ ] **Document rollback procedure** in `.specs/features/008-auth-migration/ROLLBACK.md`:
  ```markdown
  # Rollback Instructions
  
  If the migration fails or causes issues:
  
  1. Stop the application
  2. Restore database backup:
     ```bash
     cp ./data/db/backups/hd_homey_pre_migration_*.db ./data/db/hd_homey.db
     ```
  3. Revert code changes (git)
  4. Restart application
  ```

- [ ] **Add backup step to Docker entrypoint** (optional):
  ```bash
  # In docker-entrypoint.sh, before migrations
  if [ -f /app/data/db/hd_homey.db ]; then
    cp /app/data/db/hd_homey.db /app/data/db/hd_homey.db.backup
  fi
  ```

**Test Command**: `ls -lh ./data/db/backups/`

---

### Phase 1: Better‑Auth Server Setup (Est: 3 hours)

- [ ] **Create Better‑Auth instance** (`src/lib/auth/auth.ts`):
  ```typescript
  import { betterAuth } from "better-auth";
  import { username } from "better-auth/plugins";
  import { drizzleAdapter } from "better-auth/adapters/drizzle";
  import { getDb } from "@/lib/database/db";
  import { AuthRoles } from "@/lib/auth-roles";

  export const auth = betterAuth({
    database: drizzleAdapter(await getDb(), {
      provider: "sqlite"
    }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: false // No email verification for now
    },
    // Use username plugin for username/password auth
    plugins: [
      username({
        minUsernameLength: 3,
        maxUsernameLength: 30
      })
    ],
    // JWT/Stateless sessions (same as NextAuth)
    session: {
      cookieCache: {
        enabled: true,
        maxAge: 60 * 60 * 24 * 7, // 7 days (JWT cache duration)
        strategy: "jwt", // Standard JWT format
        refreshCache: true, // Auto-refresh before expiry
      }
    },
    // Stateless account storage
    account: {
      storeStateStrategy: "cookie",
      storeAccountCookie: true,
    },
    // Custom user fields
    user: {
      additionalFields: {
        role: {
          type: "string",
          required: true,
          defaultValue: AuthRoles.Viewer,
          input: true // Allow setting during signup
        },
        isActive: {
          type: "boolean",
          required: true,
          defaultValue: true
        },
        deletedAt: {
          type: "date",
          required: false
        }
      }
    }
  });

  export type Session = typeof auth.$Infer.Session;
  export type User = typeof auth.$Infer.User;
  ```

- [ ] **Generate Better‑Auth schema**:
  ```bash
  npx @better-auth/cli generate
  ```
  - This creates Drizzle schema for Better‑Auth tables
  - Review generated schema in console output
  - Copy to `src/lib/database/schema.ts`

- [ ] **Update Drizzle schema** (`src/lib/database/schema.ts`):
  - Remove old `users` table definition
  - Add Better‑Auth tables: `user`, `account`, `verification` (NO `session` table for JWT/Stateless)
  - Add custom fields: `role`, `isActive`, `deletedAt` to `user` table
  - Keep `tuners`, `channels`, `settings` tables unchanged

- [ ] **Generate migration**:
  ```bash
  npm run db:generate
  ```
  - This creates a migration file in `migrations/`
  - Review migration: should DROP old `users` table and CREATE new Better‑Auth tables

- [ ] **Create migration file** (`migrations/0002_better_auth_migration.sql`):
  ```sql
  -- Drop old users table
  DROP TABLE IF EXISTS users;
  
  -- Better-Auth tables will be created by Drizzle migration
  ```

- [ ] **Update route handler** (`src/app/api/auth/[...all]/route.ts`):
  ```typescript
  import { auth } from "@/lib/auth/auth";
  import { toNextJsHandler } from "better-auth/next-js";

  export const { POST, GET } = toNextJsHandler(auth);
  ```

- [ ] **Test server instance**:
  ```bash
  npm run build
  npm run dev
  curl http://localhost:3000/api/auth/get-session
  ```

**Test Command**: `npm run build && curl http://localhost:3000/api/auth/get-session`

---

### Phase 2: Client Setup (Est: 1 hour)

- [ ] **Create client instance** (`src/lib/auth/auth-client.ts`):
  ```typescript
  import { createAuthClient } from "better-auth/react";

  export const authClient = createAuthClient({
    baseURL: process.env.NEXTAUTH_URL || "http://localhost:3000"
  });

  export const { useSession, signIn, signOut } = authClient;
  ```

- [ ] **Create type exports** (`src/lib/auth/types.ts`):
  ```typescript
  export type { Session } from "./auth";
  export { AuthRoles } from "../auth-roles";
  ```

- [ ] **Test client import**:
  ```typescript
  // In a test file
  import { authClient } from "@/lib/auth/auth-client";
  console.log(authClient);
  ```

**Test Command**: `npm run typecheck`

---

### Phase 2.5: Verify API Authentication Strategy (Est: 30 minutes)

Better‑Auth supports multiple API authentication methods. Let's verify our approach:

- [ ] **Review current API authentication**:
  - Proxy enforces session auth for `/api/*` (except public & token routes)
  - Some endpoints check `session.user.isAdmin` in handlers
  - Streaming endpoints use HMAC tokens (bypass session)

- [ ] **Decide on Better‑Auth API authentication**:
  - **Option 1**: Keep proxy-based session auth (current approach) ✅ RECOMMENDED
  - **Option 2**: Use Bearer tokens from Better‑Auth
  - **Option 3**: API keys (Better‑Auth plugin)

- [ ] **Recommended approach**:
  ```typescript
  // Proxy continues to enforce session auth
  // API handlers can call auth.api.getSession() for additional checks
  
  // Example: Admin-only endpoint
  export async function POST(request: Request) {
    const session = await auth.api.getSession({
      headers: await headers()
    });
    
    if (session?.user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    
    // ... rest of handler
  }
  ```

- [ ] **Document API authentication** in README:
  ```markdown
  ### API Authentication
  
  HD Homey API endpoints require session authentication:
  
  1. Sign in via web UI or POST to `/api/auth/sign-in/username`
  2. Session cookie is set automatically
  3. Include cookie in subsequent API requests
  4. Admin-only endpoints check `session.user.role === 'admin'`
  
  **Example with curl**:
  ```bash
  # Sign in and save cookies
  curl -c cookies.txt -X POST http://localhost:3000/api/auth/sign-in/username \
    -H "Content-Type: application/json" \
    -d '{"username":"admin","password":"password"}'
  
  # Make authenticated API request
  curl -b cookies.txt http://localhost:3000/api/tuners
  ```
  
  **Streaming endpoints** use HMAC token authentication instead of sessions.
  ```

**Test Command**: Review current proxy implementation

---

### Phase 3: Update Server-Side Auth Calls (Est: 4 hours)

- [ ] **Update `src/lib/auth/helpers.ts`** (rename from `src/lib/auth.ts`):
  ```typescript
  import { headers } from "next/headers";
  import { auth } from "./auth";
  import { AuthRoles } from "./auth-roles";

  export async function requireRole(role: AuthRoles) {
    const session = await auth.api.getSession({
      headers: await headers()
    });

    if (!session?.user) {
      throw new Error('Not authenticated');
    }

    if (session.user.role !== role) {
      throw new Error(`Unauthorized: requires ${role} role`);
    }

    return session;
  }

  export async function requireAdmin() {
    return await requireRole(AuthRoles.Admin);
  }
  ```

- [ ] **Update `src/proxy.ts`**:
  ```typescript
  // Replace:
  import { auth } from '@/auth';
  const session = await auth();

  // With:
  import { auth } from '@/lib/auth/auth';
  import { headers } from 'next/headers';
  const session = await auth.api.getSession({
    headers: await headers()
  });
  ```

- [ ] **Update all files with `auth()` calls**:
  - `src/app/api/tuners/[id]/route.ts`
  - `src/app/api/tuners/[id]/poll/route.ts`
  - `src/lib/actions/profile.ts`
  - Any other server actions or API routes

  **Find all occurrences**:
  ```bash
  rg "from '@/auth'" --type ts
  rg "await auth\(\)" --type ts
  ```

- [ ] **Update imports**:
  ```typescript
  // Old
  import { auth } from '@/auth';
  const session = await auth();

  // New
  import { auth } from '@/lib/auth/auth';
  import { headers } from 'next/headers';
  const session = await auth.api.getSession({
    headers: await headers()
  });
  ```

**Test Command**: `npm run typecheck && npm run lint`

---

### Phase 4: Update Client-Side Auth Calls (Est: 2 hours)

- [ ] **Update `src/components/nav.tsx`**:
  ```typescript
  // Old
  import { signOut, useSession } from 'next-auth/react';
  const { data: session } = useSession();

  // New
  import { authClient } from '@/lib/auth/auth-client';
  const { data: session } = authClient.useSession();

  // For sign out
  await authClient.signOut();
  ```

- [ ] **Update `src/components/RoleGuard.tsx`**:
  ```typescript
  // Old
  import { useSession } from 'next-auth/react';
  const { data: session, status } = useSession();

  // New
  import { authClient } from '@/lib/auth/auth-client';
  const { data: session, isPending } = authClient.useSession();
  // Note: status -> isPending
  ```

- [ ] **Remove `src/components/SessionProvider.tsx`**:
  - Better‑Auth doesn't require a provider component
  - Remove any `<SessionProvider>` usage in layout

- [ ] **Update sign-in page** (`src/app/users/signin/page.tsx`):
  ```typescript
  // Old
  import { signIn } from 'next-auth/react';
  await signIn('credentials', { username, password });

  // New
  import { authClient } from '@/lib/auth/auth-client';
  await authClient.signIn.username({
    username,
    password
  });
  ```

**Test Command**: `npm run build && npm run dev` (manual test login)

---

### Phase 5: Update Tests & Mocks (Est: 3 hours)

- [ ] **Update `src/test-utils/mock-auth.ts`**:
  ```typescript
  import type { Session } from '@/lib/auth/types';
  import type { vi as Vi } from 'vitest';

  export const mockAdminSession: Session = {
    user: {
      id: '1',
      name: 'Admin User',
      email: 'admin@test.com', // username mapped to email
      role: 'admin',
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    session: {
      userId: '1',
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
      token: 'mock-token',
      createdAt: new Date(),
      updatedAt: new Date()
    }
  };

  // ... similar for mockViewerSession, mockInactiveSession

  export function mockAuth(vi: typeof Vi, session: Session | null = null) {
    return vi.fn(() => ({
      api: {
        getSession: vi.fn(() => Promise.resolve(session))
      }
    }));
  }
  ```

- [ ] **Update `src/proxy.test.ts`**:
  ```typescript
  // Mock Better‑Auth instead of NextAuth
  vi.mock('@/lib/auth/auth', () => ({
    auth: {
      api: {
        getSession: vi.fn()
      }
    }
  }));

  import { auth } from '@/lib/auth/auth';

  // Update test cases
  vi.mocked(auth.api.getSession).mockResolvedValue(null); // Unauthenticated
  vi.mocked(auth.api.getSession).mockResolvedValue(mockAdminSession); // Authenticated
  ```

- [ ] **Update `src/lib/actions/profile.test.ts`**:
  ```typescript
  import * as authModule from '@/lib/auth/auth';

  vi.spyOn(authModule.auth.api, 'getSession').mockResolvedValue(mockAdminSession);
  ```

- [ ] **Update `src/lib/actions/users.test.ts`**:
  - Same pattern as `profile.test.ts`
  - Mock `requireAdmin` from `@/lib/auth/helpers`

- [ ] **Run all tests**:
  ```bash
  npm test
  ```

- [ ] **Fix failing tests** iteratively:
  - Focus on session shape differences
  - Update type assertions
  - Ensure mocks return correct structure

**Test Command**: `npm test -- --coverage`

---

### Phase 6: Remove Old NextAuth Code (Est: 1 hour)

- [ ] **Remove `src/auth.ts`** (old NextAuth config)
- [ ] **Uninstall NextAuth**:
  ```bash
  npm uninstall next-auth
  ```
- [ ] **Remove NextAuth types from `tsconfig.json`** (if any)
- [ ] **Search for remaining NextAuth imports**:
  ```bash
  rg "next-auth" --type ts --type tsx
  ```
- [ ] **Remove environment variables** (optional):
  - `NEXTAUTH_URL` → can keep and reference `BETTER_AUTH_URL`
  - `AUTH_SECRET` → rename to `BETTER_AUTH_SECRET` or keep both

**Test Command**: `npm run build && npm test`

---

### Phase 7: Integration Testing & Manual QA (Est: 2 hours)

- [ ] **Manual Testing Checklist**:
  
  **Web UI Testing**:
  - [ ] Start fresh Docker container
  - [ ] Navigate to `/get-started` (should work without auth)
  - [ ] Create initial admin user
  - [ ] Sign in with admin credentials
  - [ ] Verify session in browser DevTools (cookie)
  - [ ] Navigate to `/tuners` (should show tuner list)
  - [ ] Navigate to `/users` (admin only, should work)
  - [ ] Sign out
  - [ ] Try accessing `/tuners` (should redirect to sign-in)
  - [ ] Sign in as viewer (create one first as admin)
  - [ ] Try accessing `/users` (should show Forbidden or redirect)
  - [ ] Verify streaming works (token auth, not session)
  - [ ] Check proxy logs for auth errors
  
  **API Testing** (with curl or Postman):
  - [ ] Test unauthenticated API call (should return 401):
    ```bash
    curl http://localhost:3000/api/tuners
    # Expected: {"error":"Unauthorized","message":"Authentication required. Please sign in."}
    ```
  
  - [ ] Test sign-in endpoint:
    ```bash
    curl -c cookies.txt -X POST http://localhost:3000/api/auth/sign-in/username \
      -H "Content-Type: application/json" \
      -d '{"username":"admin","password":"yourpassword"}'
    # Expected: Success response with session cookie
    ```
  
  - [ ] Test authenticated GET request:
    ```bash
    curl -b cookies.txt http://localhost:3000/api/tuners
    # Expected: {"data":[...]}
    ```
  
  - [ ] Test admin-only endpoint as admin:
    ```bash
    curl -b cookies.txt -X POST http://localhost:3000/api/tuners/1 \
      -F "name=Test Tuner" \
      -F "path=http://test:5004"
    # Expected: 302 redirect or success
    ```
  
  - [ ] Test admin-only endpoint as viewer:
    ```bash
    # Sign in as viewer first
    curl -c viewer-cookies.txt -X POST http://localhost:3000/api/auth/sign-in/username \
      -H "Content-Type: application/json" \
      -d '{"username":"viewer","password":"viewerpass"}'
    
    # Try admin operation
    curl -b viewer-cookies.txt -X POST http://localhost:3000/api/tuners/1 \
      -F "name=Test Tuner"
    # Expected: {"error":"Forbidden","message":"Admin access required"}
    ```
  
  - [ ] Test sign-out endpoint:
    ```bash
    curl -b cookies.txt -X POST http://localhost:3000/api/auth/sign-out
    # Expected: Success, session cookie cleared
    ```
  
  - [ ] Verify session persists across requests:
    ```bash
    # Make multiple requests with same cookie
    curl -b cookies.txt http://localhost:3000/api/tuners
    curl -b cookies.txt http://localhost:3000/api/tuners/1
    # Both should succeed
    ```

- [ ] **Automated Integration Tests** (if time permits):
  - Create `tests/integration/auth.test.ts`
  - Test sign-in flow
  - Test session persistence
  - Test role-based access

**Test Command**: Manual QA + `npm test`

---

### Phase 8: Documentation (Est: 1 hour)

- [ ] **Update `README.md`**:
  - Replace NextAuth references with Better‑Auth
  - Update environment variables section
  - Add migration note for existing deployments
  - **Add API Authentication section**:
    ```markdown
    ### API Authentication
    
    HD Homey provides REST API endpoints for tuner and channel management. All API routes require authentication via session cookies (except streaming endpoints which use HMAC tokens).
    
    #### Authentication Flow
    
    1. **Sign in** to obtain a session cookie:
       ```bash
       curl -c cookies.txt -X POST http://localhost:3000/api/auth/sign-in/username \
         -H "Content-Type: application/json" \
         -d '{"username":"your-username","password":"your-password"}'
       ```
    
    2. **Make authenticated requests** using the session cookie:
       ```bash
       curl -b cookies.txt http://localhost:3000/api/tuners
       ```
    
    3. **Sign out** when finished:
       ```bash
       curl -b cookies.txt -X POST http://localhost:3000/api/auth/sign-out
       ```
    
    #### Available Endpoints
    
    | Method | Path | Admin Required | Description |
    |--------|------|----------------|-------------|
    | GET | `/api/tuners` | No | List all tuners |
    | GET | `/api/tuners/[id]` | No | Get tuner details |
    | POST | `/api/tuners/[id]` | Yes | Update tuner |
    | GET | `/api/tuners/[id]/channels` | No | List tuner channels |
    | GET | `/api/tuners/[id]/poll` | No | Poll tuner for channel updates |
    
    #### Error Responses
    
    - **401 Unauthorized**: No valid session cookie
    - **403 Forbidden**: Valid session but insufficient permissions (e.g., viewer accessing admin endpoint)
    - **404 Not Found**: Resource does not exist
    
    #### Streaming Authentication
    
    Streaming endpoints (`/api/transcode/*`) use HMAC token authentication instead of session cookies. Tokens are generated by the web UI and embedded in HLS playlist URLs.
    ```

- [ ] **Update `AGENTS.md`**:
  - Replace NextAuth v5 references with Better‑Auth
  - Update auth code patterns
  - Update session shape examples

- [ ] **Create migration guide** (`.specs/features/008-auth-migration/MIGRATION.md`):
  ```markdown
  # Migration Guide: NextAuth → Better‑Auth

  ## For Developers
  - Install Better‑Auth: `npm install better-auth`
  - Update imports: `@/auth` → `@/lib/auth/auth`
  - Update session calls: `auth()` → `auth.api.getSession({ headers })`
  - Update client hooks: `useSession()` from `next-auth/react` → `authClient.useSession()`

  ## For Deployers
  - Set `BETTER_AUTH_SECRET` (can reuse `AUTH_SECRET`)
  - Set `BETTER_AUTH_URL` (can reuse `NEXTAUTH_URL`)
  - Rebuild Docker image
  - No database migration needed (JWT sessions)
  ```

- [ ] **Update `CHANGELOG.md`**:
  ```markdown
  ## [1.0.0-beta.3] - YYYY-MM-DD
  ### Changed
  - **BREAKING**: Migrated from NextAuth v5 to Better‑Auth
  - **BREAKING**: User database schema completely replaced (clean slate)
  - Auth API now at `/api/auth/*` (unchanged path)
  - Session structure updated (database sessions instead of JWT)
  
  ### Migration Required
  - Update environment variables: `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`
  - Rebuild Docker image
  - **ALL existing users will be deleted** - run get-started flow to create new admin
  - Database migration will drop and recreate auth tables
  ```

**Test Command**: Read through docs for accuracy

---

### Phase 9: CI/CD & Docker (Est: 1 hour)

- [ ] **Update `.github/workflows/test.yml`** (if needed):
  - No changes expected (tests already handle mocks)

- [ ] **Update `Dockerfile`**:
  - No changes expected (Better‑Auth is a standard npm package)

- [ ] **Test Docker build**:
  ```bash
  docker build -t hd-homey:test .
  docker run -p 3000:3000 --env-file .env hd-homey:test
  ```

- [ ] **Test Docker Compose**:
  ```bash
  docker compose build
  docker compose up -d
  docker compose logs -f
  ```

- [ ] **Verify CI passes**:
  - Push to feature branch
  - Check GitHub Actions results

**Test Command**: `docker compose up` + manual verification

---

### Phase 10: Final Verification & Release (Est: 1 hour)

- [ ] **Complete spec checklist**:
  - [ ] All functional requirements met
  - [ ] All non-functional requirements met
  - [ ] All tests passing (200 tests)
  - [ ] Lint passes
  - [ ] TypeScript compiles
  - [ ] Docker builds successfully
  - [ ] Manual QA complete

- [ ] **Update spec status** to `IMPLEMENTED`

- [ ] **Create release notes**:
  ```markdown
  ## v1.0.0-beta.3 - Better‑Auth Migration

  ### Highlights
  - Migrated from NextAuth v5 to Better‑Auth for improved flexibility
  - All 200 tests passing
  - Zero downtime migration (JWT sessions)
  - Same authentication flow (username/password)

  ### Breaking Changes
  - Environment variables: `BETTER_AUTH_SECRET` and `BETTER_AUTH_URL` (can reuse existing values)
  - Existing sessions invalidated (users must re-login once)

  ### Developer Changes
  - Auth imports: `@/auth` → `@/lib/auth/auth`
  - Session calls: `auth()` → `auth.api.getSession({ headers })`
  - Client hooks: `next-auth/react` → `better-auth/react`
  ```

- [ ] **Merge to main**:
  ```bash
  git checkout main
  git merge 008-auth-migration
  git tag v1.0.0-beta.3
  git push origin main --tags
  ```

**Test Command**: GitHub Actions on `main` branch

---

## Testing Strategy

### Unit Tests
- Business logic in `src/lib/auth/helpers.ts` (requireRole, requireAdmin)
- Mock `auth.api.getSession` in all test files
- Session shape validation

### Integration Tests
- Proxy authentication flow (`src/proxy.test.ts`)
- Server actions with auth (`src/lib/actions/*.test.ts`)
- API routes with auth (`src/app/api/tuners/[id]/route.ts`)

### Manual Testing Checklist
- [x] Happy path user flow (create user, sign in, navigate)
- [x] Error scenarios (wrong password, unauthorized access)
- [x] Mobile responsiveness (no UI changes)
- [x] Browser compatibility (Chrome, Firefox, Safari)
- [x] Authentication/authorization (admin vs viewer)
- [x] Performance (session lookup time, JWT decode)
- [x] Token auth for streaming (unchanged)

### Regression Tests
- All existing 200 tests must pass
- No changes to business logic (only auth layer)

---

## Rollback Plan

If issues arise after deployment:

1. **Immediate**: Revert to previous Docker image (`v1.0.0-beta.2`)
   ```bash
   docker pull ghcr.io/shaunburdick/hd-homey:v1.0.0-beta.2
   docker tag ghcr.io/shaunburdick/hd-homey:v1.0.0-beta.2 hd-homey:latest
   docker compose up -d
   ```

2. **Git**: Revert the merge commit
   ```bash
   git revert -m 1 <merge-commit-hash>
   git push origin main
   ```

3. **Database**: Restore from backup (CRITICAL - database schema changed!)
   ```bash
   # Before migration, backup database:
   cp ./data/db/hd_homey.db ./data/db/hd_homey.db.backup
   
   # To restore:
   cp ./data/db/hd_homey.db.backup ./data/db/hd_homey.db
   docker compose restart
   ```

4. **Config**: Restore previous environment variables
   ```bash
   # Restore .env
   NEXTAUTH_URL=...
   AUTH_SECRET=...
   # Remove Better-Auth vars
   ```

5. **Monitor**: Check logs for errors
   ```bash
   docker compose logs -f | grep -i "auth\|error"
   ```

**IMPORTANT**: Always backup database before running this migration!

---

## Security Considerations

- [x] All routes protected by proxy authentication
- [x] Role-based access control (requireRole, requireAdmin)
- [x] Input validation (Better‑Auth handles auth input, TypeBox for business logic)
- [x] SQL injection prevention (Drizzle ORM)
- [x] XSS prevention (React escaping)
- [x] CSRF protection (Better‑Auth built-in)
- [x] JWT signing (Better‑Auth uses `BETTER_AUTH_SECRET`)
- [x] Password hashing (Better‑Auth uses bcrypt by default)

---

## Performance Considerations

- [x] JWT sessions (no DB lookup for session validation)
- [x] Cookie caching (7-day JWT with auto-refresh)
- [x] Server components for static content
- [x] SWR for client-side data fetching
- [x] ✅ **Edge Runtime compatible** - JWT validation only (no DB queries for sessions)
- [x] No additional database queries for session validation (stateless)

---

## Open Questions

- [x] ~~Should we migrate existing `users` table to Better‑Auth schema?~~  
  **Answer**: YES! Clean slate migration - drop old table, adopt Better‑Auth schema fully.

- [x] ~~Should we use database sessions or JWT sessions?~~  
  **Answer**: JWT/Stateless sessions (same as NextAuth) - better for API clients, Edge compatibility, simpler migration.

- [x] ~~Do we need the username plugin or email/password?~~  
  **Answer**: Username plugin (users log in with username, not email).

- [ ] **Should we add email verification in the future?**  
  **Answer**: Defer to future feature (not in scope for this migration).

- [x] ~~Should we keep the `AUTH_SECRET` env var or rename to `BETTER_AUTH_SECRET`?~~  
  **Answer**: Use `BETTER_AUTH_SECRET` (clean break, no backwards compatibility needed).

- [x] ~~What happens to existing test users in the database?~~  
  **Answer**: They will be deleted (clean slate). Get-started flow will recreate initial admin.

- [ ] **Should we keep user.email field or only use username?**  
  **Answer**: Keep email field (Better‑Auth requires it) but map username to it. Better for future features (password reset emails, etc.).

---

## References

- Feature Spec: [spec.md](./spec.md)
- Better‑Auth Docs: https://www.better-auth.com/docs
- Better‑Auth Migration Guide: https://www.better-auth.com/docs/guides/next-auth-migration-guide
- Better‑Auth Username Plugin: https://www.better-auth.com/docs/plugins/username
- Current NextAuth Config: `src/auth.ts`
- Proxy Implementation: `src/proxy.ts`

---

## Time Estimate

| Phase | Estimated Time | Dependencies |
|-------|----------------|--------------|
| Phase 0: Preparation | 2 hours | None |
| Phase 1: Server Setup | 3 hours | Phase 0 |
| Phase 2: Client Setup | 1 hour | Phase 1 |
| Phase 3: Server-Side Updates | 4 hours | Phase 1, 2 |
| Phase 4: Client-Side Updates | 2 hours | Phase 2 |
| Phase 5: Tests & Mocks | 3 hours | Phase 3, 4 |
| Phase 6: Cleanup | 1 hour | Phase 5 |
| Phase 7: Integration Testing | 2 hours | Phase 6 |
| Phase 8: Documentation | 1 hour | Phase 7 |
| Phase 9: CI/CD & Docker | 1 hour | Phase 7 |
| Phase 10: Final Verification | 1 hour | Phase 9 |
| **Total** | **21 hours** | ~3 working days |

---

## Success Metrics

- [ ] All 200 existing tests pass
- [ ] New auth tests added (at least 10 new tests)
- [ ] Test coverage ≥ 90%
- [ ] Lint passes (0 warnings)
- [ ] TypeScript compiles (0 errors)
- [ ] Docker image builds successfully
- [ ] Manual QA checklist complete
- [ ] Documentation updated
- [ ] CI passes on main branch
- [ ] Zero production errors in first 24 hours after deployment

---

*This plan is a living document. Update as needed during development. Report blockers to project maintainer.*
