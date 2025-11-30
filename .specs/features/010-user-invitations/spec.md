# Feature Specification: User Invitations

**Feature ID**: `010-user-invitations`  
**Created**: 2025-11-29  
**Status**: ✅ Completed  
**Owner**: HD Homey Team  
**Version**: 1.3  
**Completed**: 2025-11-30

## Overview

The User Invitations feature allows administrators to generate secure, one-time-use invitation links that enable new users to create their own accounts. This improves the onboarding experience by eliminating the need for admins to manually create accounts and communicate credentials, while maintaining security through cryptographically secure tokens and role specification.

## User Stories

### Story 1: Admin Generates Invitation (Priority: P1)

**As an** administrator  
**I want** to generate a secure invitation link  
**So that** I can share it with someone I want to give access to the system

**Why this priority**: Core feature enabler - without this, the invitation system doesn't function.

**Acceptance Criteria**:
- **Given** I am logged in as an admin, **When** I visit the invitations page, **Then** I see a button to generate a new invitation
- **Given** I click "Generate Invitation", **When** I select a role (Admin or Viewer) and optionally enter a note, **Then** a unique invitation link is created
- **Given** an invitation is created, **When** I view it, **Then** I can copy the link to my clipboard
- **Given** an invitation is created, **When** I view it, **Then** I can see its expiration date (30 days from creation) and any note I added
- **Given** an invitation link is generated, **When** I share it, **Then** the recipient can use it exactly once to create an account

---

### Story 2: User Accepts Invitation (Priority: P1)

**As a** new user  
**I want** to create my account using an invitation link  
**So that** I can access the system without needing the admin to manually create my account

**Why this priority**: Core user experience - this is how invited users join the system.

**Acceptance Criteria**:
- **Given** I have a valid invitation link, **When** I visit it, **Then** I see a signup form
- **Given** I am on the signup form, **When** I enter a username and password, **Then** my account is created with the role specified in the invitation
- **Given** I submit valid credentials, **When** my account is created, **Then** the invitation is marked as used and can never be used again
- **Given** I submit valid credentials, **When** my account is created, **Then** I am redirected to the sign-in page with a success message
- **Given** the invitation has been used, **When** someone tries to use the same link, **Then** they see an error message "This invitation has already been used"

---

### Story 3: Admin Manages Invitations (Priority: P2)

**As an** administrator  
**I want** to view and manage all invitations in the system  
**So that** I can track who has been invited and revoke unused invitations if needed

**Why this priority**: Important for administrative control and security, but the system works without it.

**Acceptance Criteria**:
- **Given** I am logged in as an admin, **When** I visit the invitations page, **Then** I see a list of all invitations (created by any admin)
- **Given** I view the invitations list, **When** I look at each invitation, **Then** I can see its status (Pending, Used, Expired, Revoked), note, and which admin created it
- **Given** I view the invitations list, **When** I look at each invitation, **Then** I can see when it was created and when it expires
- **Given** I view a used invitation, **When** I look at its details, **Then** I can see who used it and when
- **Given** there is an unused invitation (created by any admin), **When** I click "Revoke", **Then** it can no longer be used and is marked as revoked
- **Given** I try to revoke an already-used invitation, **When** I attempt it, **Then** I receive an error message "Cannot revoke used invitation"

---

### Story 4: Invitation Security & Validation (Priority: P1)

**As a** system administrator  
**I want** invitations to be secure and properly validated  
**So that** unauthorized users cannot gain access to the system

**Why this priority**: Security is critical - must prevent unauthorized access.

**Acceptance Criteria**:
- **Given** an invitation is 30 days old, **When** someone tries to use it, **Then** they see an error "This invitation has expired"
- **Given** an invitation has been revoked, **When** someone tries to use it, **Then** they see an error "This invitation is no longer valid"
- **Given** an invalid token is used, **When** someone visits the invitation URL, **Then** they see an error "Invalid invitation"
- **Given** someone tries to guess invitation tokens, **When** they make rapid requests, **Then** they are rate-limited (max 10 requests per minute per IP)
- **Given** an invitation token is generated, **When** examining it, **Then** it is at least 32 bytes of cryptographically secure random data, URL-safe base64 encoded

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST generate cryptographically secure invitation tokens using Node.js crypto.randomBytes (minimum 32 bytes)
- **FR-002**: System MUST encode invitation tokens as URL-safe base64 strings
- **FR-003**: System MUST store invitation tokens in the database with creation timestamp, expiration timestamp, and creator ID
- **FR-003a**: System MUST allow admins to optionally add a note/label to invitations (max 200 characters) to help identify them
- **FR-004**: System MUST allow admins to specify the role (Admin or Viewer) when creating an invitation
- **FR-005**: System MUST set invitation expiration to exactly 30 days from creation time
- **FR-006**: System MUST validate invitation tokens before allowing signup (not expired, not used, not revoked, exists)
- **FR-007**: System MUST mark invitations as used (with timestamp and user ID) when an account is successfully created
- **FR-008**: System MUST prevent an invitation from being used more than once
- **FR-009**: System MUST allow any admin to revoke any unused invitation (not restricted to creator)
- **FR-010**: System MUST NOT allow revoking already-used invitations
- **FR-011**: System MUST display all invitations to any admin, showing status (Pending, Used, Expired, Revoked), note, and creator
- **FR-011a**: System MUST show which admin created each invitation in the invitations list
- **FR-012**: System MUST create new user accounts with the role specified in the invitation
- **FR-013**: System MUST redirect users to the sign-in page after successful account creation via invitation
- **FR-014**: System MUST display a success message on the sign-in page indicating the account was created successfully
- **FR-015**: System MUST provide clear error messages for invalid, expired, used, or revoked invitations

### Non-Functional Requirements

- **NFR-001**: Security - Invitation tokens MUST be unguessable (minimum 256 bits of entropy)
- **NFR-002**: Security - Invitation validation endpoint MUST be rate-limited (max 10 requests per minute per IP)
- **NFR-003**: Performance - Invitation generation MUST complete in under 200ms
- **NFR-004**: Performance - Invitation validation MUST complete in under 100ms
- **NFR-005**: Usability - Copy invitation link MUST work with a single click
- **NFR-006**: Usability - Invitation status MUST be immediately clear from visual indicators
- **NFR-007**: Reliability - All invitation database operations MUST be atomic (use transactions where appropriate)
- **NFR-008**: Accessibility - Invitation management UI MUST meet WCAG 2.2 AA standards
- **NFR-009**: Security - Passwords created during invitation signup MUST follow the same hashing requirements as normal user creation (Better-Auth scrypt)

### Data Requirements

- **Invitation Entity**:
  - `id`: Integer (serial primary key)
  - `token`: String (unique, not null, indexed) - URL-safe base64 encoded
  - `role`: String (not null) - "admin" or "viewer"
  - `note`: String (nullable, max 200 chars) - Admin's label for tracking (e.g., "For John from Marketing")
  - `createdBy`: Integer (not null, foreign key to users.id)
  - `createdAt`: Timestamp (not null)
  - `expiresAt`: Timestamp (not null) - createdAt + 30 days
  - `usedAt`: Timestamp (nullable) - when invitation was redeemed
  - `usedBy`: Integer (nullable, foreign key to users.id) - who redeemed it
  - `revokedAt`: Timestamp (nullable) - when admin revoked it
  - `revokedBy`: Integer (nullable, foreign key to users.id) - which admin revoked it

## Technical Constraints

- Must use Better-Auth for password hashing (scrypt, not bcrypt)
- Must use Node.js `crypto.randomBytes()` for token generation
- Must use Drizzle ORM for all database operations
- Must follow existing authentication patterns (Better-Auth)
- Must use Next.js App Router (Server Components + Server Actions)
- Must not exceed 200KB additional bundle size
- Invitation token validation must work without database transaction for performance

## Edge Cases & Error Handling

### Token Generation
- **What happens when token generation fails?** System should retry up to 3 times, then return error to admin
- **What if duplicate token is generated?** Regenerate with new randomBytes (extremely unlikely with 32+ bytes)

### Invitation Usage
- **What if user submits invalid username (already exists)?** Show validation error, do NOT mark invitation as used
- **What if user submits invalid password (too short)?** Show validation error, do NOT mark invitation as used
- **What if database fails during account creation?** Roll back transaction, do NOT mark invitation as used, show error
- **What if invitation expires while user is filling out form?** Validate expiration on form submission, show clear error message
- **What if two users try to use same invitation simultaneously?** Use database transaction with row-level locking; first one wins, second gets "already used" error

### Admin Management
- **What happens when admin tries to revoke already-used invitation?** Show error: "Cannot revoke used invitation"
- **What if admin tries to view invitations created by another admin?** Show all invitations - any admin can view and manage all invitations
- **What if admin tries to revoke an invitation created by another admin?** Allow it - any admin can revoke any unused invitation
- **What if invitation creator's account is deleted?** Invitations remain valid but show "Unknown" or "[Deleted Admin]" for creator name
- **What if invited user's account is deleted after using invitation?** Invitation remains marked as used with the deleted user's ID

### Security
- **What if someone tries to brute force invitation tokens?** Rate limit to 10 requests per minute per IP on validation endpoint
- **What if someone shares a used invitation link publicly?** Clear error message: "This invitation has already been used"
- **What if admin generates many invitations rapidly?** No limit needed at this time (per requirements), but log for monitoring

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of valid invitations can be used exactly once to create an account
- **SC-002**: 0% of expired/used/revoked invitations can be used to create accounts
- **SC-003**: Invitation generation completes in under 200ms (99th percentile)
- **SC-004**: Invitation validation completes in under 100ms (99th percentile)
- **SC-005**: Copy-to-clipboard success rate > 99% (browser compatibility)

### User Validation

- [ ] Feature tested with at least 3 admin users
- [ ] Feature tested with at least 5 new users accepting invitations
- [ ] Feedback collected on invitation flow clarity
- [ ] Security review completed (token strength, validation logic)
- [ ] All edge cases tested manually
- [ ] Meets accessibility standards (WCAG 2.2 AA) - keyboard navigation, screen reader support

## Dependencies

- **Depends On**: 
  - Feature 003 (User Authentication) - Uses Better-Auth for password hashing and session management
  - Existing user management system - Creates users with specified roles
  
- **Blocks**: 
  - Future notification system (inviting admin gets notified when invitation is used)
  
- **Related To**: 
  - User management features
  - Admin settings page

## Out of Scope

Explicitly list what this feature does NOT include:

- ❌ Email-based invitations (no email system exists yet)
- ❌ Customizable expiration times (fixed at 30 days)
- ❌ Invitation usage limits per admin (no quota system)
- ❌ Invitation templates or custom messages
- ❌ Notification to admin when invitation is used
- ❌ Batch invitation generation (one at a time only)
- ❌ Invitation analytics or usage statistics dashboard
- ❌ Ability to resend/regenerate invitations (must create new one)
- ❌ Pre-filling email addresses (no email system)

## Open Questions

- [x] Default expiration time? **Answer: 30 days**
- [x] Should invitation specify role? **Answer: Yes, admin can choose admin or viewer**
- [x] Need email pre-fill? **Answer: No, no email system yet**
- [x] Limits on invitation creation? **Answer: No limits needed**
- [x] Notification when used? **Answer: Future feature, not now**

## UI/UX Considerations

### Invitations Management Page (`/settings` - new section)

**Layout**:
```
┌─────────────────────────────────────────────────┐
│ Settings > Invitations                          │
├─────────────────────────────────────────────────┤
│                                                  │
│  Generate New Invitation                         │
│  ┌──────────────────────────┐                   │
│  │ Role: [Viewer ▼]         │                   │
│  │ Note: [____________]      │ (optional)        │
│  │       For John...         │                   │
│  └──────────────────────────┘                   │
│  [Generate] button                               │
│                                                  │
│  All Invitations (showing 3)                    │
│  ┌────────────────────────────────────────────┐ │
│  │ Status Note       Role  By     Created Exp │ │
│  ├────────────────────────────────────────────┤ │
│  │ 🟢 For John... Viewer admin1 11/29  12/29 │ │
│  │    [Copy Link] [Revoke]                    │ │
│  ├────────────────────────────────────────────┤ │
│  │ ✅ Sarah's inv Admin admin2 11/20  12/20  │ │
│  │    Used by: john123 on 2025-11-22         │ │
│  ├────────────────────────────────────────────┤ │
│  │ ⏰ Marketing   Viewer admin1 10/15  11/14 │ │
│  └────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

**Status Indicators**:
- 🟢 **Pending**: Green circle - invitation is valid and unused
- ✅ **Used**: Check mark - invitation has been redeemed
- ⏰ **Expired**: Clock - invitation expiration date has passed
- 🚫 **Revoked**: Prohibited sign - admin manually revoked

### Invitation Signup Page (`/invite/[token]`)

**Valid Invitation**:
```
┌─────────────────────────────────────────────┐
│           Welcome to HD Homey!              │
│                                             │
│  You've been invited to create an account  │
│                                             │
│  Username: [_____________]                  │
│  Password: [_____________]                  │
│  Confirm:  [_____________]                  │
│                                             │
│  [Create Account]                           │
│                                             │
│  This invitation expires in 15 days         │
└─────────────────────────────────────────────┘
```

**Invalid/Expired Invitation**:
```
┌─────────────────────────────────────────────┐
│           ⚠️ Invalid Invitation             │
│                                             │
│  This invitation link is no longer valid.   │
│                                             │
│  Reason: [This invitation has been used]    │
│          [This invitation has expired]      │
│          [This invitation was revoked]      │
│          [Invalid invitation link]          │
│                                             │
│  Please contact an administrator for        │
│  a new invitation.                          │
└─────────────────────────────────────────────┘
```

## Example URLs

- **Invitations Management**: `https://hd-homey.example.com/settings` (new Invitations tab)
- **Invitation Signup**: `https://hd-homey.example.com/invite/AbCdEf123456789...` (32+ byte token)

## Example Invitation Token

```
Token (32 bytes): a8f3c2d1e7b9f4a2c8d1e6b3f9a4c7d2e8b1f5a3c9d4e7b2f6a8c1d3e9b5f7a4
URL-safe base64: qPPC0ee59KLI0ea0-aTH0ui19aPI1Oeyr_aowdPpufl6Q
Full URL: https://hd-homey.example.com/invite/qPPC0ee59KLI0ea0-aTH0ui19aPI1Oeyr_aowdPpufl6Q
```

## Database Migration

```sql
-- Migration: Add invitations table
CREATE TABLE invitations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  token TEXT NOT NULL UNIQUE,
  role TEXT NOT NULL CHECK(role IN ('admin', 'viewer')),
  note TEXT,                    -- Optional label for admin (max 200 chars)
  created_by INTEGER NOT NULL REFERENCES user(id),
  created_at INTEGER NOT NULL,  -- Unix timestamp
  expires_at INTEGER NOT NULL,  -- Unix timestamp
  used_at INTEGER,              -- Unix timestamp
  used_by INTEGER REFERENCES user(id),
  revoked_at INTEGER,           -- Unix timestamp
  revoked_by INTEGER REFERENCES user(id)
);

CREATE INDEX idx_invitations_token ON invitations(token);
CREATE INDEX idx_invitations_created_by ON invitations(created_by);
CREATE INDEX idx_invitations_status ON invitations(used_at, expires_at, revoked_at);
```

## API Endpoints

### `POST /api/invitations`
**Auth**: Admin only  
**Body**: `{ role: "admin" | "viewer", note?: string }`  
**Response**: `{ id: number, token: string, url: string, expiresAt: string, note?: string }`  
**Errors**: 401 Unauthorized, 403 Forbidden, 400 Bad Request (note too long)

### `GET /api/invitations`
**Auth**: Admin only  
**Response**: `{ invitations: Array<InvitationDetails> }` - Returns ALL invitations (from any admin)  
**Errors**: 401 Unauthorized, 403 Forbidden

### `DELETE /api/invitations/[id]`
**Auth**: Admin only (any admin can revoke any invitation)  
**Response**: `{ success: boolean }`  
**Errors**: 401 Unauthorized, 403 Forbidden, 404 Not Found, 400 Bad Request (already used)

### `GET /invite/[token]`
**Auth**: Public  
**Response**: Renders signup form or error page  
**Validates**: Token exists, not expired, not used, not revoked

### `POST /invite/[token]`
**Auth**: Public  
**Body**: `{ username: string, password: string }`  
**Response**: Redirect to home page with session  
**Errors**: 400 Bad Request (validation errors), 410 Gone (invitation invalid)

## Security Considerations

### Token Generation
- Use `crypto.randomBytes(32)` for 256 bits of entropy
- Encode as URL-safe base64: `base64url.encode(bytes)`
- Probability of collision: negligible (2^-256)

### Rate Limiting
- Invitation validation endpoint: 10 requests/minute per IP
- Invitation creation endpoint: Use existing admin auth (no additional limit needed)

### Database Security
- Token column has unique constraint
- Use transactions for account creation + invitation marking
- Row-level locking during invitation redemption prevents race conditions

### Attack Vectors Mitigated
- ✅ Token guessing: 256-bit entropy makes brute force infeasible
- ✅ Replay attacks: One-time use prevents reuse
- ✅ Timing attacks: Constant-time comparison not needed (tokens stored as strings)
- ✅ Race conditions: Database transaction ensures atomic redemption
- ✅ Privilege escalation: Role is stored in invitation, not user-controlled

## References

- Constitution: Principle 4 (Security - Authentication Required)
- Feature 003: User Authentication (Better-Auth integration)
- OWASP Token Generation Guidelines: https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html
- Next.js App Router: https://nextjs.org/docs/app
- Better-Auth Documentation: https://www.better-auth.com/

---

**Version History**:
- v1.0 (2025-11-29): Initial specification
- v1.1 (2025-11-29): Added optional note/label field for invitations (FR-003a)
- v1.2 (2025-11-29): Changed invitation visibility - any admin can view and manage all invitations (not filtered by creator)

## Clarifications Applied

### Note/Label Field (v1.1)
**Question**: How can admins differentiate between multiple invitations?  
**Answer**: Added optional `note` field (max 200 characters) that admins can use to label invitations (e.g., "For John from Marketing", "Sarah's invite"). This note is:
- Optional when creating invitations
- Displayed in the invitations list
- Stored in the database
- Only visible to admins (not shown to the person accepting the invitation)
- Max 200 characters to prevent abuse

**Requirements Added**:
- FR-003a: System MUST allow admins to optionally add a note/label to invitations (max 200 characters)
- Updated FR-011 to include note in display
- Updated data model to include `note` field
- Updated UI mockups to show note in form and list
- Updated API to accept and return note field

### Admin Invitation Visibility (v1.2)
**Question**: Should admins only see invitations they created, or all invitations?  
**Answer**: Any admin can view and manage ALL invitations (regardless of who created them). This provides better administrative flexibility and transparency.

**Requirements Updated**:
- FR-009: Changed from "allow admins to revoke unused invitations" to "allow ANY admin to revoke ANY unused invitation"
- FR-011: Changed from "display to the admin who created it" to "display all invitations to any admin"
- FR-011a: Added requirement to show which admin created each invitation in the list
- Updated User Story 3 acceptance criteria to reflect "all invitations" not "my invitations"
- Updated UI mockup heading from "Your Invitations" to "All Invitations" and added "By" column showing creator
- Updated GET /api/invitations to clarify it returns ALL invitations
- Updated DELETE /api/invitations/[id] to clarify any admin can revoke
- Updated edge cases to clarify admin-to-admin visibility and revocation permissions

---

## Implementation Notes

### Security Decision: No Auto-Login (v1.3)
**Date**: 2025-11-30  
**Rationale**: During implementation, we initially attempted to auto-sign-in users after account creation. However, this required returning plain-text credentials from the server action, which posed a security risk:
- Plain-text passwords in server action responses
- Potential credential exposure in network traffic, logs, or monitoring
- Violates security best practices

**Decision**: Remove auto-login feature. Instead:
- Redirect users to `/users/signin?created=true` after successful account creation
- Display success message: "Account created successfully! Please sign in with your new credentials."
- Require one manual sign-in (acceptable UX trade-off for better security)

**Requirements Updated**:
- FR-013: Changed from "automatically sign in" to "redirect to sign-in page"
- FR-014: Changed from "redirect to home page" to "display success message on sign-in page"
- User Story 2 acceptance criteria updated to reflect redirect behavior

### Display Name Field Added (v1.3)
**Implementation Detail**: Added `name` field to invitation redemption form:
- Allows users to set their display name during account creation
- Validation: 2-100 characters
- Stored in `user.name` field
- Improves user experience (no need to set name later)

### Form Value Preservation (v1.3)
**Implementation Detail**: When validation errors occur, form preserves entered values:
- Name and username fields retain their values
- Passwords are never preserved (security best practice)
- Reduces user frustration from re-entering data

---

*Feature completed and tested 2025-11-30. All acceptance criteria met.*
