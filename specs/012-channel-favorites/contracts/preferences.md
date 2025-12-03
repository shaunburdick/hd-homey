# API Contracts: Channel Preferences

**Feature**: 012-channel-favorites  
**Date**: 2025-12-02

This file defines the TypeScript interfaces and contracts for the channel preferences feature.

## Server Actions

### toggleFavoriteAction

Toggles the favorite status for a channel. If the channel is currently hidden, it will be automatically unhidden and favorited.

**Signature**:
```typescript
export async function toggleFavoriteAction(
  channelId: number
): Promise<PreferenceActionResult>;
```

**Parameters**:
- `channelId` (number): The ID of the channel to toggle favorite status

**Returns**: `PreferenceActionResult`

**Authorization**: Requires authenticated session

**Side Effects**:
- Creates preference record if none exists
- Updates existing preference record
- If channel was hidden, automatically unhides it
- Calls `revalidatePath('/')` to refresh watch page
- Logs action to application log

**Example Usage**:
```typescript
'use client';

async function handleFavoriteClick(channelId: number) {
  const result = await toggleFavoriteAction(channelId);
  if (!result.success) {
    showError(result.error);
  }
}
```

---

### toggleHiddenAction

Toggles the hidden status for a channel. If the channel is currently favorited, it will be automatically unfavorited and hidden.

**Signature**:
```typescript
export async function toggleHiddenAction(
  channelId: number
): Promise<PreferenceActionResult>;
```

**Parameters**:
- `channelId` (number): The ID of the channel to toggle hidden status

**Returns**: `PreferenceActionResult`

**Authorization**: Requires authenticated session

**Side Effects**:
- Creates preference record if none exists
- Updates existing preference record
- If channel was favorited, automatically unfavorites it
- Calls `revalidatePath('/')` to refresh watch page
- Logs action to application log

**Example Usage**:
```typescript
'use client';

async function handleHideClick(channelId: number) {
  const result = await toggleHiddenAction(channelId);
  if (!result.success) {
    showError(result.error);
  }
}
```

---

## Type Definitions

### PreferenceActionResult

Response type for preference mutation actions.

```typescript
interface PreferenceActionResult {
  /**
   * Whether the action succeeded
   */
  success: boolean;

  /**
   * The updated preference state (null if action failed)
   */
  preference: UserChannelPreference | null;

  /**
   * Error message if action failed (undefined if succeeded)
   */
  error?: string;
}
```

**Success Response**:
```typescript
{
  success: true,
  preference: {
    id: 1,
    userId: "user-uuid",
    channelId: 42,
    isFavorite: true,
    isHidden: false,
    updatedAt: "2025-12-02T10:30:00.000Z"
  }
}
```

**Error Response**:
```typescript
{
  success: false,
  preference: null,
  error: "Channel not found"
}
```

---

### UserChannelPreference

Database entity representing a user's preference for a channel.

```typescript
interface UserChannelPreference {
  /**
   * Unique identifier for this preference record
   */
  id: number;

  /**
   * User ID (foreign key to user table)
   */
  userId: string;

  /**
   * Channel ID (foreign key to channels table)
   */
  channelId: number;

  /**
   * Whether the channel is marked as a favorite
   * Cannot be true if isHidden is true
   */
  isFavorite: boolean;

  /**
   * Whether the channel is hidden
   * Cannot be true if isFavorite is true
   */
  isHidden: boolean;

  /**
   * ISO 8601 timestamp of last update
   */
  updatedAt: string;
}
```

**Invariant**: `!(isFavorite && isHidden)` - Both cannot be true simultaneously

---

### ChannelWithPreference

Combined type for channels with their user-specific preference state.

```typescript
interface ChannelWithPreference {
  /**
   * The channel entity
   */
  channel: Channel;

  /**
   * The user's preference for this channel
   * Null if user has not favorited or hidden this channel
   */
  preference: UserChannelPreference | null;
}
```

**Usage**:
```typescript
// Fetch channels with preferences
const channelsWithPrefs: ChannelWithPreference[] = await getChannelsWithPreferences(userId);

// Group by preference state
const favorites = channelsWithPrefs.filter(c => c.preference?.isFavorite);
const hidden = channelsWithPrefs.filter(c => c.preference?.isHidden);
const regular = channelsWithPrefs.filter(c => !c.preference?.isFavorite && !c.preference?.isHidden);
```

---

### PreferenceUpdate

Input type for updating preferences (internal use by business logic layer).

```typescript
interface PreferenceUpdate {
  /**
   * New favorite status (undefined = no change)
   */
  isFavorite?: boolean;

  /**
   * New hidden status (undefined = no change)
   */
  isHidden?: boolean;
}
```

**Validation**: Must not result in both `isFavorite` and `isHidden` being true.

---

## Component Props

### ChannelOrganizerProps

Props for the main channel organizer server component.

```typescript
interface ChannelOrganizerProps {
  /**
   * User ID to fetch preferences for
   * Obtained from session on server
   */
  userId: string;
}
```

---

### ChannelSectionProps

Props for a collapsible channel section.

```typescript
interface ChannelSectionProps {
  /**
   * Section title (e.g., "Favorites", "Channels", "Hidden Channels")
   */
  title: string;

  /**
   * Channels to display in this section
   */
  channels: ChannelWithPreference[];

  /**
   * Whether section should be expanded by default
   */
  defaultExpanded: boolean;

  /**
   * localStorage key for persisting collapsed state
   * Should be unique per section (e.g., "channel-section-favorites")
   */
  storageKey: string;

  /**
   * Optional CSS class name
   */
  className?: string;
}
```

---

### ChannelCardWithPrefsProps

Props for a channel card with preference icons.

```typescript
interface ChannelCardWithPrefsProps {
  /**
   * Channel with its preference state
   */
  channelWithPref: ChannelWithPreference;

  /**
   * Optional CSS class name
   */
  className?: string;
}
```

---

### FavoriteButtonProps

Props for the favorite icon button.

```typescript
interface FavoriteButtonProps {
  /**
   * Channel ID
   */
  channelId: number;

  /**
   * Current favorite status
   */
  isFavorite: boolean;

  /**
   * Optional callback after successful toggle
   */
  onToggle?: (newState: boolean) => void;

  /**
   * Optional CSS class name
   */
  className?: string;
}
```

---

### HideButtonProps

Props for the hide icon button.

```typescript
interface HideButtonProps {
  /**
   * Channel ID
   */
  channelId: number;

  /**
   * Current hidden status
   */
  isHidden: boolean;

  /**
   * Optional callback after successful toggle
   */
  onToggle?: (newState: boolean) => void;

  /**
   * Optional CSS class name
   */
  className?: string;
}
```

---

## Error Codes

Standardized error messages for preference actions:

```typescript
const PreferenceErrors = {
  UNAUTHORIZED: 'You must be signed in to manage preferences',
  CHANNEL_NOT_FOUND: 'Channel not found',
  USER_NOT_FOUND: 'User not found',
  INVALID_STATE: 'Invalid preference state: channel cannot be both favorited and hidden',
  DATABASE_ERROR: 'Failed to update preference',
  UNKNOWN_ERROR: 'An unexpected error occurred',
} as const;
```

---

## State Transition Rules

### Rule 1: Toggling Favorite

```typescript
// Current State: Not favorited, not hidden
toggleFavorite() → isFavorite: true, isHidden: false

// Current State: Favorited, not hidden
toggleFavorite() → isFavorite: false, isHidden: false

// Current State: Not favorited, hidden
toggleFavorite() → isFavorite: true, isHidden: false (AUTO-UNHIDE)

// Current State: No preference record
toggleFavorite() → Create record with isFavorite: true, isHidden: false
```

### Rule 2: Toggling Hidden

```typescript
// Current State: Not favorited, not hidden
toggleHidden() → isFavorite: false, isHidden: true

// Current State: Not favorited, hidden
toggleHidden() → isFavorite: false, isHidden: false

// Current State: Favorited, not hidden
toggleHidden() → isFavorite: false, isHidden: true (AUTO-UNFAVORITE)

// Current State: No preference record
toggleHidden() → Create record with isFavorite: false, isHidden: true
```

---

## Business Logic Layer (Internal)

These functions are used internally by Server Actions and are not exposed to components.

### getUserChannelPreferences

```typescript
async function getUserChannelPreferences(
  userId: string
): Promise<UserChannelPreference[]>;
```

Gets all preference records for a user.

---

### getPreference

```typescript
async function getPreference(
  userId: string,
  channelId: number
): Promise<UserChannelPreference | null>;
```

Gets a specific preference record (or null if none exists).

---

### setPreference

```typescript
async function setPreference(
  userId: string,
  channelId: number,
  update: PreferenceUpdate
): Promise<UserChannelPreference>;
```

Creates or updates a preference record. Validates state transitions.

---

### validatePreference

```typescript
function validatePreference(
  isFavorite: boolean,
  isHidden: boolean
): void;
```

Throws error if both flags are true. Called before database updates.

---

## Data Fetching Patterns

### Pattern 1: Server Component with Suspense

```typescript
// page.tsx (Server Component)
import { auth } from '@/lib/auth/auth';
import { ChannelOrganizer } from '@/components/channel-organizer';
import { Suspense } from 'react';

export default async function WatchPage() {
  const session = await auth.api.getSession();
  if (!session?.user?.id) redirect('/users/signin');

  return (
    <Suspense fallback={<LoadingSpinner />}>
      <ChannelOrganizer userId={session.user.id} />
    </Suspense>
  );
}
```

### Pattern 2: Client Component with Optimistic Updates

```typescript
// favorite-button.tsx (Client Component)
'use client';

import { useOptimistic } from 'react';
import { toggleFavoriteAction } from '@/lib/actions/channel-preferences';

export function FavoriteButton({ channelId, isFavorite }: FavoriteButtonProps) {
  const [optimisticFavorite, setOptimisticFavorite] = useOptimistic(
    isFavorite,
    (current, newValue: boolean) => newValue
  );

  async function handleToggle() {
    setOptimisticFavorite(!optimisticFavorite);
    const result = await toggleFavoriteAction(channelId);
    if (!result.success) {
      // Automatic revert by useOptimistic
      alert(result.error);
    }
  }

  return (
    <button onClick={handleToggle} aria-pressed={optimisticFavorite}>
      <HeartIcon filled={optimisticFavorite} />
    </button>
  );
}
```

---

## Testing Contracts

### Mock Data

```typescript
// For unit tests
const mockPreference: UserChannelPreference = {
  id: 1,
  userId: 'user-123',
  channelId: 42,
  isFavorite: true,
  isHidden: false,
  updatedAt: '2025-12-02T10:00:00.000Z',
};

const mockActionResult: PreferenceActionResult = {
  success: true,
  preference: mockPreference,
};
```

### Test Scenarios

```typescript
describe('toggleFavoriteAction', () => {
  it('creates preference when none exists', async () => {
    const result = await toggleFavoriteAction(channelId);
    expect(result.success).toBe(true);
    expect(result.preference?.isFavorite).toBe(true);
  });

  it('unfavorites when already favorited', async () => {
    // Setup: channel is favorited
    const result = await toggleFavoriteAction(channelId);
    expect(result.preference?.isFavorite).toBe(false);
  });

  it('auto-unhides when favoriting hidden channel', async () => {
    // Setup: channel is hidden
    const result = await toggleFavoriteAction(channelId);
    expect(result.preference?.isFavorite).toBe(true);
    expect(result.preference?.isHidden).toBe(false);
  });

  it('returns error when unauthorized', async () => {
    // Setup: no session
    const result = await toggleFavoriteAction(channelId);
    expect(result.success).toBe(false);
    expect(result.error).toBe('You must be signed in to manage preferences');
  });
});
```

---

**Status**: Contracts defined and ready for implementation  
**Next Step**: Create quickstart.md with validation scenarios
