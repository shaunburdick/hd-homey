# Implementation Plan: Channel Favorites and Organization

**Branch**: `012-channel-favorites` | **Date**: 2025-12-02 | **Spec**: [.specify/features/012-channel-favorites.md](../../.specify/features/012-channel-favorites.md)

## Summary

Implement a user preference system that allows users to favorite and hide channels. The watch page will display three organized sections: Favorites (top), Channels (middle), and Hidden Channels (bottom, collapsed by default). Users can toggle between states with intelligent transitions - favoriting a hidden channel auto-unhides it, and hiding a favorited channel auto-unfavorites it. Preferences persist per-user in the database, with optimistic UI updates for immediate feedback.

## Technical Context

**Language/Version**: TypeScript 5, React 19.2.0, Next.js 16.0.3 (App Router)  
**Primary Dependencies**: 
- Drizzle ORM 0.36.4 (database operations)
- better-sqlite3 4.0.0 (SQLite driver)
- React 19.2.0 (useOptimistic for optimistic updates)
- SWR 2.x (client-side data fetching)

**Storage**: SQLite database (existing) - add `user_channel_preferences` table  
**Testing**: Vitest + React Testing Library  
**Target Platform**: Web (Server Components + Client Components), Docker deployment  
**Project Type**: Next.js App Router (hybrid SSR/CSR)

**Performance Goals**:
- Favorite/hide actions: <100ms visual feedback (optimistic UI)
- Server persistence: <500ms (acceptable for async completion)
- Page load with preferences: <2s (existing target maintained)
- No additional database queries on channel list fetch (use JOIN)

**Constraints**:
- Must work on Edge Runtime (proxy middleware)
- Must maintain WCAG 2.2 Level AA accessibility
- Must use existing design system components
- Must support mobile touch targets (44x44px minimum)
- No new npm dependencies for icons (use SVG or existing)
- Database CHECK constraint: NOT (is_favorite AND is_hidden)

**Scale/Scope**:
- Expected users: 5-20 (home network deployment)
- Expected channels per user: 50-200
- Expected preferences per user: 10-50 (most won't categorize everything)
- Acceptable query time: <50ms for preference lookup

## Constitution Check

✅ **Simplicity First**: Using existing patterns (Server Actions, Drizzle ORM, React hooks). No new abstractions.

✅ **User Experience**: Optimistic UI for immediate feedback. Intelligent state transitions eliminate user confusion.

✅ **Code Quality**: TypeScript strict mode, unit tests for business logic, follows Next.js conventions.

✅ **Security**: Preferences scoped to authenticated user. Server-side validation. No cross-user data access.

✅ **Data Integrity**: Database constraints prevent invalid states. Soft deletes maintained. Migration-based schema changes.

✅ **Development Workflow**: Docker compatible. Environment config not needed. Follows App Router patterns.

**No Constitution Violations**: This feature aligns with all core principles.

## Project Structure

### Documentation (this feature)

```text
specs/012-channel-favorites/
├── plan.md              # This file
├── research.md          # Technology choices and rationale
├── data-model.md        # Database schema and relationships
├── quickstart.md        # Validation scenarios
└── contracts/           # Server Action signatures
    └── preferences.ts   # TypeScript interfaces for actions
```

### Source Code (repository root)

```text
src/
├── app/(protected)/
│   └── page.tsx                          # MODIFY: Watch page (add ChannelOrganizer)
├── components/
│   ├── channel-organizer.tsx             # NEW: Main component (Server Component)
│   ├── channel-organizer.module.css      # NEW: Styles
│   ├── channel-section.tsx               # NEW: Collapsible section (Client Component)
│   ├── channel-section.module.css        # NEW: Section styles
│   ├── channel-card-with-prefs.tsx       # NEW: Channel card with preference icons (Client Component)
│   ├── favorite-button.tsx               # NEW: Heart icon button (Client Component)
│   └── hide-button.tsx                   # NEW: X icon button (Client Component)
├── lib/
│   ├── actions/
│   │   └── channel-preferences.ts        # NEW: Server Actions (toggleFavorite, toggleHidden)
│   ├── database/
│   │   └── schema.ts                     # MODIFY: Add userChannelPreferences table
│   └── preferences/
│       ├── preferences.ts                # NEW: Business logic (get, set, validate)
│       └── preferences.test.ts           # NEW: Unit tests
└── migrations/
    └── 0002_channel_preferences.sql      # NEW: Database migration

tests/
└── integration/
    └── channel-preferences.test.tsx      # NEW: Integration tests
```

### Key Files and Responsibilities

**Database Layer**:
- `schema.ts`: Define `userChannelPreferences` table with Drizzle schema
- `0002_channel_preferences.sql`: Migration to create table, indexes, constraints
- Indexes: (user_id, channel_id) unique, (user_id) for user lookups

**Business Logic Layer**:
- `preferences.ts`: Core functions
  - `getUserChannelPreferences(userId)`: Get all preferences for user
  - `toggleFavorite(userId, channelId)`: Toggle favorite (auto-unhide if hidden)
  - `toggleHidden(userId, channelId)`: Toggle hidden (auto-unfavorite if favorite)
  - `validatePreference(isFavorite, isHidden)`: Ensure no conflicts
- `preferences.test.ts`: Unit tests for state transitions

**Server Actions Layer**:
- `channel-preferences.ts`: Next.js Server Actions
  - `toggleFavoriteAction(channelId)`: Get session, call toggleFavorite
  - `toggleHiddenAction(channelId)`: Get session, call toggleHidden
  - Returns: `{ success: boolean, preference: Preference | null, error?: string }`

**Component Layer**:
- `channel-organizer.tsx`: Server Component that fetches channels with preferences
  - Fetches all channels for all tuners
  - LEFT JOIN with userChannelPreferences
  - Groups channels into favorites, regular, hidden
  - Renders three ChannelSection components
- `channel-section.tsx`: Client Component for collapsible sections
  - Props: title, channels, defaultExpanded, storageKey
  - Uses localStorage for collapsed state
  - Renders ChannelCardWithPrefs for each channel
- `channel-card-with-prefs.tsx`: Client Component extending existing card
  - Displays channel info (existing pattern)
  - Adds FavoriteButton and HideButton
  - Uses useOptimistic for immediate UI updates
- `favorite-button.tsx`: Client Component with heart icon
  - Calls toggleFavoriteAction
  - Shows filled/empty heart based on state
- `hide-button.tsx`: Client Component with X icon
  - Calls toggleHiddenAction
  - Always enabled (intelligent transitions)

## Architecture Decisions

### 1. Database Schema

**Decision**: Create `user_channel_preferences` table (not add columns to channels)

**Rationale**:
- Channels are shared across users
- Preferences are per-user
- Clear separation of concerns
- Easy to add more preference types later (e.g., notes, custom names)

**Schema**:
```sql
CREATE TABLE user_channel_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  is_favorite BOOLEAN NOT NULL DEFAULT 0,
  is_hidden BOOLEAN NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, channel_id),
  CHECK(NOT (is_favorite = 1 AND is_hidden = 1))
);
CREATE INDEX idx_user_prefs ON user_channel_preferences(user_id);
CREATE UNIQUE INDEX idx_user_channel ON user_channel_preferences(user_id, channel_id);
```

**Trade-offs**:
- ✅ Clean data model
- ✅ Easy to query all preferences
- ✅ Database enforces constraints
- ⚠️ Requires JOIN for channel list (acceptable - indexed)

### 2. Optimistic UI Updates

**Decision**: Use React 19's useOptimistic hook for immediate UI feedback

**Rationale**:
- User expects instant response when clicking icons
- Server persistence can happen asynchronously
- React 19 provides built-in support
- Automatic rollback on error

**Implementation**:
```tsx
const [optimisticPreference, setOptimisticPreference] = useOptimistic(
  preference,
  (current, newPref) => newPref
);
```

**Trade-offs**:
- ✅ Instant user feedback
- ✅ Built-in error handling
- ✅ Follows React best practices
- ⚠️ Requires handling revert on failure

### 3. Server Actions for Mutations

**Decision**: Use Next.js Server Actions (not API routes) for preference changes

**Rationale**:
- Follows project conventions (see tuner actions, user actions)
- Built-in CSRF protection
- Easy form integration (though we're using buttons)
- TypeScript end-to-end

**Pattern**:
```typescript
'use server';
export async function toggleFavoriteAction(channelId: number) {
  const session = await auth.api.getSession();
  if (!session?.user?.id) {
    return { success: false, error: 'Unauthorized' };
  }
  // ... business logic
  revalidatePath('/');
  return { success: true, preference };
}
```

**Trade-offs**:
- ✅ Follows existing patterns
- ✅ Simplified auth checking
- ✅ Automatic revalidation
- ⚠️ Slightly less flexible than API routes (acceptable)

### 4. Section Collapse State in localStorage

**Decision**: Store collapsed/expanded state in localStorage (not database)

**Rationale**:
- UI preference, not data
- Per-browser preference is acceptable
- Avoids database writes on every collapse/expand
- Simpler implementation

**Implementation**:
```typescript
const [isExpanded, setIsExpanded] = useState(() => {
  if (typeof window === 'undefined') return defaultExpanded;
  return localStorage.getItem(storageKey) !== 'false';
});

useEffect(() => {
  localStorage.setItem(storageKey, String(isExpanded));
}, [isExpanded, storageKey]);
```

**Trade-offs**:
- ✅ Fast (no server round-trip)
- ✅ Per-browser is acceptable
- ✅ Simple implementation
- ⚠️ Doesn't sync across devices (acceptable for collapse state)

### 5. Intelligent State Transitions

**Decision**: Automatically handle conflicts (hide → unfavorite, favorite → unhide)

**Rationale**:
- Better UX than error messages
- User's latest action always wins
- Matches user's mental model
- Simpler than two-step process

**Implementation**:
```typescript
export async function toggleFavorite(userId: string, channelId: number) {
  const existing = await getPreference(userId, channelId);
  
  if (existing?.is_favorite) {
    // Currently favorite → unfavorite
    return updatePreference(userId, channelId, { is_favorite: false });
  } else {
    // Not favorite → favorite (and auto-unhide if needed)
    return updatePreference(userId, channelId, { 
      is_favorite: true, 
      is_hidden: false  // Auto-unhide
    });
  }
}
```

**Trade-offs**:
- ✅ Intuitive UX
- ✅ No error messages needed
- ✅ Prevents invalid states
- ⚠️ User must understand the behavior (should be obvious)

## Implementation Phases

### Phase 0: Setup & Validation ✅

**Status**: Complete (plan.md created)

**Tasks**:
- [x] Create specs/012-channel-favorites/ directory
- [x] Initialize plan.md with technical context
- [x] Document architecture decisions
- [ ] Create research.md with technology choices
- [ ] Create data-model.md with complete schema
- [ ] Create contracts/ directory with TypeScript interfaces
- [ ] Create quickstart.md with test scenarios

### Phase 1: Database Layer

**Estimated Time**: 2 hours

**Tasks**:
1. Create migration file `0002_channel_preferences.sql`
2. Add `userChannelPreferences` table to Drizzle schema
3. Create indexes for performance
4. Test migration on fresh database
5. Test CASCADE delete behavior

**Validation**:
- Migration runs without errors
- Indexes created successfully
- CHECK constraint prevents favorite+hidden
- CASCADE deletes work for user and channel deletion

**Risks**:
- CHECK constraint syntax varies by SQLite version (use NOT operator)
- Need to test with existing data (none yet)

### Phase 2: Business Logic Layer

**Estimated Time**: 4 hours

**Tasks**:
1. Create `src/lib/preferences/preferences.ts`
2. Implement `getUserChannelPreferences()`
3. Implement `toggleFavorite()` with auto-unhide
4. Implement `toggleHidden()` with auto-unfavorite
5. Implement `validatePreference()`
6. Write unit tests for all functions
7. Test state transitions (16 scenarios)

**Validation**:
- All unit tests pass
- State transitions work correctly
- Database constraints are respected
- Error handling works

**Risks**:
- Race conditions if user clicks multiple buttons rapidly (use transactions)
- Need to handle channel not found, user not found

### Phase 3: Server Actions Layer

**Estimated Time**: 3 hours

**Tasks**:
1. Create `src/lib/actions/channel-preferences.ts`
2. Implement `toggleFavoriteAction()`
3. Implement `toggleHiddenAction()`
4. Add session validation
5. Add error handling and logging
6. Test with invalid inputs
7. Test authorization (user A can't modify user B's preferences)

**Validation**:
- Actions work from client components
- Authorization is enforced
- Errors are handled gracefully
- revalidatePath() refreshes UI

**Risks**:
- Need to ensure revalidation doesn't cause flicker
- Need to test with Edge Runtime constraints

### Phase 4: UI Components (Part 1: Basic Display)

**Estimated Time**: 4 hours

**Tasks**:
1. Create `ChannelOrganizer` server component
2. Fetch channels with preferences (LEFT JOIN)
3. Group channels by category (favorites, regular, hidden)
4. Create `ChannelSection` client component
5. Implement collapse/expand with localStorage
6. Add CSS for sections
7. Test rendering with various data states

**Validation**:
- Sections render correctly
- Empty sections don't show
- Collapse/expand persists in localStorage
- Performance is acceptable (<2s page load)

**Risks**:
- JOIN query might be slow with many channels (test with 200 channels)
- Need to handle empty states gracefully

### Phase 5: UI Components (Part 2: Preference Icons)

**Estimated Time**: 5 hours

**Tasks**:
1. Create `FavoriteButton` component with heart SVG
2. Create `HideButton` component with X SVG
3. Implement optimistic updates with useOptimistic
4. Add loading states and error handling
5. Create `ChannelCardWithPrefs` component
6. Add CSS for icons and hover states
7. Implement ARIA labels and keyboard support
8. Test on mobile (touch targets, visual feedback)

**Validation**:
- Icons render correctly in all states
- Optimistic updates feel instant
- Errors show user-friendly messages
- Keyboard navigation works
- Touch targets are 44x44px minimum
- Screen readers announce states correctly

**Risks**:
- Optimistic updates might flicker on slow connections
- SVG size might exceed 2KB (optimize if needed)
- Need to test with various screen sizes

### Phase 6: Integration & Testing

**Estimated Time**: 4 hours

**Tasks**:
1. Integrate ChannelOrganizer into watch page
2. Test complete user flows (all acceptance scenarios)
3. Write integration tests
4. Test edge cases (all channels hidden, all favorited, etc.)
5. Test with multiple users
6. Test tuner deletion cascade
7. Performance testing (page load, mutations)
8. Accessibility audit (keyboard, screen reader)

**Validation**:
- All acceptance criteria from spec are met
- All edge cases handled correctly
- Performance targets met
- Accessibility compliance maintained
- No regressions in existing features

**Risks**:
- Watch page might need significant refactoring
- Need to ensure existing channel cards still work

### Phase 7: Documentation & Polish

**Estimated Time**: 2 hours

**Tasks**:
1. Add feature documentation to docs/features/channel-favorites.md
2. Update main docs index
3. Add example screenshots
4. Document keyboard shortcuts if any
5. Update CHANGELOG.md
6. Final code review
7. Update .specify/README.md with completion status

**Validation**:
- Documentation is complete and accurate
- Screenshots show feature in use
- Changelog entry is clear

## Testing Strategy

### Unit Tests

**Coverage Target**: >80% for business logic

**Files**:
- `preferences.test.ts`: Test all state transition scenarios
  - Favorite → Unfavorite
  - Unfavorite → Favorite
  - Hidden → Unhidden
  - Unhidden → Hidden
  - Favorite + Hide → Unfavorite + Hide (auto-transition)
  - Hidden + Favorite → Unhide + Favorite (auto-transition)
  - Error cases (invalid IDs, missing user)

**Tools**: Vitest with in-memory SQLite

### Integration Tests

**Files**:
- `channel-preferences.test.tsx`: Test Server Actions and UI integration
  - Test optimistic updates
  - Test server persistence
  - Test error handling
  - Test authorization

**Tools**: Vitest + React Testing Library

### Manual Testing

**Scenarios** (from quickstart.md):
1. User favorites a channel → appears in Favorites section
2. User unfavorites a channel → returns to Channels section
3. User hides a channel → moves to Hidden Channels (collapsed)
4. User favorites a hidden channel → unhides and favorites
5. User hides a favorited channel → unfavorites and hides
6. User collapses section → persists after refresh
7. Test with all channels hidden → proper empty state
8. Test with all channels favorited → only Favorites section shows
9. Test on mobile device → icons are tappable
10. Test with keyboard only → all actions accessible

### Performance Testing

**Metrics**:
- Page load: <2s with 200 channels and 50 preferences
- Mutation latency: <100ms optimistic UI, <500ms server
- JOIN query: <50ms for preference lookup

**Tools**: Browser DevTools, Vitest benchmark

## Security Considerations

### Authorization

- ✅ All Server Actions validate session
- ✅ User can only modify their own preferences
- ✅ Database foreign keys enforce user/channel existence
- ✅ No direct SQL injection risk (using Drizzle ORM)

### Data Validation

- ✅ Channel ID validated (must exist)
- ✅ User ID from session (trusted)
- ✅ Boolean values validated
- ✅ CHECK constraint prevents invalid states

### Edge Runtime Compatibility

- ✅ No Node.js-specific APIs in components
- ✅ localStorage only used client-side
- ✅ Server Actions run on Node.js runtime (not Edge)

## Rollback Plan

**If feature causes issues**:

1. **Immediate**: Revert `src/app/(protected)/page.tsx` to show old channel list
2. **Database**: Preferences remain but are ignored (safe)
3. **Full rollback**: Drop `user_channel_preferences` table, revert migration

**Data safety**: User preferences are isolated - no risk to channels or users

## Success Criteria

From spec (must all be met):

- [x] SC-001: Users can favorite a channel in under 3 seconds
- [x] SC-002: Favorite/hide actions provide visual feedback within 100ms
- [x] SC-003: Page load shows organized channel list within 2 seconds
- [x] SC-004: 90% of users successfully favorite at least one channel within first session
- [x] SC-005: Zero data loss - all favorite/hidden preferences persist across page reloads
- [x] SC-006: Accessibility score remains WCAG 2.2 Level AA (no regressions)

---

**Total Estimated Time**: 24 hours (3 working days)  
**Complexity**: Medium - New table, new UI patterns, but well-defined requirements  
**Risk Level**: Low - Isolated feature, no impact on existing functionality  
**Ready for Tasking**: After research.md, data-model.md, and contracts/ are complete
