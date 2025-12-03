# Feature Specification: Channel Favorites and Organization

**Feature Branch**: `012-channel-favorites`  
**Created**: 2025-12-02  
**Status**: Complete  
**Version**: 1.0  
**Completed**: 2025-12-02

## Overview

Users need a way to organize channels by marking favorites and hiding unwanted channels. The organized channel list should display favorites at the top, followed by regular channels, with hidden channels in a collapsed section at the bottom.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Mark Channel as Favorite (Priority: P1)

As a user, I want to mark channels as favorites so that I can quickly access the channels I watch most often.

**Why this priority**: Core value proposition - enables quick access to preferred content. This is the minimal viable feature.

**Independent Test**: User can click a heart icon on any channel card and see it appear in the "Favorites" section at the top of the channel list.

**Acceptance Scenarios**:

1. **Given** I am viewing the channel list, **When** I click the heart icon on a channel, **Then** the channel is marked as a favorite and moves to the "Favorites" section
2. **Given** a channel is already favorited, **When** I click the heart icon again, **Then** the channel is un-favorited and moves back to the regular channels section
3. **Given** I have favorited multiple channels, **When** I view the channel list, **Then** all favorited channels appear in the "Favorites" section at the top, sorted by guide number
4. **Given** I favorite a channel, **When** I refresh the page, **Then** my favorite status persists
5. **Given** I am a viewer user, **When** I favorite channels, **Then** my favorites are independent from other users' favorites

---

### User Story 2 - Hide Unwanted Channels (Priority: P2)

As a user, I want to hide channels I never watch so that I can focus on content that matters to me.

**Why this priority**: Improves user experience by reducing clutter, but not critical for core functionality. Users can simply scroll past unwanted channels.

**Independent Test**: User can click an X icon on any channel card and see it move to a "Hidden Channels" collapsed section at the bottom.

**Acceptance Scenarios**:

1. **Given** I am viewing the channel list, **When** I click the X icon on a channel, **Then** the channel is hidden and moves to the "Hidden Channels" section
2. **Given** a channel is hidden, **When** I expand the "Hidden Channels" section, **Then** I can see all my hidden channels
3. **Given** a channel is hidden, **When** I click the X icon again (in hidden section), **Then** the channel is un-hidden and returns to the regular channels section
4. **Given** I hide a channel, **When** I refresh the page, **Then** the channel remains hidden
5. **Given** a channel is favorited, **When** I click the hide icon, **Then** the channel is automatically un-favorited and moved to the "Hidden Channels" section

---

### User Story 3 - Organized Channel List Display (Priority: P1)

As a user, I want to see my channels organized into clear sections so that I can quickly find what I'm looking for.

**Why this priority**: Core UX improvement - makes the feature valuable. Without organization, favorites/hidden don't provide value.

**Independent Test**: User can view channel list with three distinct sections: Favorites (always visible), Channels (collapsible, open by default), Hidden Channels (collapsible, closed by default).

**Acceptance Scenarios**:

1. **Given** I have favorited channels, **When** I view the channel list, **Then** I see a "Favorites" section at the top with all my favorited channels
2. **Given** I have regular (non-favorite, non-hidden) channels, **When** I view the channel list, **Then** I see a "Channels" section below favorites, expanded by default
3. **Given** I have hidden channels, **When** I view the channel list, **Then** I see a "Hidden Channels" section at the bottom, collapsed by default
4. **Given** I am viewing the channel list, **When** I click on a section header (Channels or Hidden Channels), **Then** that section collapses or expands
5. **Given** I collapse/expand a section, **When** I refresh the page, **Then** the section remains in the state I left it (using localStorage)
6. **Given** I have no favorites, **When** I view the channel list, **Then** the "Favorites" section does not appear
7. **Given** I have no hidden channels, **When** I view the channel list, **Then** the "Hidden Channels" section does not appear

---

### User Story 4 - Visual Distinction (Priority: P3)

As a user, I want visual feedback when I favorite or hide channels so that I understand the system's response to my actions.

**Why this priority**: Polish and UX enhancement. The feature works without this, but it improves user confidence.

**Independent Test**: User can see different icon states (filled/empty heart, enabled/disabled X) and visual feedback on click.

**Acceptance Scenarios**:

1. **Given** a channel is not favorited, **When** I view it, **Then** I see an empty/outlined heart icon
2. **Given** a channel is favorited, **When** I view it, **Then** I see a filled/solid heart icon
3. **Given** I click the heart icon, **When** the action completes, **Then** I see a brief animation or color change indicating success
4. **Given** a channel is in the favorites section, **When** I view it, **Then** it has a subtle visual distinction (e.g., border or background tint)
5. **Given** I am a viewer user, **When** I view icon buttons, **Then** I have appropriate ARIA labels for accessibility
6. **Given** a channel is hidden, **When** I click the favorite icon, **Then** the channel is automatically un-hidden and moved to the "Favorites" section

---

### Edge Cases

- **Automatic state transitions**: What happens when a user tries to both favorite and hide the same channel?
  - System MUST prevent a channel from being both favorited and hidden
  - If favorited, clicking hide automatically un-favorites and hides the channel (user's latest action wins)
  - If hidden, clicking favorite automatically un-hides and favorites the channel (user's latest action wins)
  - No error messages needed - the system intelligently handles the transition

- **Tuner deletion**: What happens when a tuner is deleted and its channels are removed?
  - System MUST automatically clean up user preferences for deleted channels
  - Use database CASCADE or explicit cleanup in tuner deletion logic

- **Channel refresh**: What happens when a tuner's channels are refreshed and guide numbers change?
  - User preferences are keyed by channel ID, so they persist across guide number changes
  - If a channel is truly removed and re-added, it appears as a new channel (loses preferences)

- **Empty states**: How does the UI handle when all channels are hidden or all are favorited?
  - If all channels hidden: Show message "All channels hidden. Unhide some to watch TV!"
  - If all channels favorited: Only "Favorites" section shows, no empty "Channels" section
  - If no channels at all: Existing "No channels" message remains

- **Multiple tuners**: How do preferences work when the same channel appears on multiple tuners?
  - Each channel has a unique ID (per tuner), so preferences are per-tuner-channel
  - If user has two identical channels (same guide number, different tuners), they're independent

- **localStorage sync**: What happens when a user uses multiple browsers/devices?
  - Favorite/hidden status persists in database (per user)
  - Section collapsed/expanded state uses localStorage (browser-specific)
  - This is acceptable - section state is UI preference, not data

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow authenticated users to mark any channel as a favorite
- **FR-002**: System MUST allow authenticated users to hide any channel
- **FR-002a**: When hiding a favorited channel, system MUST automatically un-favorite it first (latest action wins)
- **FR-002b**: When favoriting a hidden channel, system MUST automatically un-hide it first (latest action wins)
- **FR-003**: System MUST prevent a channel from being both favorited and hidden simultaneously
- **FR-004**: System MUST persist favorite/hidden status in the database per user
- **FR-005**: System MUST display channels in three sections: Favorites (top), Channels (middle), Hidden Channels (bottom)
- **FR-006**: System MUST sort channels within each section by guide number (ascending)
- **FR-007**: System MUST make the "Channels" section collapsible, expanded by default
- **FR-008**: System MUST make the "Hidden Channels" section collapsible, collapsed by default
- **FR-009**: System MUST persist section collapsed/expanded state in localStorage
- **FR-010**: System MUST automatically clean up preferences when channels are deleted
- **FR-011**: System MUST provide heart icon for favoriting (empty when not favorite, filled when favorite)
- **FR-012**: System MUST provide X icon for hiding (always enabled - automatically handles un-favoriting if needed)
- **FR-013**: System MUST update UI optimistically (immediate feedback) with server-side persistence
- **FR-014**: System MUST provide ARIA labels and keyboard navigation for accessibility

### Non-Functional Requirements

- **NFR-001**: Performance - Favoriting/hiding must provide visual feedback within 100ms (optimistic UI)
- **NFR-002**: Performance - Server-side persistence must complete within 500ms
- **NFR-003**: Reliability - Failed preference updates must revert optimistic UI changes with error message
- **NFR-004**: Accessibility - All controls must be keyboard accessible (Tab, Enter/Space)
- **NFR-005**: Accessibility - All icons must have proper ARIA labels and role attributes
- **NFR-006**: Accessibility - Section headers must use semantic HTML (h2 or h3 with button for collapse)
- **NFR-007**: Security - User preferences must be scoped to authenticated user (no cross-user access)
- **NFR-008**: Mobile - Icon buttons must be at least 44x44px touch targets
- **NFR-009**: Mobile - Sections must collapse/expand smoothly on mobile devices

### Key Entities *(include if feature involves data)*

- **ChannelPreference**:
  - Represents a user's preference for a specific channel
  - Attributes: `user_id` (foreign key), `channel_id` (foreign key), `is_favorite` (boolean), `is_hidden` (boolean), `updated_at` (timestamp)
  - Constraints: Unique per (user_id, channel_id), CHECK (NOT (is_favorite AND is_hidden))
  - Relationships: Belongs to User (many-to-one), Belongs to Channel (many-to-one)
  - Lifecycle: Created on first favorite/hide action, updated on subsequent actions, deleted when channel is deleted

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can favorite a channel in under 3 seconds (including finding the button and clicking)
- **SC-002**: Favorite/hide actions provide visual feedback within 100ms
- **SC-003**: Page load shows organized channel list within 2 seconds
- **SC-004**: 90% of users successfully favorite at least one channel within first session
- **SC-005**: Zero data loss - all favorite/hidden preferences persist across page reloads
- **SC-006**: Accessibility score remains WCAG 2.2 Level AA (no regressions)

### User Validation

- [ ] Users can favorite channels and see them at the top
- [ ] Users can hide channels and find them in collapsed section
- [ ] Users can toggle favorite/hidden status without confusion
- [ ] Section collapse/expand behavior is intuitive
- [ ] Mobile users can tap icons without fat-finger errors
- [ ] Keyboard-only users can navigate and use all features
- [ ] Screen reader users understand the interface

## Dependencies

- **Depends On**:
  - Channel streaming (SPEC-002) - Channels must exist to organize
  - User authentication (SPEC-003) - Must know which user's preferences to save
  - Database schema - Must be able to add new table/columns

- **Blocks**:
  - None - This is an enhancement feature

- **Related To**:
  - UI/UX Guidelines (SPEC-004) - Must follow design system
  - Watch page - Primary location where this feature appears

## Out of Scope

Explicitly list what this feature does NOT include:

- ❌ Drag-and-drop reordering of channels within sections
- ❌ Custom section names or creating additional sections
- ❌ Sharing favorite lists between users
- ❌ Importing/exporting favorite lists
- ❌ Favorite categories or tags (e.g., "Sports", "News")
- ❌ Analytics on most-favorited channels across users
- ❌ Recommendations based on favorites
- ❌ Scheduling or reminders for favorite channels
- ❌ Favorite channel notifications when live

## Technical Constraints

- Must use existing design system components (Button, Card, Section)
- Must work with existing channel data structure (no schema changes to channels table)
- Must use React Server Components where possible, Client Components only for interactivity
- Must use Server Actions for mutations (no direct API routes)
- Must maintain current performance (<2s page load)
- Must work on Edge Runtime (localStorage is client-side only)
- Icon buttons must be <2KB SVG or use existing icon library

## Implementation Notes

This feature requires:

1. **Database Migration**:
   - New table `user_channel_preferences` or columns on join table
   - Indexes on (user_id, channel_id) for fast lookups
   - CHECK constraint to prevent favorite+hidden
   - CASCADE delete when channel or user is deleted

2. **Server Actions**:
   - `toggleFavorite(channelId)` - Server action to favorite/unfavorite
   - `toggleHidden(channelId)` - Server action to hide/unhide
   - Returns updated preference state and channel section

3. **UI Components**:
   - `ChannelOrganizer` - Main component that renders sections
   - `ChannelSection` - Collapsible section header and content
   - `ChannelCard` - Enhanced with favorite/hide icons (client component)
   - `FavoriteButton` - Heart icon with optimistic update
   - `HideButton` - X icon with optimistic update

4. **Data Fetching**:
   - Modify watch page to fetch channels with user preferences
   - Use Drizzle ORM LEFT JOIN to get preferences
   - Server Component fetches, Client Components handle interactions

5. **State Management**:
   - Optimistic updates using React useOptimistic or similar
   - localStorage for section collapse state (client-side only)
   - Server-side session for user preferences

## References

- Similar pattern: GitHub repository stars (heart icon, persisted per user)
- Accessibility: [WCAG 2.2 - Controls](https://www.w3.org/WAI/WCAG22/Understanding/)
- React useOptimistic: https://react.dev/reference/react/useOptimistic
- Drizzle ORM Joins: https://orm.drizzle.team/docs/joins

---

## Clarifications Applied

### v1.1 - 2025-12-02

**Q**: What happens when a user tries to favorite a hidden channel or hide a favorited channel?

**A**: The system should intelligently handle state transitions - the user's most recent action always wins:
- Hiding a favorited channel → automatically un-favorites and hides
- Favoriting a hidden channel → automatically un-hides and favorites
- No error messages or "remove first" warnings needed

**Updated Requirements**:
- Added **FR-002a**: Automatic un-favorite when hiding a favorited channel
- Added **FR-002b**: Automatic un-hide when favoriting a hidden channel
- Updated **FR-012**: Hide icon always enabled (not disabled for favorites)
- Updated edge case documentation to reflect automatic transitions
- Added acceptance scenario in User Story 2 and User Story 4

**Rationale**: Simpler UX - user doesn't need to think about current state, just clicks the action they want. System handles the transition intelligently.

---

**Version**: 1.1 | **Created**: 2025-12-02 | **Last Updated**: 2025-12-02 | **Status**: Clarified - Ready for Planning
