# Quickstart: Channel Favorites Testing Guide

**Feature**: 012-channel-favorites  
**Date**: 2025-12-02

This guide provides step-by-step validation scenarios for testing the channel favorites and organization feature.

## Prerequisites

Before testing, ensure:
- ✅ HD Homey is running (development or production)
- ✅ At least one tuner is configured
- ✅ Channels have been scanned (at least 10 channels recommended)
- ✅ You have a user account (viewer or admin role)
- ✅ Migration `0002_channel_preferences.sql` has been applied

## Setup Instructions

### 1. Start HD Homey

**Development**:
```bash
npm run dev
```

**Production (Docker)**:
```bash
docker compose up -d
```

### 2. Sign In

Navigate to `http://localhost:3000/users/signin` and sign in with your credentials.

### 3. Navigate to Watch Page

Click "Watch" in the navigation or go to `http://localhost:3000/`

You should see a list of all channels from your configured tuners.

---

## Test Scenario 1: Favorite a Channel (Happy Path)

**Goal**: Verify users can mark channels as favorites

**Steps**:
1. Locate a channel in the channel list
2. Click the heart icon (should be empty/outlined)
3. Observe the channel moves to a "Favorites" section at the top
4. Observe the heart icon is now filled/solid
5. Refresh the page (F5)
6. Verify the channel remains in the Favorites section

**Expected Results**:
- ✅ Heart icon toggles from empty to filled instantly (<100ms)
- ✅ Channel moves to Favorites section at top of page
- ✅ Favorites section header appears (if first favorite)
- ✅ Channel sorted by guide number within Favorites section
- ✅ Preference persists after page refresh

**Database Verification**:
```sql
SELECT * FROM user_channel_preferences 
WHERE user_id = 'your-user-id' 
AND channel_id = <channel-id>;
-- Should show: is_favorite = 1, is_hidden = 0
```

---

## Test Scenario 2: Unfavorite a Channel

**Goal**: Verify users can remove channels from favorites

**Prerequisites**: Complete Test Scenario 1 first

**Steps**:
1. Locate the favorited channel in the Favorites section
2. Click the filled heart icon
3. Observe the channel moves back to the regular "Channels" section
4. Observe the heart icon is now empty/outlined
5. Refresh the page
6. Verify the channel remains in the Channels section (not Favorites)

**Expected Results**:
- ✅ Heart icon toggles from filled to empty instantly
- ✅ Channel moves to Channels section (middle of page)
- ✅ If last favorite removed, Favorites section disappears
- ✅ Channel maintains its guide number position
- ✅ Preference update persists after refresh

**Database Verification**:
```sql
SELECT * FROM user_channel_preferences 
WHERE user_id = 'your-user-id' 
AND channel_id = <channel-id>;
-- Should show: is_favorite = 0, is_hidden = 0
-- OR: No record (both flags false)
```

---

## Test Scenario 3: Hide a Channel

**Goal**: Verify users can hide unwanted channels

**Steps**:
1. Locate a regular (non-favorite) channel
2. Click the X icon
3. Observe the channel disappears from the regular list
4. Scroll to bottom of page
5. Observe a "Hidden Channels" section appears (collapsed by default)
6. Click the "Hidden Channels" section header to expand
7. Verify the hidden channel appears in this section
8. Refresh the page
9. Verify the channel remains hidden

**Expected Results**:
- ✅ Channel disappears from Channels section instantly
- ✅ "Hidden Channels" section appears at bottom (collapsed)
- ✅ Section expands when clicked
- ✅ Hidden channel appears with X icon
- ✅ Section remains expanded after interaction (localStorage)
- ✅ Hidden state persists after refresh

**Database Verification**:
```sql
SELECT * FROM user_channel_preferences 
WHERE user_id = 'your-user-id' 
AND channel_id = <channel-id>;
-- Should show: is_favorite = 0, is_hidden = 1
```

---

## Test Scenario 4: Unhide a Channel

**Goal**: Verify users can unhide channels

**Prerequisites**: Complete Test Scenario 3 first

**Steps**:
1. Expand the "Hidden Channels" section (if collapsed)
2. Locate the hidden channel
3. Click the X icon again
4. Observe the channel disappears from Hidden Channels
5. Scroll up to the Channels section
6. Verify the channel appears in the regular channels list
7. Refresh the page
8. Verify the channel remains visible (not hidden)

**Expected Results**:
- ✅ Channel removed from Hidden Channels section
- ✅ If last hidden channel, Hidden Channels section disappears
- ✅ Channel appears in Channels section
- ✅ Channel in correct position (sorted by guide number)
- ✅ Preference update persists after refresh

---

## Test Scenario 5: Intelligent State Transition (Favorite → Hide)

**Goal**: Verify hiding a favorited channel auto-unfavorites it

**Steps**:
1. Favorite a channel (heart icon, channel in Favorites section)
2. While channel is in Favorites section, click the X icon
3. Observe the channel disappears from Favorites
4. Expand Hidden Channels section
5. Verify the channel appears in Hidden Channels
6. Observe the heart icon is now empty (not filled)

**Expected Results**:
- ✅ Clicking X on favorited channel doesn't show error
- ✅ Channel automatically unfavorited AND hidden (one click)
- ✅ Heart icon changes to empty
- ✅ Channel moves directly to Hidden Channels
- ✅ No intermediate state visible to user

**Database Verification**:
```sql
SELECT * FROM user_channel_preferences 
WHERE user_id = 'your-user-id' 
AND channel_id = <channel-id>;
-- Should show: is_favorite = 0, is_hidden = 1
```

---

## Test Scenario 6: Intelligent State Transition (Hide → Favorite)

**Goal**: Verify favoriting a hidden channel auto-unhides it

**Prerequisites**: Channel must be hidden first

**Steps**:
1. Expand Hidden Channels section
2. Locate a hidden channel
3. Click the heart icon (should be empty)
4. Observe the channel disappears from Hidden Channels
5. Scroll up to Favorites section
6. Verify the channel appears in Favorites section
7. Observe the heart icon is now filled

**Expected Results**:
- ✅ Clicking heart on hidden channel doesn't show error
- ✅ Channel automatically unhidden AND favorited (one click)
- ✅ Heart icon changes to filled
- ✅ Channel moves directly to Favorites
- ✅ No intermediate state visible to user

**Database Verification**:
```sql
SELECT * FROM user_channel_preferences 
WHERE user_id = 'your-user-id' 
AND channel_id = <channel-id>;
-- Should show: is_favorite = 1, is_hidden = 0
```

---

## Test Scenario 7: Section Collapse/Expand Persistence

**Goal**: Verify section states persist in localStorage

**Steps**:
1. Ensure you have at least one hidden channel (collapsed by default)
2. Expand the "Hidden Channels" section by clicking header
3. Collapse the "Channels" section by clicking its header
4. Note which sections are expanded/collapsed
5. Refresh the page (F5)
6. Verify sections are in the same state as before refresh

**Expected Results**:
- ✅ Expanded sections remain expanded after refresh
- ✅ Collapsed sections remain collapsed after refresh
- ✅ localStorage contains keys like `channel-section-*-expanded`
- ✅ Clicking section header toggles expand/collapse
- ✅ Smooth animation when expanding/collapsing

**localStorage Verification** (browser DevTools → Application → Local Storage):
```
channel-section-channels-expanded: "false"
channel-section-hidden-expanded: "true"
```

---

## Test Scenario 8: Empty States

### 8a: No Favorites

**Goal**: Verify Favorites section doesn't show when empty

**Steps**:
1. Ensure you have zero favorited channels
2. View the watch page
3. Verify no "Favorites" section header appears

**Expected**: Only "Channels" and optionally "Hidden Channels" sections visible

### 8b: No Hidden Channels

**Goal**: Verify Hidden Channels section doesn't show when empty

**Steps**:
1. Ensure you have zero hidden channels
2. View the watch page
3. Verify no "Hidden Channels" section appears

**Expected**: Only "Channels" and optionally "Favorites" sections visible

### 8c: All Channels Hidden

**Goal**: Verify appropriate message when all channels hidden

**Steps**:
1. Hide every single channel
2. Verify "Channels" section is empty or shows message
3. Verify "Hidden Channels" section contains all channels

**Expected**: Empty state message like "All channels hidden. Unhide some to watch TV!"

### 8d: All Channels Favorited

**Goal**: Verify only Favorites section shows

**Steps**:
1. Favorite every single channel
2. Verify only "Favorites" section appears
3. Verify no empty "Channels" section

**Expected**: Only "Favorites" section visible with all channels

---

## Test Scenario 9: Multi-User Independence

**Goal**: Verify preferences are per-user

**Prerequisites**: Two user accounts (User A and User B)

**Steps**:
1. Sign in as User A
2. Favorite channels 1, 2, 3
3. Hide channels 4, 5, 6
4. Sign out
5. Sign in as User B
6. Verify channels 1, 2, 3 are NOT favorited
7. Verify channels 4, 5, 6 are NOT hidden
8. Favorite channels 7, 8, 9
9. Sign out
10. Sign in as User A
11. Verify channels 7, 8, 9 are NOT favorited (User B's preferences)
12. Verify channels 1, 2, 3 are still favorited (User A's preferences)

**Expected Results**:
- ✅ Each user has independent preferences
- ✅ User A's favorites don't appear for User B
- ✅ User B's hidden channels don't affect User A
- ✅ Preferences isolated by user_id in database

---

## Test Scenario 10: Channel Deletion Cascade

**Goal**: Verify preferences are cleaned up when channel deleted

**Prerequisites**: Admin access to delete channels (or direct database access)

**Steps**:
1. Favorite a specific channel (note its ID)
2. Verify preference exists in database
3. Delete the channel's tuner (which soft-deletes channels)
4. Verify the preference record still exists but channel is inactive
5. (Alternative) Directly DELETE channel from database
6. Verify preference record is CASCADE deleted

**Expected Results**:
- ✅ Soft delete (tuner deletion): Preferences remain, channel filtered out
- ✅ Hard delete (direct SQL): Preferences CASCADE deleted
- ✅ No orphaned preferences for non-existent channels

**Database Verification**:
```sql
-- After tuner deletion (soft delete)
SELECT * FROM channels WHERE id = <channel-id>;
-- Should show: deleted_at IS NOT NULL

-- After hard delete
SELECT * FROM user_channel_preferences WHERE channel_id = <channel-id>;
-- Should return no rows (CASCADE DELETE)
```

---

## Test Scenario 11: Mobile Touch Targets

**Goal**: Verify icons are tappable on mobile devices

**Prerequisites**: Mobile device or browser DevTools in mobile mode

**Steps**:
1. Open HD Homey in mobile browser (or DevTools mobile view)
2. Navigate to watch page
3. Attempt to tap heart icon on a channel
4. Attempt to tap X icon on a channel
5. Verify taps register without requiring precision

**Expected Results**:
- ✅ Icons have minimum 44x44px touch targets
- ✅ Taps register reliably without misclicks
- ✅ Visual feedback on tap (button press state)
- ✅ No accidental double-taps
- ✅ Icons are visually distinct from channel info

---

## Test Scenario 12: Keyboard Navigation

**Goal**: Verify feature is fully keyboard accessible

**Prerequisites**: None (use keyboard only)

**Steps**:
1. Navigate to watch page
2. Press Tab key repeatedly
3. Verify focus moves through all channel cards and icon buttons
4. When focused on heart icon, press Space or Enter
5. Verify channel is favorited
6. Tab to X icon, press Space or Enter
7. Verify channel is hidden
8. Verify section headers are keyboard accessible
9. Press Space/Enter on section header
10. Verify section collapses/expands

**Expected Results**:
- ✅ All icon buttons are keyboard focusable
- ✅ Visible focus indicator (outline or highlight)
- ✅ Space and Enter keys both trigger actions
- ✅ Tab order is logical (top to bottom, left to right)
- ✅ Screen reader announces button states

---

## Test Scenario 13: Screen Reader Accessibility

**Goal**: Verify feature works with screen readers

**Prerequisites**: Screen reader enabled (NVDA, JAWS, or VoiceOver)

**Steps**:
1. Enable screen reader
2. Navigate to watch page
3. Tab to a channel's heart icon
4. Verify screen reader announces "Add to favorites" or similar
5. Activate button (Space/Enter)
6. Verify screen reader announces "Added to favorites" or state change
7. Tab to X icon
8. Verify screen reader announces "Hide channel" or similar
9. Verify ARIA attributes are correct

**Expected Results**:
- ✅ Buttons have proper `aria-label` attributes
- ✅ Toggle state announced via `aria-pressed` attribute
- ✅ State changes are announced to screen reader
- ✅ Section headers have proper heading structure (h2/h3)
- ✅ No unlabeled interactive elements

**Code Verification**:
```html
<button
  aria-label="Add to favorites"
  aria-pressed="false"
  ...
>
  <HeartIcon />
</button>
```

---

## Test Scenario 14: Optimistic UI and Error Handling

**Goal**: Verify instant feedback and graceful error recovery

### 14a: Successful Optimistic Update

**Steps**:
1. Click heart icon to favorite a channel
2. Observe instant UI update (heart fills immediately)
3. Network request completes in background
4. Verify no UI flicker or revert

**Expected**: Heart icon updates instantly, no delay

### 14b: Network Error

**Prerequisites**: Throttle network or disconnect

**Steps**:
1. Throttle network to Slow 3G (DevTools → Network tab)
2. Click heart icon
3. Observe instant optimistic update
4. Wait for network request to fail
5. Observe UI reverts to previous state
6. Verify error message is shown

**Expected**: 
- ✅ Optimistic update shows immediately
- ✅ On error, UI automatically reverts
- ✅ User-friendly error message displayed
- ✅ User can retry action

### 14c: Server Error (500)

**Prerequisites**: Simulate server error (modify action to return error)

**Steps**:
1. Click heart icon
2. Server returns error response
3. Verify optimistic update reverts
4. Verify error message shown

**Expected**: Graceful handling, no broken UI state

---

## Performance Validation

### Page Load Performance

**Goal**: Verify page loads within 2 seconds

**Steps**:
1. Open browser DevTools → Network tab
2. Hard refresh page (Ctrl+Shift+R)
3. Measure time to "Load" event
4. Verify all content visible and interactive

**Expected**:
- ✅ Initial page load: <2s (with 200 channels)
- ✅ Time to Interactive (TTI): <2.5s
- ✅ No layout shift when sections render
- ✅ No waterfall of requests

### Mutation Performance

**Goal**: Verify favorite/hide actions are fast

**Steps**:
1. Open DevTools → Performance tab
2. Start recording
3. Click heart icon
4. Stop recording
5. Measure time from click to visual update

**Expected**:
- ✅ Visual update: <100ms (optimistic)
- ✅ Server round-trip: <500ms
- ✅ No jank or frame drops
- ✅ 60fps maintained during animations

---

## Regression Testing

These scenarios ensure existing functionality still works:

### Reg-1: Channel Streaming

**Steps**:
1. Favorite a channel
2. Click channel to view details
3. Click "Watch" or stream URL
4. Verify video plays correctly

**Expected**: Streaming functionality unaffected by preferences

### Reg-2: Channel Refresh

**Steps**:
1. Favorite several channels
2. Admin: Refresh tuner channel lineup
3. Verify favorited channels remain favorited
4. Verify new channels appear as regular (not favorited)

**Expected**: Preferences persist across channel refreshes

### Reg-3: User Management

**Steps**:
1. Admin: Create new user
2. Sign in as new user
3. Verify no preferences exist (clean slate)
4. Admin: Delete user
5. Verify their preferences are CASCADE deleted

**Expected**: User lifecycle doesn't break preferences

---

## Rollback Testing

### Rollback Scenario

**Goal**: Verify safe rollback if feature needs to be reverted

**Steps**:
1. Create preferences (favorite and hide channels)
2. Revert code changes to watch page (remove ChannelOrganizer)
3. Verify watch page still loads (shows old channel list)
4. Verify no errors in console
5. Verify database preferences remain (not lost)

**Expected**:
- ✅ Old channel list displays correctly
- ✅ No JavaScript errors
- ✅ Preferences preserved in database
- ✅ Can re-deploy feature later without data loss

---

## Test Data Setup (SQL)

For manual testing, create test data:

```sql
-- Favorite channels 1, 2, 3 for user
INSERT INTO user_channel_preferences (user_id, channel_id, is_favorite, is_hidden, updated_at)
VALUES 
  ('your-user-id', 1, 1, 0, datetime('now')),
  ('your-user-id', 2, 1, 0, datetime('now')),
  ('your-user-id', 3, 1, 0, datetime('now'));

-- Hide channels 4, 5, 6 for user
INSERT INTO user_channel_preferences (user_id, channel_id, is_favorite, is_hidden, updated_at)
VALUES 
  ('your-user-id', 4, 0, 1, datetime('now')),
  ('your-user-id', 5, 0, 1, datetime('now')),
  ('your-user-id', 6, 0, 1, datetime('now'));

-- Verify
SELECT c.guideName, p.is_favorite, p.is_hidden 
FROM channels c
LEFT JOIN user_channel_preferences p ON c.id = p.channel_id AND p.user_id = 'your-user-id'
WHERE c.deleted_at IS NULL
ORDER BY c.guideNumber;
```

---

## Checklist for Release

Before merging to main, verify:

- [ ] All test scenarios pass
- [ ] No console errors in browser
- [ ] No 404s or failed network requests
- [ ] Database migration applied successfully
- [ ] Performance targets met (<2s page load, <100ms feedback)
- [ ] Accessibility: WCAG 2.2 Level AA compliance verified
- [ ] Mobile: Touch targets 44x44px, responsive design works
- [ ] Documentation updated (docs/features/channel-favorites.md)
- [ ] CHANGELOG.md updated
- [ ] All 295+ tests passing (`npm test`)
- [ ] ESLint passing (`npm run lint`)
- [ ] TypeScript compiling (`npm run build`)

---

**Status**: Quickstart guide complete and ready for testing  
**Next Step**: Phase 5 - Tasking (`/speckit.tasks`)
