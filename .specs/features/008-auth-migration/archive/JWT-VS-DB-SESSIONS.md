# Session Strategy Comparison: JWT vs Database Sessions

## Current State (NextAuth v5)

NextAuth v5 uses **JWT sessions**:
- Session data stored in a **signed JWT cookie** (`next-auth.session-token`)
- **No database lookups** for session validation (stateless)
- JWT contains user data (id, username, role)
- Validated via cryptographic signature (HMAC-SHA256)
- Works on **Edge Runtime** (no database required)

## Migration Options with Better‑Auth

Better‑Auth supports **both** session strategies:

### Option 1: Database Sessions (Default)
Better‑Auth's default approach - sessions stored in database.

### Option 2: Stateless JWT Sessions
Similar to current NextAuth setup - no database for sessions.

---

## Detailed Comparison

### 🔐 Security

| Aspect | JWT/Stateless | Database Sessions |
|--------|---------------|-------------------|
| **Revocation** | ❌ Cannot revoke individual sessions (must wait for expiry or version change) | ✅ Instant revocation by deleting DB row |
| **Session Hijacking** | ⚠️ If JWT stolen, valid until expiry (7 days) | ✅ Can revoke stolen session immediately |
| **Logout** | ⚠️ Token remains valid until expiry (client-side only) | ✅ True server-side logout |
| **Password Change** | ⚠️ Must manually implement session invalidation | ✅ Revoke all other sessions automatically |
| **Suspicious Activity** | ❌ Cannot force logout on all devices | ✅ Admin can revoke user's sessions |
| **Token Size** | ⚠️ Limited by cookie size (4KB), can't store much data | ✅ No size limits |
| **Tampering** | ✅ Cryptographically signed (HMAC) | ✅ Server-side validation |

**Winner: Database Sessions** (more control, better security)

---

### ⚡ Performance

| Aspect | JWT/Stateless | Database Sessions |
|--------|---------------|-------------------|
| **Validation Speed** | ✅ ~1ms (signature verification only) | ⚠️ ~5-20ms (DB query + signature) |
| **Scalability** | ✅ No DB load, works with CDN/Edge | ⚠️ DB becomes bottleneck at scale |
| **Cold Starts** | ✅ No DB connection needed | ❌ Must connect to DB |
| **Edge Runtime** | ✅ Works on Edge (crypto only) | ❌ Requires Node.js runtime (DB access) |
| **Caching** | ✅ Built-in (JWT is the cache) | ⚠️ Requires cookie cache or Redis |
| **Database Load** | ✅ Zero (no session queries) | ⚠️ Query on every request (without cache) |

**Winner: JWT/Stateless** (faster, more scalable)

---

### 🛠️ Operational Complexity

| Aspect | JWT/Stateless | Database Sessions |
|--------|---------------|-------------------|
| **Setup Complexity** | ✅ Simple (no session table) | ⚠️ Requires session table + migration |
| **Database Size** | ✅ No session storage | ⚠️ Sessions accumulate (need cleanup) |
| **Backup/Restore** | ✅ No session data to backup | ⚠️ Sessions lost on DB restore |
| **Multi-Region** | ✅ Works across regions (no DB) | ⚠️ DB must be replicated |
| **Monitoring** | ❌ Can't see active sessions | ✅ Query session table for metrics |
| **Debugging** | ❌ Hard to trace session issues | ✅ Full session history in DB |

**Winner: JWT/Stateless** (simpler to operate)

---

### 🔧 Feature Support

| Feature | JWT/Stateless | Database Sessions |
|---------|---------------|-------------------|
| **List Active Sessions** | ❌ Not possible (stateless) | ✅ Query session table |
| **Revoke Session** | ❌ Must wait for expiry | ✅ Delete from DB |
| **Device Tracking** | ❌ No persistent record | ✅ IP, user agent stored |
| **Session Limits** | ❌ Can't enforce "max 3 devices" | ✅ Count sessions per user |
| **Activity Tracking** | ❌ No last-used timestamp | ✅ Track session updates |
| **Audit Trail** | ❌ No session history | ✅ Keep deleted sessions for audit |
| **2FA Session State** | ⚠️ Must store in JWT (limited space) | ✅ Store in session metadata |

**Winner: Database Sessions** (more features)

---

### 📱 API Client Experience

| Aspect | JWT/Stateless | Database Sessions |
|--------|---------------|-------------------|
| **Auth Method** | ✅ **Bearer token in header** (standard) | ⚠️ **Session cookie** (requires cookie handling) |
| **Mobile Apps** | ✅ Easy (store JWT in secure storage) | ⚠️ Harder (manage cookies) |
| **CLI Tools** | ✅ Easy (pass JWT as `-H "Authorization: Bearer ..."`) | ⚠️ Harder (manage cookie jar) |
| **Cross-Origin** | ✅ No CORS cookie issues | ⚠️ CORS + SameSite cookie challenges |
| **Stateless Clients** | ✅ No state management needed | ⚠️ Must persist cookies |
| **Token Refresh** | ⚠️ Must implement refresh token logic | ✅ Automatic (cookie renewed) |
| **Example Request** | `curl -H "Authorization: Bearer $TOKEN"` | `curl -b cookies.txt` (less ergonomic) |

**Winner: JWT/Stateless** (better API experience)

---

### 🚀 Better‑Auth Implementation

#### Option A: JWT/Stateless (Like Current NextAuth)

```typescript
// src/lib/auth/auth.ts
import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";

export const auth = betterAuth({
  // No database needed for sessions!
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 60 * 60 * 24 * 7, // 7 days
      strategy: "jwt", // or "compact" for smaller cookies
      refreshCache: true, // Auto-refresh before expiry
    },
  },
  account: {
    storeStateStrategy: "cookie",
    storeAccountCookie: true,
  },
  emailAndPassword: { enabled: true },
  plugins: [username()],
  // Still need DB for users/accounts, but NOT for sessions
  database: drizzleAdapter(await getDb(), { provider: "sqlite" })
});
```

**Pros**:
- ✅ Same performance as current NextAuth
- ✅ Edge Runtime compatible
- ✅ No session table needed
- ✅ Better for API clients (can extract JWT)

**Cons**:
- ❌ Cannot revoke sessions
- ❌ Cannot list active sessions
- ❌ Logout is client-side only

---

#### Option B: Database Sessions (Better‑Auth Default)

```typescript
// src/lib/auth/auth.ts
import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";

export const auth = betterAuth({
  database: drizzleAdapter(await getDb(), { provider: "sqlite" }),
  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 days
    updateAge: 60 * 60 * 24, // Update once per day
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 min cache to reduce DB queries
    },
  },
  emailAndPassword: { enabled: true },
  plugins: [username()],
});
```

**Pros**:
- ✅ Full session control (revoke, list devices)
- ✅ Better security (instant revocation)
- ✅ Audit trail (session history)

**Cons**:
- ❌ DB query on every request (mitigated by cache)
- ❌ Requires Node.js runtime (not Edge)
- ❌ Less convenient for API clients (cookies)

---

#### Option C: Hybrid (JWT + Redis)

```typescript
// src/lib/auth/auth.ts
import { betterAuth } from "better-auth";
import { username } from "better-auth/plugins";
import { redis } from "./redis";

export const auth = betterAuth({
  // Primary database for users/accounts
  database: drizzleAdapter(await getDb(), { provider: "sqlite" }),
  
  // Redis for session storage (optional, for revocation)
  secondaryStorage: {
    get: async (key) => await redis.get(key),
    set: async (key, value, ttl) => await redis.set(key, value, "EX", ttl),
    delete: async (key) => await redis.del(key)
  },
  
  session: {
    cookieCache: {
      enabled: true,
      maxAge: 5 * 60, // 5 min JWT cache
      strategy: "jwt",
      refreshCache: false, // Refresh from Redis
    },
  },
  
  emailAndPassword: { enabled: true },
  plugins: [username()],
});
```

**Pros**:
- ✅ Fast validation (JWT cache)
- ✅ Can revoke sessions (via Redis)
- ✅ No SQLite load for sessions

**Cons**:
- ❌ Added complexity (Redis dependency)
- ❌ Extra infrastructure

---

## Recommendation for HD Homey

### 🎯 For Your Use Case

**Primary Users**: 
- Home users accessing via web UI ✅ Cookies work fine
- API clients (Plex, Emby, custom scripts) ⚠️ Prefer Bearer tokens

**Security Requirements**:
- Beta product (limited users) ⚠️ Lower security risk
- Need to revoke sessions? 🤔 Depends on threat model

**Infrastructure**:
- Docker deployment ✅ Both work
- Edge Runtime? ❌ Not required (Docker = Node.js)

### 📊 My Recommendation: **JWT/Stateless** (Option A)

**Why**:
1. ✅ **Better API experience** - CLI/mobile/Plex clients prefer Bearer tokens
2. ✅ **Simpler migration** - Closer to current NextAuth behavior
3. ✅ **Edge-compatible** - Future-proof for Vercel/Cloudflare deployment
4. ✅ **No session table** - One less migration, simpler schema
5. ✅ **Same performance** - No degradation from current setup
6. ⚠️ **Security tradeoff** - Acceptable for home/beta product

**Mitigation for session revocation**:
```typescript
session: {
  cookieCache: {
    version: "1", // Change this to invalidate ALL sessions
  }
}
```

When you need to force logout all users (e.g., security incident):
1. Change `version: "2"`
2. Re-deploy
3. All existing JWTs invalidated

---

## For API Clients: Bearer Token Support

With **JWT/Stateless**, you can extract the JWT and use it as a Bearer token:

### Web UI Flow (Cookie)
```bash
# Sign in via web UI
# Cookie: better-auth.session-token=<JWT>
```

### API Client Flow (Bearer Token)
```bash
# 1. Sign in via API
curl -X POST http://localhost:3000/api/auth/sign-in/username \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"pass"}' \
  -c cookies.txt

# 2. Extract JWT from cookie
TOKEN=$(grep better-auth.session-token cookies.txt | awk '{print $7}')

# 3. Use as Bearer token (if Better-Auth supports it)
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:3000/api/tuners
```

**Note**: Better‑Auth may need Bearer token middleware (check docs or build custom).

---

## Migration Path

### Recommended: Start with JWT/Stateless

**Phase 1 (v1.0.0-beta.3)**:
- Migrate to Better‑Auth with JWT/Stateless
- No session table, simpler migration
- Same API experience as now

**Phase 2 (v1.0.0 stable, if needed)**:
- Add database sessions **as an option**
- Keep JWT as default
- Let users choose in config

**Phase 3 (future, if scaling)**:
- Add Redis secondary storage
- Enable session revocation without full DB sessions

---

## Decision Matrix

Choose **JWT/Stateless** if:
- ✅ You want simpler migration (no session table)
- ✅ API clients are important (Plex, CLI, mobile)
- ✅ Edge Runtime compatibility matters
- ✅ Session revocation is not critical
- ✅ Home/beta environment (trusted users)

Choose **Database Sessions** if:
- ✅ You need instant session revocation
- ✅ You want to list active devices
- ✅ Security is paramount (enterprise users)
- ✅ Audit trail is required
- ✅ Web UI is primary interface

---

## Code Changes Required

### Current Code (NextAuth JWT):
```typescript
// Middleware (proxy.ts)
const session = await auth(); // JWT validation (Edge-compatible)
if (session?.user) { /* authorized */ }

// API routes
const session = await auth();
if (session?.user?.role === 'admin') { /* admin action */ }
```

### Option A: Better‑Auth JWT/Stateless
```typescript
// Middleware (proxy.ts) - SAME RUNTIME (Edge-compatible)
const session = await auth.api.getSession({ headers: await headers() });
if (session?.user) { /* authorized */ }

// API routes
const session = await auth.api.getSession({ headers: await headers() });
if (session?.user?.role === 'admin') { /* admin action */ }
```

### Option B: Better‑Auth Database Sessions
```typescript
// Middleware (proxy.ts) - REQUIRES NODE.JS RUNTIME
const session = await auth.api.getSession({ headers: await headers() });
if (session?.user) { /* authorized */ }

// API routes
const session = await auth.api.getSession({ headers: await headers() });
if (session?.user?.role === 'admin') { /* admin action */ }
```

**Code is identical! Only config changes.**

---

## Summary Table

| Criteria | JWT/Stateless | Database Sessions | Winner |
|----------|---------------|-------------------|--------|
| **API Client UX** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | JWT |
| **Security** | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ | DB |
| **Performance** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐⭐ | JWT |
| **Features** | ⭐⭐ | ⭐⭐⭐⭐⭐ | DB |
| **Simplicity** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | JWT |
| **Edge Compatible** | ⭐⭐⭐⭐⭐ | ⭐ | JWT |
| **Migration Effort** | ⭐⭐⭐⭐⭐ | ⭐⭐⭐ | JWT |

**For HD Homey Beta**: **JWT/Stateless** (5 wins) vs Database Sessions (1 win)

---

## Final Recommendation

**Use JWT/Stateless for HD Homey v1.0.0-beta.3**

Update the plan to configure Better‑Auth with:
```typescript
session: {
  cookieCache: {
    enabled: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    strategy: "jwt",
    refreshCache: true,
  },
},
account: {
  storeStateStrategy: "cookie",
  storeAccountCookie: true,
}
```

This gives you:
- ✅ Same performance as current NextAuth
- ✅ Better API client experience (Bearer tokens possible)
- ✅ Edge Runtime compatibility
- ✅ Simpler migration (no session table)
- ✅ Can always add DB sessions later if needed

**For v1.0 stable**: Revisit if enterprise/security requirements change.
