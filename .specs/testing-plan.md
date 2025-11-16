# HD Homey Testing Plan

## Overview
Comprehensive testing strategy for HD Homey, focusing on unit tests for critical business logic and end-to-end tests for API security and functionality.

## Current State
- **Existing**: 1 test file (`src/app/(protected)/page.test.tsx`)
- **Coverage**: Minimal
- **Test Framework**: Vitest + React Testing Library (jsdom)
- **Coverage Tools**: V8 coverage provider configured

## Testing Priorities

### 1. Unit Tests - HDHomeRun Interface (HIGH PRIORITY)
Critical business logic that interacts with external devices needs robust unit testing.

#### `src/lib/hdhr/tuner.ts` - HDTuner class
**Test Coverage Needed:**
- ✅ `lineup()` method
  - Successful fetch and JSON parsing
  - Error handling (network errors, invalid JSON)
  - URL construction with different address formats
  
- ✅ `updateLineup()` method
  - Channel insertion for new lineup
  - Channel updates for existing channels
  - Channel deactivation when removed from lineup
  - Last scanned timestamp updates
  - Transaction rollback on errors
  - Empty lineup handling
  
- ✅ `stream()` method
  - Successful stream connection (status 200)
  - Error handling (non-200 status codes)
  - URL construction with/without 'v' prefix
  - Port 5004 enforcement
  - Promise resolution/rejection

**Mocking Strategy:**
- Mock `fetch` for lineup tests
- Mock `http.get` for stream tests
- Mock database transactions with in-memory SQLite or transaction mocks
- Use `msw` (Mock Service Worker) for HTTP mocking if needed

**Test File Location:** `src/lib/hdhr/tuner.test.ts`

---

### 2. API Endpoint Tests (HIGH PRIORITY)
End-to-end tests validating security, authorization, and functionality.

#### Test Categories

**A. Authentication & Authorization**
- ❌ Unauthenticated requests return 401
- ❌ Non-admin users cannot access admin-only endpoints
- ❌ Session token validation
- ❌ CSRF protection (if applicable)

**B. Tuner Management APIs**

**`GET /api/tuners`**
- ✅ Returns list of tuners for authenticated users
- ✅ Includes proper tuner data structure
- ❌ Returns 401 for unauthenticated

**`POST /api/tuners`**
- ✅ Admin can create tuner
- ❌ Non-admin returns 403
- ✅ Validates required fields (name, address)
- ✅ Returns created tuner with ID
- ❌ Handles duplicate addresses

**`GET /api/tuners/[id]`**
- ✅ Returns specific tuner by ID
- ✅ Returns 404 for non-existent tuner
- ❌ Returns 401 for unauthenticated

**`PATCH /api/tuners/[id]`**
- ✅ Admin can update tuner
- ❌ Non-admin returns 403
- ✅ Validates updated fields
- ✅ Returns 404 for non-existent tuner

**`DELETE /api/tuners/[id]`**
- ✅ Admin can delete tuner
- ❌ Non-admin returns 403
- ✅ Cascades to channels (soft delete)
- ✅ Returns 404 for non-existent tuner

**`GET /api/tuners/[id]/channels`**
- ✅ Returns channels for tuner
- ❌ Returns 401 for unauthenticated
- ✅ Returns 404 for non-existent tuner
- ✅ Filters active channels only

**`POST /api/tuners/[id]/poll`**
- ✅ Admin can trigger lineup update
- ❌ Non-admin returns 403
- ✅ Calls HDTuner.updateLineup()
- ✅ Returns updated channel list
- ❌ Handles tuner connection errors

**Test File Location:** `src/app/api/tuners/route.test.ts` and related endpoint test files

---

### 3. Server Actions Tests (MEDIUM PRIORITY)
Testing server-side business logic with proper authorization.

#### User Management Actions
**`src/lib/actions/users.ts`**
- ✅ `createUser()` - admin only, validation, password hashing
- ✅ `updateUser()` - admin only, prevents email conflicts
- ✅ `deleteUser()` - admin only, cannot delete self
- ✅ `toggleUserStatus()` - admin only

#### Tuner Actions
**`src/lib/actions/tuners.ts`** (if exists)
- Form validation
- Authorization checks
- Database operations
- Error handling and FormState returns

**Test File Location:** `src/lib/actions/*.test.ts`

---

### 4. Database Layer Tests (MEDIUM PRIORITY)
Validate Drizzle ORM queries and schema constraints.

#### Schema Validation
**`src/lib/database/schema.ts`**
- ✅ Foreign key constraints work
- ✅ Unique constraints enforced
- ✅ Default values applied
- ✅ Timestamps auto-populate
- ✅ Soft deletes (is_active flags)

#### Database Operations
**`src/lib/database/*.ts`**
- CRUD operations
- Transaction behavior (avoid simple transaction tests per AGENTS.md)
- Cascade deletes/updates
- Query filtering

**Test File Location:** `src/lib/database/schema.test.ts`

---

### 5. Component Tests (LOW PRIORITY)
React component rendering and interaction tests.

#### Priority Components
- **Forms**: Tuner/User/Channel forms with validation
- **Tables**: Tuner/Channel listings with sorting/filtering
- **Auth Components**: Login form, session display

**Test File Location:** `src/components/*.test.tsx`

---

## Testing Infrastructure Needs

### Additional Packages
```bash
npm install -D @testing-library/user-event msw
```

- **@testing-library/user-event**: Better user interaction simulation
- **msw**: HTTP request mocking for API tests

### Test Utilities to Create

**`src/test-utils/`**
- `setup-test-db.ts` - In-memory SQLite database for tests
- `mock-auth.ts` - Mock NextAuth sessions (admin/viewer/unauthenticated)
- `mock-hdhr.ts` - Mock HDHomeRun device responses
- `test-helpers.ts` - Common assertions and utilities

### Environment Setup
- Mock `process.env` variables in vitest.setup.ts
- Set `AUTH_SECRET` for session tests
- Configure test database path

---

## Test Execution Strategy

### Test Scripts (already in package.json)
```bash
npm test              # Run all tests + linting
npm run test:coverage # Generate coverage report
```

### Coverage Goals
- **Unit Tests**: 80%+ coverage for `src/lib/`
- **API Tests**: 100% route coverage with auth scenarios
- **Overall**: 70%+ project coverage

### CI/CD Integration
- Run tests on all PRs
- Block merges if tests fail
- Publish coverage reports
- Run security-focused tests in dedicated job

---

## Implementation Phases

### Phase 1: Foundation ✅ COMPLETE (2025-01-16)
- [x] Set up test utilities (mock DB, auth, HDHR)
- [x] Install additional testing packages (@testing-library/user-event, msw)
- [x] Create first HDTuner unit test suite (20 tests, 100% passing)
- [x] Implement type-safe mocking without type assertions
- [x] Document testing patterns

**Deliverables:**
- Test utilities in `src/test-utils/` with proper TypeScript typing
- HDTuner test suite covering lineup(), updateLineup(), stream()
- Bug discovered: updateLineup() crashes on empty lineups

### Phase 2: Unit Tests ✅ COMPLETE (2025-01-16)
- [x] Complete HDTuner class tests (done in Phase 1)
- [x] Server action tests (user management - 9 tests)
- [x] Database schema validation tests (21 tests)

**Deliverables:**
- User action tests covering createUser() and updateUser()
- Complete database schema validation
- Authorization testing patterns established
- Database constraint verification (unique, foreign keys, defaults)
- Soft delete pattern testing
- 51 total tests passing with 2.27s execution time

### Phase 3: API Tests (Week 3)
- [ ] Authentication/authorization test suite
- [ ] Tuner API endpoint tests
- [ ] Security validation tests

### Phase 4: Integration (Week 4)
- [ ] Component tests for forms
- [ ] End-to-end user flows
- [ ] Performance/load testing (optional)

---

## Security Testing Checklist

### Authentication
- [ ] Expired sessions rejected
- [ ] Invalid tokens rejected
- [ ] Password strength requirements enforced
- [ ] Bcrypt hashing verified

### Authorization
- [ ] Admin-only endpoints block viewers
- [ ] Users cannot modify other users
- [ ] SQL injection attempts fail safely
- [ ] Path traversal blocked

### Data Protection
- [ ] Sensitive data not in error messages
- [ ] Passwords never returned in responses
- [ ] Session tokens properly encrypted
- [ ] Database queries use parameterized queries

---

## Testing Anti-Patterns to Avoid

❌ **Don't**: Test implementation details (private methods, component internals)  
✅ **Do**: Test public APIs and user-facing behavior

❌ **Don't**: Use real HDHomeRun devices in tests  
✅ **Do**: Mock external HTTP calls

❌ **Don't**: Use production database in tests  
✅ **Do**: Use in-memory SQLite or transaction rollbacks

❌ **Don't**: Test Next.js framework behavior  
✅ **Do**: Test your business logic and integrations

❌ **Don't**: Create brittle tests tied to UI text  
✅ **Do**: Use semantic queries (roles, labels, test IDs)

---

## Success Metrics

- ✅ All critical paths have tests
- ✅ Tests run in <30 seconds
- ✅ >70% code coverage
- ✅ Zero false positives/flaky tests
- ✅ Security scenarios covered
- ✅ Tests serve as documentation

---

## Related Specs
- SPEC-001: Tuner Management
- SPEC-002: Channel Discovery
- SPEC-003: User Authentication
- SPEC-004: User Management

This testing plan should be treated as a living document and updated as implementation progresses.
