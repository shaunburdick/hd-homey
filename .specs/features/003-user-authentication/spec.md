# Feature Specification: User Authentication & Authorization

**Feature ID**: `003-user-authentication`  
**Created**: 2025-11-15  
**Status**: In Progress 🔄  
**Owner**: HD Homey Core Team  
**Completed**: 2025-11-15  
**Updated**: 2025-11-16 - Stream authentication requirements added

## Overview

User Authentication provides secure access control for HD Homey with role-based authorization. The system uses NextAuth.js v5 with credentials-based authentication, bcrypt password hashing, and supports two roles: Admin (full access) and Viewer (read-only access).

**Update 2025-11-16**: Stream endpoints require token-based authentication to support external video players like VLC that cannot handle session-based authentication.

## User Stories

### Story 1: User Sign In (Priority: P1)

**As a** user  
**I want** to sign in with my username and password  
**So that** I can access HD Homey

**Why this priority**: Essential for any application access

**Acceptance Criteria**:
- **Given** I navigate to `/users/signin`, **When** the page loads, **Then** I see a login form with username and password fields
- **Given** I enter valid credentials, **When** I submit the form, **Then** I am authenticated and redirected to the home page
- **Given** I enter invalid credentials, **When** I submit the form, **Then** I see an error message and remain on the sign-in page
- **Given** I am already signed in, **When** I navigate to `/users/signin`, **Then** I am redirected to the home page

---

### Story 2: Protected Routes (Priority: P1)

**As a** system administrator  
**I want** all application routes to require authentication  
**So that** unauthorized users cannot access content

**Why this priority**: Core security requirement

**Acceptance Criteria**:
- **Given** I am not signed in, **When** I attempt to access any protected route, **Then** I am redirected to `/users/signin`
- **Given** I am signed in, **When** I access protected routes, **Then** I can view the content
- **Given** my session expires, **When** I try to access protected routes, **Then** I am redirected to sign in

---

### Story 3: Role-Based Authorization (Priority: P1)

**As a** system administrator  
**I want** different user roles with different permissions  
**So that** I can control what users can do

**Why this priority**: Required for secure multi-user access

**Acceptance Criteria**:
- **Given** I am signed in as a Viewer, **When** I view pages, **Then** I can see tuners and stream channels
- **Given** I am signed in as a Viewer, **When** I try to create/edit content, **Then** I do not see admin controls
- **Given** I am signed in as an Admin, **When** I view pages, **Then** I can see all admin controls (add/edit/delete)
- **Given** I am signed in as an Admin, **When** I perform admin actions, **Then** they succeed

---

### Story 4: Create New Users (Priority: P1)

**As an** administrator  
**I want** to create new user accounts  
**So that** I can grant access to others

**Why this priority**: Required for multi-user deployments

**Acceptance Criteria**:
- **Given** I am signed in as an Admin, **When** I navigate to `/users/new`, **Then** I see a form to create a user
- **Given** I fill in username, name, password, and role, **When** I submit the form, **Then** a new user is created
- **Given** I submit invalid data, **When** validation fails, **Then** I see specific error messages
- **Given** I try to create a duplicate username, **When** I submit the form, **Then** I see an error

---

### Story 5: Initial Setup Wizard (Priority: P1)

**As a** first-time user  
**I want** to be guided through initial setup  
**So that** I can easily create my admin account

**Why this priority**: Critical for first-run experience

**Acceptance Criteria**:
- **Given** no users exist in the system, **When** I navigate to the app, **Then** I am redirected to `/get-started`
- **Given** I'm on the setup page, **When** I fill in the form, **Then** I create the first admin user
- **Given** users exist in the system, **When** I try to access `/get-started`, **Then** I am redirected away (setup complete)

---

### Story 6: User Management (Priority: P1) ✅

**As an** administrator  
**I want** to view and manage all user accounts  
**So that** I can maintain access control

**Why this priority**: Essential for maintaining user access and security

**Acceptance Criteria**:
- **Given** I am signed in as an Admin, **When** I navigate to `/users`, **Then** I see a list of all users ✅
- **Given** I click on a user, **When** navigating, **Then** I see their full details (username, name, role, status, timestamps) ✅
- **Given** I need to modify a user, **When** I edit their name, **Then** changes are saved and reflected immediately ✅
- **Given** I need to change a user's password, **When** I enter a new password, **Then** it is hashed and updated ✅
- **Given** I need to disable a user, **When** I uncheck "User is active", **Then** they cannot sign in ✅
- **Given** I'm a Viewer, **When** I view a user page, **Then** I do not see edit controls ✅

---

### Story 7: Secure Stream URLs (Priority: P1) 🔄

**As a** user  
**I want** stream URLs to be authenticated with expiring tokens  
**So that** I can securely watch streams in external players like VLC

**Why this priority**: Critical security gap - streams currently accessible without authentication

**Acceptance Criteria**:
- **Given** I am authenticated and view a channel page, **When** the page loads, **Then** a signed stream URL with token is generated
- **Given** I copy the stream URL to VLC, **When** VLC requests the stream with valid token, **Then** the video plays
- **Given** I try to use an expired token, **When** accessing the stream, **Then** I receive a 403 Forbidden error
- **Given** I try to use a tampered token, **When** accessing the stream, **Then** I receive a 403 Forbidden error
- **Given** I try to use a token for wrong tuner/channel, **When** accessing the stream, **Then** I receive a 403 Forbidden error
- **Given** I bookmark a stream URL, **When** the token expires (30 min), **Then** I must revisit the channel page for a new URL

## Requirements

### Functional Requirements

- **FR-001**: System MUST support credentials-based authentication (username/password)
- **FR-002**: System MUST hash passwords using bcrypt before storage
- **FR-003**: System MUST support two roles: Admin and Viewer
- **FR-004**: System MUST redirect unauthenticated users to `/users/signin`
- **FR-005**: System MUST allow only Admins to create/modify/delete users and tuners
- **FR-006**: System MUST allow Viewers to view and stream content
- **FR-007**: System MUST require initial setup if no users exist
- **FR-008**: System MUST validate usernames are unique
- **FR-009**: System MUST validate passwords meet minimum requirements
- **FR-010**: System MUST maintain user sessions across page navigations
- **FR-011**: System MUST allow Admins to edit user display names ✅
- **FR-012**: System MUST allow Admins to change user passwords ✅
- **FR-013**: System MUST allow Admins to enable/disable user accounts ✅
- **FR-014**: System MUST prevent editing of username and role after creation ✅
- **FR-015**: System MUST show user creation and modification timestamps ✅
- **FR-016**: System MUST generate signed tokens for stream URLs using app-wide stream secret 🔄
- **FR-017**: System MUST validate stream tokens before serving video 🔄
- **FR-018**: System MUST reject expired stream tokens 🔄
- **FR-019**: System MUST reject tampered stream tokens 🔄
- **FR-020**: Stream tokens MUST be time-limited (default: 12 hours) 🔄
- **FR-021**: Stream tokens MUST be bound to specific tuner and channel 🔄
- **FR-022**: System MUST store stream secret in database settings table 🔄
- **FR-023**: Admins MUST be able to regenerate stream secret from settings page 🔄
- **FR-024**: System MUST generate initial stream secret on first run 🔄
- **FR-025**: Regenerating stream secret MUST invalidate all existing tokens 🔄

### Non-Functional Requirements

- **NFR-001**: Security - Passwords must be hashed with bcrypt (cost factor 10+)
- **NFR-002**: Security - Session tokens must be securely generated and stored
- **NFR-003**: Security - No passwords in logs or error messages
- **NFR-004**: Performance - Authentication check must complete in under 100ms
- **NFR-005**: Usability - Clear error messages for failed authentication
- **NFR-006**: Reliability - Session must persist across server restarts (if using database sessions)
- **NFR-007**: Security - Stream tokens must use HMAC-SHA256 signatures 🔄
- **NFR-008**: Security - Stream token validation must use timing-safe comparison 🔄
- **NFR-009**: Performance - Stream token generation must complete in under 1ms 🔄
- **NFR-010**: Performance - Stream token validation must complete in under 2ms (includes DB lookup) 🔄
- **NFR-011**: Usability - Stream URLs must work in VLC, browsers, and mobile players 🔄
- **NFR-012**: Security - Stream secret must be cryptographically random (32 bytes) 🔄
- **NFR-013**: Usability - Stream secret regeneration must be simple (single button click) 🔄
- **NFR-014**: Security - Settings page must be admin-only 🔄

### Data Requirements

- **User Entity**:
  - `id`: Auto-incrementing primary key
  - `username`: Unique identifier for login (required, max 255 chars, read-only after creation)
  - `name`: Display name (required, max 255 chars, editable)
  - `passHash`: Bcrypt hashed password (required, updatable)
  - `role`: Enum - "admin" or "viewer" (required, read-only after creation)
  - `is_active`: Boolean flag for enabling/disabling accounts (default true, editable)

  - `created_at`: Creation timestamp (auto-generated)
  - `modified_at`: Last modification timestamp (auto-updated)
  - `deleted_at`: Soft delete timestamp (null if active)

## Technical Constraints

- Must use NextAuth.js v5 (not v4)
- Must use Credentials provider (no OAuth/SSO)
- Must use bcrypt for password hashing (not Argon2 or PBKDF2)
- Must use Next.js middleware for route protection
- Must use server actions for user creation
- Must follow soft-delete pattern for users
- Session must include user role for authorization checks
- Stream tokens must use HMAC-SHA256 (Node.js crypto module) 🔄
- Stream secret must be stored in database settings table 🔄
- Stream endpoint must be outside protected routes (for VLC access) 🔄
- Stream secret generation must use crypto.randomBytes(32) 🔄
- Settings table must use key-value structure 🔄

## Edge Cases & Error Handling

- **No users in database**: What happens on first run?
  - Redirect to `/get-started` (special unauthenticated route)
  - Create first admin user
  - Cannot proceed without at least one admin

- **Invalid credentials**: How to handle failed login?
  - Return generic "Invalid credentials" (don't reveal if username exists)
  - Log attempt for security monitoring
  - No account lockout (keep simple)

- **Inactive users**: What if user is marked inactive?
  - Treat as invalid credentials
  - Prevent sign in
  - Admin can reactivate via user edit form
  - Inactive status clearly visible on user detail page

- **Session expiration**: What happens when session expires?
  - Middleware detects no valid session
  - Redirect to sign in
  - Preserve intended destination (redirect after login)

- **Duplicate usernames**: What if username already exists?
  - Database constraint prevents creation
  - Return validation error to user
  - Suggest alternative username

- **Password requirements**: What are minimum password requirements?
  - Currently: non-empty (basic validation)
  - Consider: minimum length in future (out of scope for now)

- **Expired stream token**: What if user tries to use expired token? 🔄
  - Return 403 Forbidden with clear message
  - Log warning for monitoring
  - User must revisit channel page for new token

- **Invalid stream token**: What if token is tampered with? 🔄
  - HMAC signature validation fails
  - Return 403 Forbidden
  - Log security warning

- **Token resource mismatch**: What if token used for wrong channel? 🔄
  - Validate token's tunerId/channelId match request
  - Return 403 Forbidden
  - Prevents token reuse across resources

- **Missing stream secret**: What if stream_secret not in settings? 🔄
  - getStreamSecret() generates one automatically
  - Migration inserts initial secret
  - Falls back to generation if missing
  
- **Stream secret regeneration**: What happens to active streams? 🔄
  - Existing tokens become invalid immediately for ALL users
  - Active VLC streams will fail
  - All users must get new URLs from channel pages
  - Admin-only operation with clear warning

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of routes except `/users/signin` and `/get-started` require authentication
- **SC-002**: Zero passwords stored in plain text
- **SC-003**: Authentication check completes in under 100ms (p95)
- **SC-004**: First-time setup completes in under 2 minutes
- **SC-005**: Stream token generation completes in under 1ms 🔄
- **SC-006**: Stream token validation completes in under 2ms (includes DB lookup) 🔄
- **SC-007**: Zero stream access without valid token 🔄
- **SC-008**: Stream secret regeneration invalidates all tokens 🔄
- **SC-009**: Settings page accessible only to admins 🔄

### User Validation

- [x] Users can successfully sign in and out
- [x] Viewers cannot access admin functions
- [x] Admins can perform all operations
- [x] Initial setup flow is clear and simple
- [ ] Stream URLs work in VLC with valid tokens 🔄
- [ ] Expired tokens are rejected 🔄
- [ ] Tampered tokens are rejected 🔄
- [ ] Stream secret regeneration invalidates existing tokens 🔄
- [ ] Settings page shows secret preview 🔄
- [ ] Non-admins cannot access settings page 🔄

## Dependencies

- **Depends On**: 
  - Database schema with `users` and `settings` tables 🔄
  - NextAuth.js v5 library
  - Bcrypt library
  - Next.js middleware support
  - Node.js crypto module (for HMAC and randomBytes) 🔄
  - Database migration for settings table 🔄

- **Blocks**: 
  - All other features (nothing works without auth)
  - Secure streaming (requires token implementation) 🔄

- **Related To**: 
  - All protected features rely on this
  - SPEC-002 Channel Streaming (provides stream URLs) 🔄

## Out of Scope

Explicitly list what this feature does NOT include:

- ❌ OAuth/SSO providers (Google, GitHub, etc.)
- ❌ Two-factor authentication (2FA)
- ❌ Password reset via email
- ❌ Account lockout after failed attempts
- ❌ Password complexity requirements (beyond non-empty)
- ❌ Session management UI (view active sessions)
- ❌ User profile editing (users cannot change own info - admin only)
- ❌ User groups or custom roles (only admin/viewer)
- ❌ Audit logs for user actions
- ❌ LDAP or Active Directory integration
- ❌ Editing username after creation (username is immutable)
- ❌ Editing role after creation (role is immutable)
- ❌ User deletion (uses soft delete pattern)
- ❌ Bulk user operations
- ❌ IP-based token restrictions (token works from any IP)
- ❌ Single-use stream tokens (token can be reused until expiry)
- ❌ Individual token revocation (can only revoke all tokens via secret regeneration)
- ❌ Per-user token revocation
- ❌ Stream usage analytics/tracking
- ❌ Stream secret history/audit trail
- ❌ Multiple secrets (only one app-wide secret)

## Implementation Notes

This feature is already implemented with the following files:

**Authentication Config**: `src/auth.ts`
- NextAuth.js v5 configuration
- Credentials provider setup
- Session callback includes user role
- Authorized callback for route protection

**Database Schema**: `src/lib/database/schema.ts`
```typescript
- users table with all required fields
- unique constraint on username
- role enum: 'admin' or 'viewer'
```

**Pages**:
- `/users/signin` - Sign in form (`src/app/users/signin/page.tsx`) - Client-side with immediate session update
- `/get-started` - Initial setup wizard (`src/app/(start)/get-started/page.tsx`)
- `/users` - User list (Admin only) (`src/app/(protected)/users/page.tsx`)
- `/users/new` - Create user form (Admin only) (`src/app/(protected)/users/new/page.tsx`)
- `/users/[id]` - User details and edit form (Admin only) (`src/app/(protected)/users/[id]/page.tsx`)

**Components**:
- `UserEditForm.tsx` - Client component for editing user details (name, password, active status)
- `RoleGuard.tsx` - Conditional rendering based on user role
- `AdminLink.tsx` - Link component that only renders for admins
- `AdminButton.tsx` - Button component that only renders for admins
- `SessionProvider.tsx` - NextAuth session provider with refetch configuration

**Server Actions**: `src/lib/actions/users.ts`
- `createUser()` - Creates new user with validation and password hashing
- `updateUser()` - Updates user name, password (optional), and active status

**Layouts**: Layout-based authentication (not middleware due to bcrypt bundling issues)
- `(protected)/layout.tsx` - Checks authentication for protected routes
- `(start)/layout.tsx` - Handles get-started flow
- Server-side authentication checks with redirects

**Business Logic**: `src/lib/user.ts`
- `generateHashPassword()` - Bcrypt password hashing
- `comparePassword()` - Bcrypt password comparison

**Auth Library**: `src/lib/auth.ts` and `src/lib/auth-roles.ts`
- `auth-roles.ts` - `AuthRoles` enum - "admin" | "viewer" (separate file for client imports)
- `auth.ts` - `requireAdmin()` - Server-side authorization check
- `auth.ts` - `requireRole()` - Generic role requirement check
- Re-exports AuthRoles for convenience

**Validation**: `src/lib/database/validate.ts`
- `isUserValid()` - Validates user data
- `getUserErrors()` - Returns validation errors
- Checks: non-empty username, name, password, valid role

**Components**: `src/components/RoleGuard.tsx`
- Client component for conditional rendering based on role
- Hides admin-only UI from viewers
- Used throughout the app for role-based UI

**Session Shape**:
```typescript
{
  user: {
    id: string,
    username: string,
    name: string,
    role: "admin" | "viewer"
  }
}
```

**Authentication Flow**:
1. User submits credentials to `/users/signin` (client-side form)
2. Client calls `signIn('credentials', { username, password, redirect: false })`
3. Credentials provider validates username/password via `comparePassword()`
4. If valid, session created with user data (id, username, name, role)
5. Client-side: `router.push('/')` then `router.refresh()` for immediate session update
6. Layout components check session on protected routes
7. `RoleGuard` components conditionally render based on role
8. `requireAdmin()` protects server actions

**Sign Out Flow**:
1. User clicks "Sign Out" link in navigation
2. Link calls `signOut({ callbackUrl: '/users/signin' })`
3. NextAuth clears session
4. Redirects to sign in page (uses NEXTAUTH_URL for proper redirect)

**User Edit Flow**:
1. Admin navigates to user detail page
2. Edit form displays with current values
3. Admin modifies name, password (optional), or active status
4. Form submits to `updateUser()` server action
5. Action checks `requireAdmin()` authorization
6. Updates database (password hashed if provided)
7. Revalidates cache and redirects to user page

**Initial Setup Flow**:
1. User navigates to app
2. Middleware checks if users exist
3. If no users, redirect to `/get-started`
4. User fills out form (becomes first admin)
5. `createUser()` action creates user
6. Redirect to sign in
7. User signs in and accesses app

**Stream Authentication** (🔄 To Be Implemented - See `stream-auth-plan.md`):

**Token Utilities**: `src/lib/stream-token.ts`
- `generateStreamToken(tunerId, channelId)` - Creates HMAC-signed token with expiration
- `verifyStreamToken(token)` - Validates signature and expiration, returns parsed data or null

**Stream Endpoint**: `src/app/(protected)/tuners/[id]/channel/[channel_id]/stream/route.tsx` (existing route, now with token auth)
- Validates token from query parameter
- Checks token signature, expiration, and resource match
- Proxies video stream if valid, returns 403 if invalid

**Token Generation**:
1. User navigates to channel page (authenticated via layout)
2. Server generates signed token: `generateStreamToken(tunerId, channelId)`
3. Token includes: tunerId, channelId, expiresAt timestamp, HMAC-SHA256 signature
4. Stream URL created: `/tuners/{tunerId}/channel/{channelId}/stream?token={base64url_token}`
5. URL passed to ChannelStream component for display

**Token Validation**:
1. VLC/browser requests `/tuners/{tunerId}/channel/{channelId}/stream?token={token}`
2. Route extracts and decodes token
3. Verifies HMAC signature using secret key
4. Checks expiration timestamp
5. Validates token's tunerId/channelId match requested resource
6. If valid: fetch channel from DB and proxy stream
7. If invalid: return 403 Forbidden

**Configuration**:
- `HD_HOMEY_STREAM_TOKEN_EXPIRY` - Optional expiry in seconds (default: 43200 = 12 hours)
- `stream_secret` stored in database settings table (64-char hex, auto-generated)

**Security Features**:
- HMAC-SHA256 prevents token tampering
- Timing-safe comparison prevents timing attacks
- Resource binding prevents token reuse across channels
- Time-limited validity (default 12 hours)
- Global revocation via settings page (admin only)
- Database-managed secret (not in environment)
- One DB lookup per operation (fetch stream_secret)
- No user information in tokens

## Security Considerations

- **Password Storage**: Bcrypt with appropriate cost factor
- **Session Security**: NextAuth handles token generation/validation
- **SQL Injection**: Prevented by Drizzle ORM parameterized queries
- **XSS**: Prevented by React's automatic escaping
- **CSRF**: NextAuth includes CSRF protection
- **Session Fixation**: NextAuth regenerates session ID on login
- **Timing Attacks**: Bcrypt comparison is constant-time
- **Inactive Users**: Cannot sign in even with correct credentials
- **Authorization**: Double-checked (UI guards + server action guards)
- **Stream Token Security** (🔄 Planned):
  - HMAC-SHA256 prevents tampering
  - Timing-safe comparison prevents timing attacks
  - Resource-bound tokens prevent cross-channel reuse
  - Time-limited validity (default 12 hours)
  - Global revocation via admin settings page
  - One DB lookup per stream request (fetch stream_secret)
  - Individual token revocation not possible (acceptable trade-off)
  - Token sharing possible within validity window (acceptable risk)
  - No user tracking in tokens (privacy-friendly)

## Implementation Challenges & Solutions

### Challenge 1: Bcrypt Webpack Bundling
**Problem**: Middleware tried to bundle bcrypt (native Node module) for edge runtime  
**Solution**: Moved authentication from middleware to layout components (server-side only)  
**Benefit**: More secure as layouts are fully server-side

### Challenge 2: React 19 Hook Migration
**Problem**: `useFormState` deprecated in React 19  
**Solution**: Updated all forms to use `useActionState`  
**Files**: All page components with forms

### Challenge 3: Client-Side Database Imports
**Problem**: Client components importing auth caused database bundling  
**Solution**: Created separate `auth-roles.ts` for client imports  
**Result**: Clean separation of client/server code

### Challenge 4: NextAuth Redirects to 0.0.0.0
**Problem**: WSL2 server bound to 0.0.0.0, NextAuth used for redirects  
**Solution**: Set `NEXTAUTH_URL=http://localhost:3000` in environment  
**WSL2 Note**: Server binds to 0.0.0.0 but redirects use localhost

### Challenge 5: Session Update Delay
**Problem**: After signin, session not updated until manual refresh  
**Solution**: Client-side signin with `router.refresh()` after successful login  
**Result**: Immediate session update, instant UI response

### Challenge 6: NEXT_REDIRECT Error Display
**Problem**: `redirect()` throws special error caught by try/catch  
**Solution**: Remove try/catch around redirect calls  
**Explanation**: Next.js catches NEXT_REDIRECT internally for navigation

### Challenge 7: Stream Authentication for VLC (🔄 Identified)
**Problem**: Current stream endpoint requires session authentication, incompatible with VLC  
**Solution**: Implement HMAC-signed tokens in URL query parameters  
**Approach**: Stateless token validation using Node.js crypto module  
**Details**: See `stream-auth-plan.md` for full implementation plan

## References

- NextAuth.js v5 Docs: https://authjs.dev/
- Bcrypt: https://www.npmjs.com/package/bcrypt
- Next.js Middleware: https://nextjs.org/docs/app/building-your-application/routing/middleware
- OWASP Authentication Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- HMAC-SHA256 Signed URLs: https://www.vdocipher.com/blog/token-based-urls/
- Securing Video Streams: https://developers.cloudflare.com/stream/viewing-videos/securing-your-stream/
- Node.js Crypto HMAC: https://nodejs.org/api/crypto.html#crypto_crypto_createhmac_algorithm_key_options
