# Implementation Plan: [FEATURE NAME]

**Feature ID**: `[###-feature-name]`  
**Spec**: [Link to spec.md]  
**Date**: [DATE]  
**Branch**: `[###-feature-name]`

## Summary

[1-2 sentence summary of what will be implemented and the approach]

## Technical Context

**Framework**: Next.js 15 + React 18 + TypeScript 5  
**Database**: SQLite with Drizzle ORM  
**Authentication**: NextAuth.js v5  
**Styling**: new.css (classless)  
**Testing**: Vitest + React Testing Library  
**Validation**: TypeBox

## Constitution Check

Review against HD Homey Constitution:

- [ ] ✅ Follows Next.js app router conventions
- [ ] ✅ Uses server components by default
- [ ] ✅ Server actions for mutations
- [ ] ✅ TypeScript strict mode compliance
- [ ] ✅ Drizzle ORM for database access
- [ ] ✅ TypeBox validation at API boundaries
- [ ] ✅ Unit tests for business logic
- [ ] ✅ Soft deletes for data
- [ ] ✅ Authentication required (or explicitly exempt)
- [ ] ✅ Mobile responsive

**Violations/Justifications**: [None | Explain any violations and why they're necessary]

## Architecture

### Directory Structure

```
src/
├── app/
│   ├── (protected)/[feature]/
│   │   ├── page.tsx                    # Main feature page
│   │   ├── [id]/page.tsx               # Detail page
│   │   └── actions.ts                  # Server actions
│   └── api/[feature]/
│       └── route.ts                    # API endpoints
├── lib/
│   ├── [feature]/
│   │   ├── types.ts                    # TypeScript types
│   │   ├── [feature].ts                # Core business logic
│   │   └── validate.ts                 # TypeBox validation
│   └── database/
│       └── schema.ts                   # Drizzle schema additions
├── components/
│   └── [feature]-*.tsx                 # Reusable components
└── migrations/
    └── XXXX_[feature].sql              # Database migration

tests/
└── [feature]/
    └── [feature].test.ts               # Unit tests
```

### Data Model

#### New/Modified Tables

```typescript
// Drizzle schema
export const [tableName] = sqliteTable('[table_name]', {
  id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
  // ... fields
  is_active: integer('is_active', { mode: 'boolean' }).notNull().default(true),
  created_at: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  modified_at: integer('modified_at', { mode: 'timestamp' }).notNull().default(sql`(unixepoch())`),
  deleted_at: integer('deleted_at', { mode: 'timestamp' })
});
```

**Relationships**: [Describe foreign keys and relations]

#### TypeBox Validation Schemas

```typescript
// Runtime validation
export const [EntityName]Schema = Type.Object({
  // ... fields with validation rules
});
```

### API Endpoints

| Method | Path | Purpose | Auth Required |
|--------|------|---------|---------------|
| GET | `/api/[resource]` | List items | Yes |
| GET | `/api/[resource]/[id]` | Get single item | Yes |
| POST | `/api/[resource]` | Create item | Admin |
| PUT | `/api/[resource]/[id]` | Update item | Admin |
| DELETE | `/api/[resource]/[id]` | Soft delete item | Admin |

### Components

#### Pages

- **`/[feature]/page.tsx`**: [Description, server or client component]
- **`/[feature]/[id]/page.tsx`**: [Description, server or client component]

#### Reusable Components

- **`<ComponentName />`**: [Purpose, props, client or server]

### Server Actions

```typescript
// src/app/(protected)/[feature]/actions.ts
'use server';

export async function createItem(prevState: unknown, formData: FormData) {
  // Validation with TypeBox
  // Database operation with Drizzle
  // Revalidate path
  // Redirect or return errors
}
```

## Implementation Steps

### Phase 1: Database & Validation (Est: [time])

- [ ] Create migration file for new tables
- [ ] Update `src/lib/database/schema.ts` with Drizzle schemas
- [ ] Generate TypeBox validation schemas in `src/lib/[feature]/validate.ts`
- [ ] Write unit tests for validation
- [ ] Run migration: `npm run db:migrate`

**Test Command**: `npm test src/lib/[feature]`

### Phase 2: Business Logic (Est: [time])

- [ ] Create `src/lib/[feature]/[feature].ts` with core logic
- [ ] Implement main business functions
- [ ] Add error handling
- [ ] Write unit tests for business logic
- [ ] Ensure 80%+ test coverage

**Test Command**: `npm test -- --coverage`

### Phase 3: API Endpoints (Est: [time])

- [ ] Create `src/app/api/[feature]/route.ts`
- [ ] Implement GET/POST/PUT/DELETE handlers
- [ ] Add TypeBox validation at API boundaries
- [ ] Add authentication checks
- [ ] Test with curl/Postman

**Test Command**: Manual API testing

### Phase 4: Server Actions (Est: [time])

- [ ] Create `src/app/(protected)/[feature]/actions.ts`
- [ ] Implement form submission handlers
- [ ] Add error handling and validation
- [ ] Add revalidatePath/redirect logic
- [ ] Test with React forms

### Phase 5: UI Components (Est: [time])

- [ ] Create main page at `src/app/(protected)/[feature]/page.tsx`
- [ ] Create detail page if needed
- [ ] Build reusable components
- [ ] Style with semantic HTML (new.css)
- [ ] Add loading/error states
- [ ] Test responsive layout

**Test Command**: Manual browser testing

### Phase 6: Integration & Testing (Est: [time])

- [ ] Test complete user flows
- [ ] Verify authentication/authorization
- [ ] Check error handling
- [ ] Test edge cases
- [ ] Run full test suite
- [ ] Run linter

**Test Command**: `npm test && npm run lint`

### Phase 7: Documentation (Est: [time])

- [ ] Update README if new features exposed
- [ ] Add inline code comments for complex logic
- [ ] Update API documentation
- [ ] Create migration guide if breaking changes

## Testing Strategy

### Unit Tests
- Business logic in `src/lib/[feature]`
- Validation functions
- Helper utilities

### Integration Tests
- Server actions
- API routes
- Database operations

### Manual Testing Checklist
- [ ] Happy path user flow
- [ ] Error scenarios
- [ ] Mobile responsiveness
- [ ] Browser compatibility
- [ ] Authentication/authorization
- [ ] Performance (page load, API response)

## Rollback Plan

If issues arise after deployment:

1. **Immediate**: Revert to previous Docker image
2. **Database**: Run rollback migration if needed
3. **Config**: Restore previous environment variables
4. **Monitor**: Check logs for errors

## Security Considerations

- [ ] All routes protected by authentication middleware
- [ ] Role-based access control implemented
- [ ] Input validation with TypeBox
- [ ] SQL injection prevention (Drizzle ORM)
- [ ] XSS prevention (React escaping)
- [ ] CSRF protection (NextAuth.js)

## Performance Considerations

- [ ] Database queries optimized (use indexes)
- [ ] Server components for static content
- [ ] SWR for client-side data fetching
- [ ] Lazy loading for large lists
- [ ] Streaming for video content

## Open Questions

- [ ] Question 1?
- [ ] Question 2?

## References

- Feature Spec: [link]
- Design Mockups: [link]
- Related PRs: [links]

---

*This plan should be reviewed before implementation begins. Update as needed during development.*
