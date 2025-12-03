# Channel Favorites

Organize your channels by marking favorites and hiding unwanted channels for a personalized viewing experience.

## Overview

HD Homey allows each user to customize their channel lineup by favoriting frequently watched channels and hiding channels they don't want to see. Preferences are stored per-user, so each viewer can organize channels their own way.

## Features

- ⭐ **Favorite Channels** - Mark your most-watched channels for quick access
- ✕ **Hide Channels** - Remove unwanted channels from your view
- 📂 **Auto-Organization** - Channels automatically grouped into Favorites/Channels/Hidden sections
- 🚀 **Instant Updates** - Optimistic UI provides immediate feedback
- 🔄 **Smart Transitions** - Favoriting auto-unhides, hiding auto-unfavorites
- 🎯 **Per-User** - Each user's preferences are independent

## Using Favorites

### Marking Favorites

On any tuner's channel page, you'll see a star button (☆) next to each channel:

1. **Navigate** to a tuner's channels page
2. **Click the star button** (☆) next to a channel
3. Channel is instantly marked as favorite (★)
4. Channel moves to the **Favorites** section

### Removing Favorites

To remove a channel from favorites:

1. **Click the filled star** (★) next to the channel
2. Channel returns to the **Channels** section

::: tip Quick Toggle
You can toggle favorites on and off with a single click. The UI updates instantly without page reloads.
:::

## Hiding Channels

### Hide a Channel

Don't want to see certain channels? Hide them:

1. **Navigate** to a tuner's channels page
2. **Click the ✕ button** next to a channel
3. Channel is moved to the **Hidden** section

Hidden channels are collapsed by default but remain accessible if you need them.

### Unhide a Channel

To bring a hidden channel back:

1. **Expand the Hidden section** (if collapsed)
2. **Click the ✕ button** on the hidden channel
3. Channel returns to the **Channels** section

## Channel Organization

Channels are automatically organized into three sections:

### Favorites Section

- Contains all channels you've marked as favorites
- Always shown first for quick access
- Sorted numerically by guide number (2.1, 2.2, 5.1, 10.1, etc.)

### Channels Section

- Contains regular channels (not favorited or hidden)
- Main viewing area for discovering content
- Sorted numerically by guide number

### Hidden Section

- Contains channels you've hidden
- Collapsed by default to save space
- Easily expand to review or unhide channels
- Sorted numerically by guide number

::: info Sorting
All channels are sorted numerically by guide number within each section, ensuring channels appear in logical order (1, 2, 10, 100) rather than alphabetical order (1, 10, 100, 2).
:::

## Smart State Management

HD Homey prevents conflicting states with intelligent transitions:

### Favoriting a Hidden Channel

When you favorite a channel that's currently hidden:
- Channel is automatically unhidden
- Channel moves to Favorites section
- No need to manually unhide first

### Hiding a Favorited Channel

When you hide a channel that's currently favorited:
- Channel is automatically unfavorited
- Channel moves to Hidden section
- Latest action always wins

::: tip User-Friendly Design
You never see confusing "remove from favorites first" error messages. The system intelligently handles state transitions for you.
:::

## Sections and Collapsing

Each section can be collapsed independently:

1. **Click the arrow** (▼/▶) next to a section title
2. Section collapses to save space
3. Click again to expand

**Use Cases**:
- Collapse Hidden to focus on active channels
- Collapse Channels to see just your Favorites
- Collapse Favorites when browsing for new content

::: info Section Counts
Each section header shows the channel count: "Favorites (5)" so you always know how many channels are in each category.
:::

## Accessibility

Channel Favorites is fully accessible:

- ✅ **Keyboard Navigation** - Tab through channels and buttons
- ✅ **Screen Readers** - Proper ARIA labels on all controls
- ✅ **Visual Indicators** - Clear button states and hover effects
- ✅ **Focus Management** - Visible focus indicators
- ✅ **WCAG 2.2 AA** compliant

## Tips and Best Practices

### Organizing Your Lineup

**Strategy 1: Favorites for Daily Viewing**
- Mark your 5-10 most-watched channels as favorites
- Keep Channels section for discovery
- Hide shopping/foreign language channels

**Strategy 2: Category-Based**
- Favorite all news channels
- Keep entertainment in Channels
- Hide religious/shopping channels

**Strategy 3: HD Priority**
- Favorite all HD channels
- Keep SD channels in regular section
- Hide duplicate SD versions

### Managing Hidden Channels

- Periodically review hidden channels
- Unhide channels for special events
- Consider hiding instead of ignoring

### Performance Tips

- Actions are instant with optimistic UI
- No page reloads required
- Preferences sync automatically

## Technical Details

### Storage

- Preferences stored per-user in database
- No performance impact on channel loading
- Efficient JOIN queries for fetching data

### Database Schema

```sql
user_channel_preferences
├── user_id (Foreign Key → user.id)
├── channel_id (Foreign Key → channels.id)
├── is_favorite (Boolean)
├── is_hidden (Boolean)
└── updated_at (Timestamp)
```

### Constraints

- CHECK constraint prevents favorite AND hidden
- CASCADE delete when user/channel deleted
- UNIQUE index on (user_id, channel_id)

## Troubleshooting

### Favorites Not Saving

**Check**:
- You're logged in (favorites require authentication)
- You have viewer or admin role
- Your session hasn't expired

**Fix**: Refresh the page and try again.

### Channel Disappeared After Hiding

This is expected behavior! Check the **Hidden** section:
1. Scroll to the Hidden section
2. Expand it if collapsed (click ▶)
3. Your hidden channel is there

### Changes Not Persisting

**Cause**: Browser caching or session issue

**Fix**:
1. Refresh the page (Ctrl+R / Cmd+R)
2. Log out and back in
3. Clear browser cache

### Button Not Responding

**Check**:
- Button not disabled (grayed out)
- No pending actions in progress
- JavaScript enabled in browser

**Fix**: Wait a moment and try again. If issues persist, refresh the page.

## Frequently Asked Questions

### Do favorites affect what other users see?

No! Each user's favorites and hidden channels are completely independent. Your preferences don't affect anyone else.

### Can admins see my favorites?

No. Preferences are private per-user. Admins cannot see other users' favorite or hidden channels.

### What happens if a channel is deleted?

When a channel is permanently deleted from a tuner, your preference for that channel is automatically removed from the database.

### What happens if I'm deleted as a user?

All your channel preferences are automatically deleted along with your user account.

### Can I export my favorites?

Not currently. Favorites are stored in the database and designed for quick access within the application.

### Do favorites work across multiple tuners?

Yes! If the same channel number appears on multiple tuners, you can favorite each instance independently.

## Related Features

- [Channel Management](./channel-management.md) - View and access all channels
- [Tuner Management](./tuner-management.md) - Configure HDHomeRun devices
- [User Management](./user-management.md) - Manage user accounts and permissions

## API Reference

For developers integrating with HD Homey:

### Toggle Favorite

```typescript
POST /api/preferences/favorite
{
  "channelId": 123
}
```

### Toggle Hidden

```typescript
POST /api/preferences/hidden
{
  "channelId": 123
}
```

::: warning Authentication Required
All preference endpoints require an authenticated session with valid user ID.
:::
