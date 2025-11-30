# Implementation Plan: User Invitations

**Feature ID**: `010-user-invitations`  
**Spec**: [spec.md](./spec.md)  
**Date**: 2025-11-30  
**Branch**: `010-user-invitations`

## Summary

Implement a secure invitation system that allows administrators to generate one-time-use invitation links with cryptographically secure tokens. Users can redeem these invitations to self-register accounts with specified roles, eliminating the need for admins to manually create accounts and communicate credentials.

## Technical Context

**Framework**: Next.js 16.0.3 + React 19.2.0 + TypeScript 5  
**Database**: SQLite with Drizzle ORM (better-sqlite3)  
**Authentication**: Better-Auth 1.1.0 with username plugin  
**Password Hashing**: Scrypt (Better-Auth native)  
**Styling**: new.css (classless) + CSS modules  
**Testing**: Vitest + React Testing Library  
**Token Generation**: Node.js crypto.randomBytes()

## Constitution Check

Review against HD Homey Constitution:

- [x] ✅ Follows Next.js app router conventions
- [x] ✅ Uses server components by default (pages are server, forms are client)
- [x] ✅ Server actions for mutations (create/revoke invitations, redeem)
- [x] ✅ TypeScript strict mode compliance
- [x] ✅ Drizzle ORM for database access
- [x] ✅ Unit tests for business logic (token generation, validation)
- [x] ✅ Soft deletes not needed (invitations are marked used/revoked, not deleted)
- [x] ✅ Authentication required for admin routes, exempt for invitation redemption
- [x] ✅ Mobile responsive (follows existing design system)
- [x] ✅ Better-Auth for password hashing (scrypt, not bcrypt)

**Violations/Justifications**: None - fully compliant with constitution

## Architecture

### Directory Structure

```
src/
├── app/
│   ├── (protected)/
│   │   └── settings/
│   │       └── invitations/
│   │           ├── page.tsx                    # Invitations management page (admin only)
│   │           └── actions.ts                  # Server actions (create, revoke)
│   ├── invite/
│   │   └── [token]/
│   │       ├── page.tsx                        # Public invitation redemption page
│   │       └── actions.ts                      # Server action (redeem invitation)
│   └── api/
│       └── invitations/
│           ├── route.ts                        # GET (list), POST (create)
│           └── [id]/
│               └── route.ts                    # DELETE (revoke)
├── lib/
│   ├── invitations/
│   │   ├── types.ts                            # TypeScript types and enums
│   │   ├── invitations.ts                      # Core business logic
│   │   └── invitations.test.ts                 # Unit tests
│   └── database/
│       └── schema.ts                           # Add invitations table
├── components/
│   ├── invitation-form.tsx                     # Create invitation form (client)
│   ├── invitation-list.tsx                     # Invitations list (server)
│   ├── invitation-card.tsx                     # Single invitation card (client)
│   └── invitation-redeem-form.tsx              # Redemption form (client)
└── migrations/
    └── 0001_add_invitations.sql                # Database migration

```

### Data Model

#### New Table: invitations

```typescript
// src/lib/database/schema.ts addition
export const invitations = sqliteTable(
  'invitations',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    token: text('token', { length: 64 }).notNull().unique(), // URL-safe base64 (32 bytes = ~44 chars)
    role: text('role', { length: 20 }).notNull(), // 'admin' or 'viewer'
    note: text('note', { length: 200 }), // Optional admin label
    createdBy: text('created_by')
      .notNull()
      .references(() => user.id, { onDelete: 'restrict' }), // TEXT to match Better-Auth user.id
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
    expiresAt: integer('expires_at', { mode: 'timestamp_ms' }).notNull(),
    usedAt: integer('used_at', { mode: 'timestamp_ms' }),
    usedBy: text('used_by').references(() => user.id, { onDelete: 'restrict' }), // TEXT to match Better-Auth user.id
    revokedAt: integer('revoked_at', { mode: 'timestamp_ms' }),
    revokedBy: text('revoked_by').references(() => user.id, { onDelete: 'restrict' }), // TEXT to match Better-Auth user.id
  },
  (table) => [
    index('idx_invitations_token').on(table.token),
    index('idx_invitations_created_by').on(table.createdBy),
    index('idx_invitations_status').on(table.usedAt, table.expiresAt, table.revokedAt),
  ]
);

export type Invitation = typeof invitations.$inferSelect;
```

**Relationships**: 
- `createdBy` → `user.id` (admin who created)
- `usedBy` → `user.id` (user who redeemed)
- `revokedBy` → `user.id` (admin who revoked)

**Notes**:
- Using `timestamp_ms` mode for consistency with Better-Auth tables
- Token is 32 bytes → URL-safe base64 → ~44 characters
- Role is 'admin' or 'viewer' (matches existing user.role values)
- Foreign keys use 'restrict' to prevent accidental data loss

#### Relations

```typescript
export const invitationRelations = relations(invitations, ({ one }) => ({
  creator: one(user, {
    fields: [invitations.createdBy],
    references: [user.id],
  }),
  redeemer: one(user, {
    fields: [invitations.usedBy],
    references: [user.id],
  }),
  revoker: one(user, {
    fields: [invitations.revokedBy],
    references: [user.id],
  }),
}));
```

### API Endpoints

| Method | Path | Purpose | Auth Required |
|--------|------|---------|---------------|
| GET | `/api/invitations` | List all invitations | Admin |
| POST | `/api/invitations` | Create new invitation | Admin |
| DELETE | `/api/invitations/[id]` | Revoke invitation | Admin |

**Note**: We're using API routes for potential future extensibility, but primary interaction will be through Server Actions for better Next.js integration.

### Components

#### Pages

- **`/settings/invitations/page.tsx`**: Server component showing invitation management UI (admin only)
  - Renders invitation creation form
  - Renders list of all invitations
  - Checks admin role via `requireAdmin()`

- **`/invite/[token]/page.tsx`**: Server component for invitation redemption (public)
  - Validates invitation token server-side
  - Renders redemption form or error message
  - No authentication required (public route)

#### Client Components

- **`<InvitationForm />`**: Create invitation form
  - Props: none (uses server action)
  - Role selector (admin/viewer)
  - Optional note field (max 200 chars)
  - Submit button with pending state
  - Error display

- **`<InvitationCard />`**: Single invitation display
  - Props: `invitation: Invitation`, `creator: User`
  - Status badge (Pending/Used/Expired/Revoked)
  - Copy link button
  - Revoke button (if unused)
  - Usage details (if used)

- **`<InvitationRedeemForm />`**: Redemption form
  - Props: `token: string`
  - Username input
  - Password input (with confirmation)
  - Submit button with pending state
  - Error display

#### Server Components

- **`<InvitationList />`**: List of all invitations
  - Fetches all invitations with creator info
  - Groups by status
  - Renders InvitationCard for each
  - Shows empty state if no invitations

### Server Actions

```typescript
// src/app/(protected)/settings/invitations/actions.ts
'use server';

/**
 * Create a new invitation
 * Admin only
 */
export async function createInvitation(
  state: FormState,
  formData: FormData
): Promise<FormState & { invitation?: { token: string; url: string } }> {
  // 1. Verify admin session
  // 2. Validate role and note
  // 3. Generate secure token (32 bytes)
  // 4. Calculate expiration (30 days)
  // 5. Insert invitation
  // 6. Return success with token and full URL
}

/**
 * Revoke an unused invitation
 * Admin only
 */
export async function revokeInvitation(
  id: number
): Promise<{ success: boolean; error?: string }> {
  // 1. Verify admin session
  // 2. Check invitation exists and is unused
  // 3. Update with revoked timestamp
  // 4. Revalidate path
}

// src/app/invite/[token]/actions.ts
'use server';

/**
 * Redeem an invitation to create account
 * Public (no auth required)
 */
export async function redeemInvitation(
  token: string,
  state: FormState,
  formData: FormData
): Promise<FormState> {
  // 1. Validate invitation (exists, not expired, not used, not revoked)
  // 2. Validate username (unique, format)
  // 3. Validate password (strength)
  // 4. Begin transaction:
  //    a. Create user with Better-Auth
  //    b. Mark invitation as used
  // 5. Sign in user (Better-Auth session)
  // 6. Redirect to home page
}
```

## Implementation Steps

### Phase 1: Database & Schema (Est: 1 hour)

- [x] Create migration file `migrations/0001_add_invitations.sql`
- [x] Update `src/lib/database/schema.ts` with invitations table
- [x] Add invitation relations
- [x] Create `src/lib/invitations/types.ts` with TypeScript types
- [x] Run migration: `npm run db:migrate`
- [x] Verify schema in Drizzle Studio: `npm run db:studio`

**Test Command**: `npm run db:studio` (manual verification)

### Phase 2: Business Logic & Token Generation (Est: 2 hours)

- [ ] Create `src/lib/invitations/invitations.ts`
- [ ] Implement `generateToken()` - crypto.randomBytes(32) + URL-safe base64
- [ ] Implement `validateInvitation()` - check all conditions
- [ ] Implement `getInvitationStatus()` - determine status enum
- [ ] Add error classes for different failure modes
- [ ] Create `src/lib/invitations/invitations.test.ts`
- [ ] Write unit tests for token generation (uniqueness, format)
- [ ] Write unit tests for validation logic (all edge cases)
- [ ] Ensure 90%+ test coverage

**Test Command**: `npm test src/lib/invitations`

### Phase 3: Server Actions - Admin (Est: 2 hours)

- [ ] Create `src/app/(protected)/settings/invitations/actions.ts`
- [ ] Implement `createInvitation()` server action
  - Admin authentication check
  - Token generation
  - Database insertion
  - Return full URL with token
- [ ] Implement `revokeInvitation()` server action
  - Admin authentication check
  - Validation (exists, not used)
  - Database update
  - Path revalidation
- [ ] Add comprehensive error handling
- [ ] Test with curl/Postman

**Test Command**: Manual testing with forms

### Phase 4: Server Actions - Redemption (Est: 2 hours)

- [ ] Create `src/app/invite/[token]/actions.ts`
- [ ] Implement `redeemInvitation()` server action
  - Invitation validation (all checks)
  - Username validation (unique, format)
  - Password validation (strength)
  - Transaction: create user + mark invitation used
  - Better-Auth integration (hash password, create account)
  - Sign in new user
  - Redirect to home
- [ ] Handle race conditions (simultaneous redemptions)
- [ ] Handle validation errors (don't mark invitation used)
- [ ] Test with database rollback scenarios

**Test Command**: Manual testing with forms

### Phase 5: UI Components - Admin (Est: 3 hours)

- [ ] Create `src/components/invitation-form.tsx` (client)
  - Role selector (admin/viewer)
  - Optional note input (max 200 chars)
  - useActionState for createInvitation
  - Pending state
  - Error display
  - Success state with copy button
- [ ] Create `src/components/invitation-card.tsx` (client)
  - Status badge with icons
  - Display: note, role, creator, dates
  - Copy link button (clipboard API)
  - Revoke button (if unused)
  - Usage info (if used)
- [ ] Create `src/components/invitation-list.tsx` (server)
  - Fetch all invitations with creator names
  - Group by status (pending, used, expired, revoked)
  - Empty state
  - Responsive table/cards
- [ ] Create `src/app/(protected)/settings/invitations/page.tsx`
  - Admin role check (requireAdmin)
  - Render InvitationForm
  - Render InvitationList
  - Page layout with existing design system
- [ ] Test responsive layout (mobile, tablet, desktop)

**Test Command**: Manual browser testing

### Phase 6: UI Components - Redemption (Est: 2 hours)

- [ ] Create `src/components/invitation-redeem-form.tsx` (client)
  - Username input
  - Password input with confirmation
  - useActionState for redeemInvitation
  - Pending state
  - Error display
  - Password strength indicator
- [ ] Create `src/app/invite/[token]/page.tsx`
  - Validate token server-side
  - Render form or error page
  - Show expiration countdown
  - Style with existing design system
- [ ] Create error states for invalid invitations
  - Invalid token
  - Expired
  - Already used
  - Revoked
- [ ] Test responsive layout

**Test Command**: Manual browser testing

### Phase 7: Integration & Testing (Est: 2 hours)

- [ ] Test complete admin flow:
  - Create invitation with note
  - Copy invitation link
  - View in invitations list
  - Revoke unused invitation
- [ ] Test complete redemption flow:
  - Valid invitation → account creation → auto-signin
  - Invalid token → error message
  - Expired invitation → error message
  - Already used → error message
  - Revoked invitation → error message
- [ ] Test edge cases:
  - Duplicate usernames during redemption
  - Weak passwords
  - Race conditions (two users, one invitation)
  - Admin deleting invitation creator
- [ ] Test authorization:
  - Non-admin cannot access invitations page
  - Non-admin cannot create/revoke invitations
- [ ] Run full test suite: `npm test`
- [ ] Run linter: `npm run lint`
- [ ] Check build: `npm run build`

**Test Command**: `npm test && npm run lint && npm run build`

### Phase 8: Documentation (Est: 1 hour)

- [ ] Update `.specs/FEATURE-STATUS.md` (mark as complete)
- [ ] Add inline code comments for token generation
- [ ] Add JSDoc comments for public functions
- [ ] Update CHANGELOG.md with feature addition
- [ ] Add invitation management to README (admin features section)
- [ ] Create user guide in spec directory (optional)

## Testing Strategy

### Unit Tests (Target: 90% coverage)

**Token Generation** (`src/lib/invitations/invitations.test.ts`):
- Generates 32-byte tokens
- Tokens are URL-safe base64 encoded
- Tokens are unique across multiple generations
- Handles crypto.randomBytes errors

**Invitation Validation**:
- Valid invitation returns success
- Expired invitation returns error
- Used invitation returns error
- Revoked invitation returns error
- Non-existent token returns error
- Handles edge case timestamps (just expired, about to expire)

**Status Determination**:
- Correctly identifies pending invitations
- Correctly identifies used invitations
- Correctly identifies expired invitations
- Correctly identifies revoked invitations
- Prioritizes statuses correctly (revoked > used > expired > pending)

### Integration Tests

**Server Actions**:
- createInvitation requires admin auth
- createInvitation generates valid token
- createInvitation sets correct expiration (30 days)
- revokeInvitation requires admin auth
- revokeInvitation fails on used invitation
- redeemInvitation creates user with correct role
- redeemInvitation marks invitation as used
- redeemInvitation signs in new user
- redeemInvitation handles race conditions

### Manual Testing Checklist

- [ ] Admin creates invitation with note
- [ ] Copy link button works (clipboard API)
- [ ] Invitation appears in list immediately
- [ ] Non-admin cannot access invitations page
- [ ] User redeems invitation successfully
- [ ] User is auto-signed in after redemption
- [ ] Used invitation shows in list with user info
- [ ] Cannot use same invitation twice
- [ ] Admin revokes unused invitation
- [ ] Revoked invitation cannot be used
- [ ] Expired invitation shows error message
- [ ] Invalid token shows error message
- [ ] Mobile responsive (forms, tables)
- [ ] Keyboard navigation works
- [ ] Screen reader announces status changes
- [ ] Error messages are clear and helpful
- [ ] Performance: invitation creation < 200ms
- [ ] Performance: invitation validation < 100ms

## Rollback Plan

If issues arise after deployment:

1. **Immediate**: 
   - Revert to previous Docker image
   - Feature is additive, existing auth still works

2. **Database**: 
   - Migration is additive (new table only)
   - Rollback SQL: `DROP TABLE invitations;`
   - No data loss risk (no existing data)

3. **Config**: 
   - No new environment variables required

4. **Monitor**: 
   - Check logs for invitation errors
   - Monitor invitation redemption success rate
   - Watch for failed authentication attempts

## Security Considerations

- [x] Admin routes protected by `requireAdmin()` helper
- [x] Token generation uses crypto.randomBytes (cryptographically secure)
- [x] 256-bit entropy makes token guessing infeasible
- [x] One-time use prevents replay attacks
- [x] Database transaction prevents race conditions
- [x] Password hashing via Better-Auth (scrypt)
- [x] Input validation on username (format, uniqueness)
- [x] Input validation on password (strength requirements)
- [x] Input validation on note (max 200 chars)
- [x] SQL injection prevented by Drizzle ORM
- [x] XSS prevention via React automatic escaping
- [x] CSRF protection via Better-Auth
- [x] Foreign key constraints prevent orphaned records

**Rate Limiting**: Consider adding in future phase (out of scope for v1)

## Performance Considerations

- [x] Token generation is synchronous (crypto.randomBytes)
- [x] Database indexes on token, created_by, status fields
- [x] Server components for static content (list view)
- [x] Client components only for interactive forms
- [x] Invitation validation does not use transactions (faster reads)
- [x] Copy-to-clipboard uses native Clipboard API (no dependencies)
- [x] Status determination calculated in-memory (no extra queries)

**Performance Targets**:
- Invitation creation: < 200ms (NFR-003)
- Invitation validation: < 100ms (NFR-004)
- Page load (invitations list): < 1s
- Redemption (full flow): < 500ms

## Open Questions

- [x] Should we add rate limiting on invitation validation endpoint?
  - **Answer**: Nice to have, but out of scope for v1. Add in future if abuse detected.

- [x] Should we send email notifications when invitation is used?
  - **Answer**: Out of scope (no email system). Future feature.

- [x] Should we allow admins to customize expiration time?
  - **Answer**: No, fixed at 30 days (per spec). Keeps UX simple.

- [x] Should we show invitation usage analytics?
  - **Answer**: Out of scope for v1. Can add dashboard in future.

## Dependencies

**External Dependencies** (already in package.json):
- None new - using existing crypto (Node.js built-in)

**Internal Dependencies**:
- Better-Auth for user creation and password hashing
- Existing auth helpers (`requireAdmin()`, `getSession()`)
- Existing form patterns (`useActionState`, `FormState`)
- Existing design system (components, CSS modules)

## References

- Feature Spec: [spec.md](./spec.md)
- Constitution: [../../CONSTITUTION.md](../../CONSTITUTION.md)
- Better-Auth Docs: https://www.better-auth.com/
- Drizzle ORM Docs: https://orm.drizzle.team/
- Next.js Server Actions: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions
- OWASP Token Generation: https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html

---

## Estimated Timeline

| Phase | Estimated Time | Dependencies |
|-------|----------------|--------------|
| Phase 1: Database & Schema | 1 hour | None |
| Phase 2: Business Logic | 2 hours | Phase 1 |
| Phase 3: Server Actions (Admin) | 2 hours | Phase 1, 2 |
| Phase 4: Server Actions (Redemption) | 2 hours | Phase 1, 2 |
| Phase 5: UI Components (Admin) | 3 hours | Phase 3 |
| Phase 6: UI Components (Redemption) | 2 hours | Phase 4 |
| Phase 7: Integration & Testing | 2 hours | All phases |
| Phase 8: Documentation | 1 hour | Phase 7 |

**Total Estimated Time**: ~15 hours (within spec estimate of ~12 hours)

**Parallelizable**:
- Phase 5 and Phase 6 can be developed in parallel after Phase 4

---

*This plan has been reviewed against the constitution and spec. Ready for implementation. Update this document as implementation progresses.*
