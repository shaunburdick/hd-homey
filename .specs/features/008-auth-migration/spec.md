# 008 – Auth Migration: NextAuth → Better‑Auth

---

## Overview

**Goal**: Replace the existing **NextAuth v5** authentication layer with **Better‑Auth** while preserving all current functionality (credential login, JWT session storage, role‑based access, token‑based streaming protection) and maintaining 100 % test coverage.

The migration will be a **full switch‑over** (no dual‑auth period) because the project is still in beta and we want a clean, future‑proof auth stack.

---

## Requirements

### Functional
1. **Username/Password Auth** – Users log in with username/password using Better‑Auth's username plugin.
2. **JWT/Stateless Sessions** – Sessions stored in signed JWT cookies (same as NextAuth), no database session table required.
3. **Role‑Based Access** – `session.user.role` must be available for server‑side checks (`requireRole`, `requireAdmin`).
4. **Token‑Auth for Streaming** – Unchanged; Better‑Auth does not interfere with HMAC token validation.
5. **Public Routes** – `/users/signin`, `/get-started`, `/api/auth/*` remain publicly accessible.
6. **Server‑Side Auth Calls** – All existing `auth()` imports must be replaced with the Better‑Auth equivalent (`auth.api.getSession()`).
7. **User Schema Migration** – Drop existing `users` table and adopt Better‑Auth's native schema with custom fields (no session table needed).

### Non‑Functional
1. **Type‑Safety** – All auth‑related types must be exported from a single module (`src/lib/auth/types.ts`) and used throughout the codebase.
2. **CI Pass** – Lint, type‑check, and all Vitest suites must pass after migration.
3. **Docker & Edge Compatibility** – The auth layer must work in Docker and remain Edge Runtime compatible (JWT validation only, no DB queries for sessions).
4. **Clean Migration** – Since we're in beta, we can drop the old schema and start fresh with Better‑Auth's native tables (no session table needed).
5. **Documentation** – Update spec, README, AGENTS.md, and migration guide with **BREAKING CHANGE** warnings.
6. **Backup Strategy** – Database must be backed up before migration; rollback procedure documented.
7. **API Client Support** – JWT tokens can be extracted from cookies and used as Bearer tokens for programmatic API access.

---

## Architecture Changes

| Area | Current Implementation | New Implementation |
|------|------------------------|--------------------|
| **Auth Config** | `src/auth.ts` (NextAuth) | `src/lib/better-auth.ts` (Better‑Auth `createAuth` config) |
| **Session Retrieval** | `import { auth } from '@/auth'` | `import { getSession } from '@/lib/better-auth'` |
| **Role Helpers** | `src/lib/auth.ts` (`requireRole`, `requireAdmin`) | Updated to use `session.user.role` from Better‑Auth session object |
| **Mocks** | `test-utils/mock-auth.ts` (mock `auth`) | New mock `mockBetterAuth.ts` exposing `mockGetSession` |
| **Middleware / Proxy** | `src/proxy.ts` uses `auth()` | Updated to `getSession()` (Edge‑compatible) |
| **Provider** | `Credentials` provider from NextAuth | `Credentials` provider from Better‑Auth (same API) |

---

## Implementation Phases

### Phase 0 – Preparation (1 day)
- Add Better‑Auth dependency (`npm i @better-auth/next@latest`).
- Create a new module `src/lib/better-auth.ts` with a minimal config mirroring the current credential flow.
- Add a thin wrapper `src/lib/auth.ts` that re‑exports `requireRole`/`requireAdmin` using the new session shape.
- Update `.specs/features/008-auth-migration/spec.md` (this file).

### Phase 1 – Core Migration (2 days)
1. Replace **all** `import { auth } from '@/auth'` with `import { getSession } from '@/lib/better-auth'`.
2. Update server actions, API routes, and `src/proxy.ts` to call `await getSession()`.
3. Adjust role‑checking helpers to read `session.user.role` (or `isAdmin`).
4. Ensure JWT signing secret (`Config.AUTH_SECRET`) is passed to Better‑Auth.

### Phase 2 – Tests & Mocks (1 day)
- Create `test-utils/mock-better-auth.ts` providing `mockGetSession`.
- Update existing test files that mock `auth` to use the new mock.
- Run full test suite; fix any failing type errors.

### Phase 3 – CI & Docker (0.5 day)
- Verify Dockerfile builds with the new dependency.
- Ensure GitHub Actions (`.github/workflows/*.yml`) still run lint, type‑check, and tests.
- Add a step to run `npm audit` for security.

### Phase 4 – Documentation & Cleanup (0.5 day)
- Update `README.md` badge/version if needed and add a **Migration** section.
- Add a new spec file `008-auth-migration/README.md` summarizing the migration steps for future contributors.
- Remove the old `src/auth.ts` file (or keep as a comment‑out backup, but not exported).
- Run `npm run lint` and fix any warnings.

### Phase 5 – Final Verification (0.5 day)
- Manual QA: login as admin, login as viewer, attempt admin‑only API routes, verify streaming token flow.
- Verify that the app starts in Docker (`docker compose up`) without auth errors.
- Tag a new beta release (e.g., `v1.0.0-beta.3`).

---

## Success Criteria
- **All tests pass** (`npm test` returns 0, coverage ≥ 90 %).
- **Lint passes** (`npm run lint` returns 0).
- **Docker image builds** and the container runs without runtime auth errors.
- **Role checks** work: admin can access protected routes, viewer receives `Unauthorized`.
- **Public routes** remain accessible without a session.
- **Documentation** updated and the spec reflects the final implementation.

---

## Testing Strategy
- **Unit Tests** – Existing tests updated to mock `getSession`.
- **Integration Tests** – Proxy tests (`src/proxy.test.ts`) updated to use the new mock.
- **E2E (manual)** – Run the app locally, perform login flows, and verify redirects.
- **CI** – Ensure the GitHub Actions workflow runs the full suite on every push.

---

## Risks & Mitigations
| Risk | Impact | Mitigation |
|------|--------|------------|
| JWT cannot be revoked individually | Stolen token valid until expiry (7 days) | Change `session.cookieCache.version` to invalidate ALL tokens; acceptable for home/beta use. |
| Schema migration fails mid-process | Database corruption | Backup database before migration; test migration on local copy first. |
| Session shape change breaks UI | UI components may receive undefined fields | Add TypeScript type guards and update component props. |
| Role helpers still reference old `AuthRoles` enum | Authorization bypass | Update `requireRole`/`requireAdmin` to use new session data. |
| Tests failing due to mock mismatch | CI failures | Provide a dedicated mock module and update all imports. |
| Get-started flow broken | Cannot create initial admin | Test get-started flow thoroughly; ensure Better-Auth signup works. |
| Existing users lose access | Support burden | Clearly document in CHANGELOG that all users must re-register. |
| API clients need Bearer token support | Integration complexity | Document how to extract JWT from cookie; consider adding Bearer token middleware if needed. |

---

## Timeline
- **Start**: Immediately (no hard deadline).
- **Target**: Complete before the next beta release (currently `v1.0.0-beta.3`).

---

## References
- Better‑Auth migration guide: https://www.better-auth.com/docs/guides/next-auth-migration-guide
- Current NextAuth config: `src/auth.ts`
- Role utilities: `src/lib/auth.ts`
- Proxy implementation: `src/proxy.ts`

---

*Prepared by the Spec‑Driven Development Architect.*