# Quick Reference: Better-Auth Migration (Second Attempt)

**Purpose**: Fast lookup guide for key patterns and gotchas discovered during first attempt.

---

## ✅ Correct Patterns (Use These)

### User ID Generation
```typescript
import crypto from 'node:crypto';

// ✅ CORRECT: Use Node.js built-in
const userId = crypto.randomUUID();
const accountId = crypto.randomUUID();
```

```typescript
// ❌ WRONG: Better-Auth doesn't export this
import { generateId } from 'better-auth'; // TypeScript error!
```

### Server-Side User Creation
```typescript
import crypto from 'node:crypto';
import { getDb } from '@/lib/database/db';
import { user, account } from '@/lib/database/schema';
import { generateHashPassword } from '@/lib/user';
import { AuthRoles } from '@/lib/auth-roles';

// ✅ CORRECT: Direct database insert
const userId = crypto.randomUUID();
const accountId = crypto.randomUUID();

// Create user
await db.insert(user).values({
    id: userId,
    username: username,
    email: `${username}@local.hdhomey.app`, // synthetic email
    emailVerified: false,
    name: name,
    role: role as AuthRoles, // Cast to enum type
    isActive: true,
});

// Create account with password
const hashedPassword = await generateHashPassword(password);
await db.insert(account).values({
    id: accountId,
    userId: userId,
    accountId: userId, // Same as userId for credential accounts
    providerId: 'credential',
    password: hashedPassword,
});
```

```typescript
// ❌ WRONG: This API doesn't exist
await auth.api.signUpUsername({ username, password });
```

### Getting Session (Server-Side)
```typescript
import { auth } from '@/lib/auth/auth';
import { headers } from 'next/headers';

// ✅ CORRECT: Better-Auth pattern
const session = await auth.api.getSession({
    headers: await headers()
});
```

```typescript
// ❌ WRONG: NextAuth pattern (old)
import { auth } from '@/auth';
const session = await auth();
```

### Role Casting
```typescript
import type { AuthRoles } from '@/lib/auth-roles';

// ✅ CORRECT: Cast to AuthRoles type
role: role as AuthRoles

// ❌ WRONG: Cast to string
role: role as string // TypeScript error!
```

---

## ❌ Anti-Patterns (Avoid These)

### 1. Disabling Tests
```bash
# ❌ NEVER DO THIS
mv src/lib/actions/users.test.ts src/lib/actions/users.test.ts.disabled
```
**Why**: Tests are your specification. If they fail, fix them immediately or revert.

### 2. Using ts-ignore
```typescript
// ❌ NEVER DO THIS (unless extremely justified and documented)
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { someFunction } from 'some-package';
```
**Why**: TypeScript is usually right. Research the correct solution.

### 3. Committing Untested Code
```bash
# ❌ NEVER DO THIS
git commit -m "Implement user creation"
# without testing it first!
```
**Why**: Manual testing catches runtime errors that unit tests miss.

### 4. Assuming APIs Exist
```typescript
// ❌ NEVER DO THIS
// "I assume Better-Auth has a signUpUsername function"
await auth.api.signUpUsername({ ... });
```
**Why**: Check docs and type definitions first. Don't assume based on naming patterns.

### 5. "I'll Fix It Later"
```typescript
// ❌ NEVER DO THIS
// TODO: Fix this properly later
const result = await brokenFunction(); // This will fail
```
**Why**: "Later" never comes. Fix it now or revert.

---

## 🧪 Testing Checklist

### After Each Code Change
- [ ] **Unit tests pass** for that module
- [ ] **No new TypeScript errors**
- [ ] **No new lint warnings**
- [ ] **Manual smoke test** if user-facing

### After Each Feature
- [ ] **All unit tests pass** (no disabled tests)
- [ ] **Manual test the happy path**
- [ ] **Manual test error cases**
- [ ] **Check dev server logs** for errors
- [ ] **Commit with confidence**

### Before Completing Migration
- [ ] **All 200+ tests passing** (no disabled tests)
- [ ] **Zero ts-ignore comments** in new code
- [ ] **Complete manual testing checklist**
- [ ] **Docker build succeeds**
- [ ] **Dev server starts without errors**

---

## 📚 Better-Auth Research Checklist

### Before Starting Migration
- [ ] Read Better-Auth main concepts
- [ ] Read username plugin docs
- [ ] Read Drizzle adapter docs
- [ ] Build proof-of-concept project
- [ ] Test user creation in POC
- [ ] Test sign-in in POC
- [ ] Test session retrieval in POC
- [ ] Document findings in BETTER-AUTH-RESEARCH.md

### Key Questions to Answer
- [ ] How do I create a user server-side?
- [ ] What's the correct session shape?
- [ ] How do I generate user IDs?
- [ ] Does username plugin need email field?
- [ ] What's the account table structure?
- [ ] How do I hash passwords?
- [ ] How do I validate admin role?
- [ ] Can sessions work on Edge Runtime?

---

## 🗄️ Database Schema

### Better-Auth Required Tables

```typescript
// user table (Better-Auth core)
user {
  id: text (primary key, UUID)
  email: text (required, unique) // Use synthetic email: username@local.hdhomey.app
  emailVerified: boolean
  name: text
  image: text (optional)
  createdAt: timestamp
  updatedAt: timestamp
  
  // Username plugin adds:
  username: text (unique)
  
  // HD Homey custom fields:
  role: text (enum: 'admin' | 'viewer')
  isActive: boolean
  deletedAt: timestamp (optional)
}

// account table (Better-Auth core)
account {
  id: text (primary key)
  userId: text (foreign key -> user.id)
  accountId: text (same as userId for credentials)
  providerId: text ('credential' for username/password)
  password: text (hashed)
  accessToken: text (optional, for OAuth)
  refreshToken: text (optional, for OAuth)
  // ... other OAuth fields
  createdAt: timestamp
  updatedAt: timestamp
}

// verification table (Better-Auth core)
verification {
  id: text (primary key)
  identifier: text (username or email)
  value: text (verification code)
  expiresAt: timestamp
  createdAt: timestamp
  updatedAt: timestamp
}

// NO session table (JWT/Stateless sessions)
```

### Schema Generation Command
```bash
npx @better-auth/cli generate --output=./better-auth-schema.ts
# Review output, then copy to src/lib/database/schema.ts
# Add custom fields: role, isActive, deletedAt
```

---

## 🔧 Common Errors and Solutions

### Error: "Module has no exported member 'generateId'"
```typescript
// ❌ WRONG
import { generateId } from 'better-auth';

// ✅ CORRECT
import crypto from 'node:crypto';
const id = crypto.randomUUID();
```

### Error: "auth.api.signUpUsername is not a function"
```typescript
// ❌ WRONG
await auth.api.signUpUsername({ ... });

// ✅ CORRECT
// Use direct database insert (see "Server-Side User Creation" above)
```

### Error: "Type 'string' is not assignable to type 'AuthRoles'"
```typescript
// ❌ WRONG
role: role as string

// ✅ CORRECT
import type { AuthRoles } from '@/lib/auth-roles';
role: role as AuthRoles
```

### Error: "Property 'id' is missing"
```typescript
// ❌ WRONG
await db.insert(user).values({
    username: username,
    email: email,
    // Missing id field!
});

// ✅ CORRECT
import crypto from 'node:crypto';
await db.insert(user).values({
    id: crypto.randomUUID(), // Add this!
    username: username,
    email: email,
});
```

---

## 🚦 Red Flags (Stop If You See These)

If you encounter any of these during migration, **STOP** and reassess:

1. ❌ "I'll disable this test for now"
2. ❌ Adding `// @ts-ignore` comment
3. ❌ "Tests pass so it must work" (without manual testing)
4. ❌ Runtime error during manual testing
5. ❌ "This API doesn't exist, I'll work around it"
6. ❌ "Good enough for now"
7. ❌ Committing code that hasn't been manually tested
8. ❌ More than 30 minutes stuck on one issue (research more)

---

## ⏱️ Time Management

### Don't Rush These Phases
- **Research (4 hours)**: Most important phase. Don't skip.
- **Test database setup (2 hours)**: Foundation for all tests.
- **User creation (2 hours)**: Core functionality. Test thoroughly.
- **Manual testing (2 hours)**: Catches issues tests miss.

### Can Move Faster On
- **Client-side updates (1 hour)**: Straightforward React hooks
- **Documentation (1 hour)**: Copy from first attempt, update
- **Docker verification (30 min)**: Should just work

---

## 📖 Key Documentation Links

- Better-Auth Main: https://www.better-auth.com/docs
- Username Plugin: https://www.better-auth.com/docs/plugins/username
- Drizzle Adapter: https://www.better-auth.com/docs/adapters/drizzle
- Session Management: https://www.better-auth.com/docs/concepts/session-management
- User Management: https://www.better-auth.com/docs/concepts/users-accounts

---

## 💡 Success Criteria

When you can honestly say **YES** to all of these, the migration is complete:

- [ ] All 200+ tests passing (zero disabled tests)
- [ ] Zero ts-ignore comments in auth code
- [ ] Manual testing checklist 100% complete
- [ ] Dev server starts without errors
- [ ] Can create first user via /get-started
- [ ] Can sign in as admin
- [ ] Can create additional users
- [ ] Can sign in as viewer
- [ ] Viewer can't access admin routes
- [ ] Admin can access admin routes
- [ ] Streaming (token auth) still works
- [ ] Docker builds successfully
- [ ] Confident enough to deploy to production
- [ ] Would recommend this implementation to others

---

*If in doubt, refer to LESSONS-LEARNED.md for full context.*
