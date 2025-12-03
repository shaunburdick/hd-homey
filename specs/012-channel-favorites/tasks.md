# Implementation Tasks: Channel Favorites

**Branch**: `012-channel-favorites` | **Date**: 2025-12-02 | **Spec**: SPEC-012 v1.1

## Task Status Legend
- [ ] Pending
- [x] Complete
- [P] Can be done in parallel with adjacent [P] tasks

## Phase 1: Database Layer (2 hours)

### 1.1 Create Database Migration
- [ ] Create `migrations/0002_channel_preferences.sql` with table definition
- [ ] Add CHECK constraint: `NOT (is_favorite = 1 AND is_hidden = 1)`
- [ ] Add CASCADE delete for user_id and channel_id foreign keys
- [ ] Add UNIQUE constraint on (user_id, channel_id)

### 1.2 Create Database Indexes
- [ ] Add index on user_id: `idx_user_prefs`
- [ ] Add unique index on (user_id, channel_id): `idx_user_channel`

### 1.3 Update Drizzle Schema
- [ ] Add `userChannelPreferences` table definition to `src/lib/database/schema.ts`
- [ ] Define TypeScript types for select/insert operations
- [ ] Add relations to user and channels tables

### 1.4 Test Migration
- [ ] Run migration on clean database: `npm run db:migrate`
- [ ] Verify table created with correct schema
- [ ] Test CHECK constraint prevents is_favorite=1 AND is_hidden=1
- [ ] Test CASCADE delete when user is deleted
- [ ] Test CASCADE delete when channel is deleted

## Phase 2: Business Logic Layer (4 hours)

### 2.1 Create Preferences Module
- [ ] Create `src/lib/preferences/preferences.ts`
- [ ] Add imports for database, schema, types

### 2.2 Implement Core Functions
- [ ] Implement `getUserChannelPreferences(userId: string)`
  - Query with LEFT JOIN to include channels without preferences
  - Return array of channel IDs with preference flags
- [ ] Implement `getPreference(userId: string, channelId: number)`
  - Return single preference or null
- [ ] Implement `upsertPreference(userId, channelId, { is_favorite, is_hidden })`
  - Use INSERT OR REPLACE pattern
  - Update `updated_at` timestamp

### 2.3 Implement State Transition Functions
- [ ] Implement `toggleFavorite(userId: string, channelId: number)`
  - Get existing preference
  - If favorite → set is_favorite=false
  - If not favorite → set is_favorite=true, is_hidden=false (auto-unhide)
  - Return updated preference
- [ ] Implement `toggleHidden(userId: string, channelId: number)`
  - Get existing preference
  - If hidden → set is_hidden=false
  - If not hidden → set is_hidden=true, is_favorite=false (auto-unfavorite)
  - Return updated preference

### 2.4 Write Unit Tests
- [ ] Create `src/lib/preferences/preferences.test.ts`
- [ ] Test getUserChannelPreferences with no preferences
- [ ] Test getUserChannelPreferences with mixed preferences
- [ ] Test toggleFavorite: unfavorite → favorite transition
- [ ] Test toggleFavorite: favorite → unfavorite transition
- [ ] Test toggleFavorite on hidden channel (auto-unhides)
- [ ] Test toggleHidden: unhidden → hidden transition
- [ ] Test toggleHidden: hidden → unhidden transition
- [ ] Test toggleHidden on favorited channel (auto-unfavorites)
- [ ] Test error handling for invalid user ID
- [ ] Test error handling for invalid channel ID
- [ ] Run tests: `npm test preferences.test.ts`

## Phase 3: Server Actions Layer (3 hours)

### 3.1 Create Server Actions File
- [ ] Create `src/lib/actions/channel-preferences.ts`
- [ ] Add `"use server"` directive
- [ ] Import auth, preferences module, types

### 3.2 Implement Toggle Actions
- [ ] Implement `toggleFavoriteAction(channelId: number)`
  - Get session with `auth.api.getSession()`
  - Validate user is authenticated
  - Call `toggleFavorite(userId, channelId)`
  - Return `{ success: boolean, preference: Preference | null, error?: string }`
- [ ] Implement `toggleHiddenAction(channelId: number)`
  - Get session with `auth.api.getSession()`
  - Validate user is authenticated
  - Call `toggleHidden(userId, channelId)`
  - Return `{ success: boolean, preference: Preference | null, error?: string }`

### 3.3 Add Error Handling
- [ ] Add try-catch blocks for database errors
- [ ] Log errors with logger
- [ ] Return user-friendly error messages
- [ ] Handle session not found (return unauthorized error)

### 3.4 Test Server Actions
- [ ] Test toggleFavoriteAction with valid input
- [ ] Test toggleFavoriteAction without session (should fail)
- [ ] Test toggleHiddenAction with valid input
- [ ] Test toggleHiddenAction with invalid channel ID (should fail)
- [ ] Verify actions work from client components

## Phase 4: UI Components - Display Layer (4 hours)

### 4.1 Create Channel Section Component
- [ ] Create `src/components/channel-section.tsx` (Client Component)
- [ ] Add props: `title`, `channels`, `defaultExpanded`, `storageKey`
- [ ] Implement collapse/expand with useState
- [ ] Save collapsed state to localStorage on change
- [ ] Load collapsed state from localStorage on mount
- [ ] Create `src/components/channel-section.module.css`
- [ ] Style section header (title + chevron icon)
- [ ] Style collapsed/expanded states
- [ ] Add smooth transition animation

### 4.2 Create Channel Organizer Component
- [ ] Create `src/components/channel-organizer.tsx` (Server Component)
- [ ] Fetch channels from all tuners
- [ ] Fetch user preferences with `getUserChannelPreferences()`
- [ ] Group channels into three arrays: favorites, regular, hidden
- [ ] Render ChannelSection for Favorites (defaultExpanded=true)
- [ ] Render ChannelSection for Channels (defaultExpanded=true)
- [ ] Render ChannelSection for Hidden (defaultExpanded=false)
- [ ] Create `src/components/channel-organizer.module.css`
- [ ] Add spacing between sections
- [ ] Handle empty states (don't render empty sections)

### 4.3 Test Display Components
- [ ] Test ChannelSection collapse/expand
- [ ] Test localStorage persistence after refresh
- [ ] Test with empty channels array (should render nothing)
- [ ] Test ChannelOrganizer with no preferences (all in Channels)
- [ ] Test ChannelOrganizer with favorites only
- [ ] Test ChannelOrganizer with hidden only
- [ ] Test ChannelOrganizer with all three sections

## Phase 5: UI Components - Preference Icons (5 hours)

### 5.1 Create Favorite Button Component
- [ ] Create `src/components/favorite-button.tsx` (Client Component)
- [ ] Add props: `channelId`, `isFavorite`, `onToggle`
- [ ] Create inline heart SVG icon (~300 bytes)
  - Empty heart when not favorite
  - Filled heart when favorite
- [ ] Add onClick handler calling `onToggle`
- [ ] Add ARIA label: "Favorite this channel" / "Unfavorite this channel"
- [ ] Add title tooltip
- [ ] Style button (transparent, icon color changes on hover)
- [ ] Ensure 44x44px touch target

### 5.2 Create Hide Button Component
- [ ] Create `src/components/hide-button.tsx` (Client Component)
- [ ] Add props: `channelId`, `isHidden`, `onToggle`
- [ ] Create inline X SVG icon (~300 bytes)
  - Gray X when not hidden
  - Red X when hidden
- [ ] Add onClick handler calling `onToggle`
- [ ] Add ARIA label: "Hide this channel" / "Unhide this channel"
- [ ] Add title tooltip
- [ ] Style button (transparent, icon color changes on hover)
- [ ] Ensure 44x44px touch target

### 5.3 Create Channel Card with Preferences
- [ ] Create `src/components/channel-card-with-prefs.tsx` (Client Component)
- [ ] Add props: `channel`, `isFavorite`, `isHidden`, `tunerName`
- [ ] Import existing channel display logic or component
- [ ] Add FavoriteButton and HideButton to card
- [ ] Position icons in top-right corner of card
- [ ] Implement useOptimistic for immediate UI updates
  ```tsx
  const [optimisticPrefs, setOptimisticPrefs] = useOptimistic(
    { isFavorite, isHidden },
    (_, newPrefs) => newPrefs
  );
  ```
- [ ] Create toggle handlers calling Server Actions
  ```tsx
  async function handleFavorite() {
    setOptimisticPrefs({ ...optimisticPrefs, isFavorite: !isFavorite });
    const result = await toggleFavoriteAction(channel.id);
    if (!result.success) {
      // Error handling - optimistic update auto-reverts
      toast.error(result.error);
    }
  }
  ```

### 5.4 Add Loading and Error States
- [ ] Add pending state with useTransition
- [ ] Show subtle loading indicator during server call
- [ ] Handle errors from Server Actions
- [ ] Add toast/alert for persistent errors
- [ ] Test rapid clicking (should not create race conditions)

### 5.5 Style Preference Icons
- [ ] Add hover effects (scale, color change)
- [ ] Add active/pressed state
- [ ] Add focus ring for keyboard navigation
- [ ] Add smooth transitions for state changes
- [ ] Test on mobile (visual feedback on tap)
- [ ] Test on desktop (hover effects)

### 5.6 Accessibility Testing
- [ ] Test keyboard navigation (Tab, Enter, Space)
- [ ] Test with screen reader (NVDA/JAWS)
- [ ] Verify ARIA labels are announced correctly
- [ ] Verify focus indicators are visible
- [ ] Test high contrast mode

## Phase 6: Integration & Testing (4 hours)

### 6.1 Integrate into Watch Page
- [ ] Open `src/app/(protected)/page.tsx`
- [ ] Import ChannelOrganizer component
- [ ] Replace existing channel list with ChannelOrganizer
- [ ] Test that existing functionality still works
- [ ] Update ChannelOrganizer to pass channel data correctly
- [ ] Update ChannelSection to use ChannelCardWithPrefs

### 6.2 End-to-End User Flow Testing
- [ ] Test Scenario 1: Favorite a channel → appears in Favorites section
- [ ] Test Scenario 2: Unfavorite a channel → moves to Channels section
- [ ] Test Scenario 3: Hide a channel → moves to Hidden Channels (collapsed)
- [ ] Test Scenario 4: Unhide a channel → moves back to Channels section
- [ ] Test Scenario 5: Favorite a hidden channel → auto-unhides and favorites
- [ ] Test Scenario 6: Hide a favorited channel → auto-unfavorites and hides
- [ ] Test Scenario 7: Collapse section → persists after page refresh
- [ ] Test Scenario 8: All channels hidden → proper empty state
- [ ] Test Scenario 9: All channels favorited → only Favorites section visible
- [ ] Test Scenario 10: Multi-user - User A can't see User B's preferences

### 6.3 Edge Case Testing
- [ ] Test with 0 channels (empty tuner)
- [ ] Test with 200 channels (performance)
- [ ] Test with 50 favorites, 50 hidden, 100 regular
- [ ] Test tuner deletion → channels cascade delete → preferences cascade delete
- [ ] Test user deletion → preferences cascade delete
- [ ] Test channel refresh (lineup update) → preferences persist
- [ ] Test rapid toggling (click favorite 10 times fast)

### 6.4 Performance Testing
- [ ] Measure page load time with 200 channels
  - Target: <2 seconds
- [ ] Measure preference toggle optimistic update
  - Target: <100ms visual feedback
- [ ] Measure server persistence time
  - Target: <500ms
- [ ] Check database query performance with EXPLAIN QUERY PLAN
  - Verify indexes are used

### 6.5 Mobile Testing
- [ ] Test on small screen (320px width)
- [ ] Test touch targets (should be 44x44px minimum)
- [ ] Test with touch (no hover states available)
- [ ] Test landscape orientation
- [ ] Test with device emulation in DevTools

### 6.6 Cross-Browser Testing
- [ ] Test in Chrome
- [ ] Test in Firefox
- [ ] Test in Safari (if available)
- [ ] Test in Edge

## Phase 7: Documentation & Polish (2 hours)

### 7.1 [P] Create Feature Documentation
- [ ] Create `docs/features/channel-favorites.md`
- [ ] Document feature overview
- [ ] Add step-by-step usage instructions
- [ ] Add screenshots of three sections
- [ ] Document intelligent state transitions
- [ ] Document keyboard shortcuts
- [ ] Add troubleshooting section

### 7.2 [P] Update Documentation Index
- [ ] Update `docs/features/index.md` with Channel Favorites link
- [ ] Update `docs/getting-started/first-stream.md` with favorites tip
- [ ] Verify all internal links work

### 7.3 [P] Update Root Documentation
- [ ] Update `README.md` feature list (add "⭐ Channel Favorites")
- [ ] Update CHANGELOG.md with new feature entry
  ```markdown
  ### Added
  - Channel Favorites: Favorite and hide channels with intelligent state management
  ```

### 7.4 [P] Update Spec Status
- [ ] Update `.specify/features/012-channel-favorites.md` status to "Implemented"
- [ ] Update `.specify/README.md` feature status table

### 7.5 Final Code Review
- [ ] Run full test suite: `npm test`
- [ ] Run linter: `npm run lint`
- [ ] Run type check: `tsc --noEmit`
- [ ] Build project: `npm run build`
- [ ] Review all changed files for:
  - No console.logs or debug code
  - Proper error handling
  - TypeScript strict mode compliance
  - No disabled linting rules
  - Consistent code style
  - Complete JSDoc comments

### 7.6 Pre-Merge Checklist
- [ ] All acceptance criteria from SPEC-012 met
- [ ] All tests passing (unit + integration)
- [ ] Documentation complete and accurate
- [ ] No TypeScript errors
- [ ] No linting errors
- [ ] Performance targets met
- [ ] Accessibility compliance (WCAG 2.2 AA)
- [ ] Mobile responsive
- [ ] No regressions in existing features

---

## Estimated Total Time: 24 hours

**Breakdown**:
- Phase 1 (Database): 2 hours
- Phase 2 (Business Logic): 4 hours
- Phase 3 (Server Actions): 3 hours
- Phase 4 (Display Components): 4 hours
- Phase 5 (Preference Icons): 5 hours
- Phase 6 (Integration & Testing): 4 hours
- Phase 7 (Documentation & Polish): 2 hours

**Parallel Opportunities**: Tasks marked [P] in Phase 7 can be done concurrently.

**Risk Buffer**: +20% (5 hours) for unexpected issues = 29 hours total

---

## Implementation Notes

1. **Test-Driven Development**: Write tests before implementation for business logic (Phase 2)
2. **Database First**: Complete Phase 1 before starting Phase 2 (hard dependency)
3. **Incremental UI**: Build display layer (Phase 4) before interaction layer (Phase 5)
4. **Continuous Testing**: Run tests after each phase completion
5. **Mobile Awareness**: Test on mobile throughout, not just at the end
6. **Accessibility First**: Add ARIA labels and keyboard support during component creation

## Success Criteria

✅ All 295+ existing tests still pass  
✅ New tests for preferences module pass (>80% coverage)  
✅ User can favorite/unfavorite channels  
✅ User can hide/unhide channels  
✅ Favoriting hidden channel auto-unhides  
✅ Hiding favorited channel auto-unfavorites  
✅ Sections collapse/expand with localStorage persistence  
✅ Page loads in <2s with 200 channels  
✅ Optimistic updates feel instant (<100ms)  
✅ Works on mobile (touch targets, responsive)  
✅ Keyboard accessible (Tab, Enter, Space)  
✅ Screen reader compatible  
✅ Documentation complete  
