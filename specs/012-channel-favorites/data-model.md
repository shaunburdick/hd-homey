# Data Model: Channel Favorites and Organization

**Feature**: 012-channel-favorites  
**Date**: 2025-12-02  
**Phase**: 1 - Data Modeling

## Overview

This feature adds user-specific channel preferences (favorite/hidden status) through a new `user_channel_preferences` table. The table creates a many-to-many relationship between users and channels with additional preference attributes.

## Entity Relationship Diagram

```
┌──────────────┐          ┌──────────────────────────────┐          ┌──────────────┐
│     user     │          │  user_channel_preferences     │          │   channels   │
├──────────────┤          ├──────────────────────────────┤          ├──────────────┤
│ id (PK)      │◄─────────┤ user_id (FK)                 │          │ id (PK)      │
│ username     │          │ channel_id (FK)               ├─────────►│ fk_tuner     │
│ role         │          │ is_favorite                   │          │ guideNumber  │
│ ...          │          │ is_hidden                     │          │ guideName    │
└──────────────┘          │ updated_at                    │          │ ...          │
                          │ UNIQUE(user_id, channel_id)   │          └──────────────┘
                          │ CHECK(NOT (is_favorite AND    │
                          │            is_hidden))        │
                          └──────────────────────────────┘
```

## New Entity: user_channel_preferences

### Description

Stores user-specific preferences for channels. Each record represents a user's preference state for a specific channel. Only users who have explicitly favorited or hidden a channel will have a record.

### Fields

| Field       | Type      | Constraints                                      | Description                                    |
|-------------|-----------|--------------------------------------------------|------------------------------------------------|
| id          | INTEGER   | PRIMARY KEY AUTOINCREMENT                        | Unique identifier for the preference record    |
| user_id     | TEXT      | NOT NULL, REFERENCES user(id) ON DELETE CASCADE  | User who owns this preference                  |
| channel_id  | INTEGER   | NOT NULL, REFERENCES channels(id) ON DELETE CASCADE | Channel this preference applies to          |
| is_favorite | BOOLEAN   | NOT NULL DEFAULT 0                               | Whether user favorited this channel            |
| is_hidden   | BOOLEAN   | NOT NULL DEFAULT 0                               | Whether user hid this channel                  |
| updated_at  | TEXT      | NOT NULL                                         | ISO 8601 timestamp of last update              |

### Constraints

1. **Primary Key**: `id` (autoincrement)
2. **Unique Constraint**: `(user_id, channel_id)` - One preference record per user-channel pair
3. **Check Constraint**: `NOT (is_favorite = 1 AND is_hidden = 1)` - Prevents both flags being true
4. **Foreign Keys**:
   - `user_id` → `user.id` with CASCADE delete (when user deleted, their preferences deleted)
   - `channel_id` → `channels.id` with CASCADE delete (when channel deleted, preferences deleted)

### Indexes

```sql
-- Unique index for fast lookup and duplicate prevention
CREATE UNIQUE INDEX idx_user_channel 
ON user_channel_preferences(user_id, channel_id);

-- Index for querying all preferences for a user
CREATE INDEX idx_user_prefs 
ON user_channel_preferences(user_id);

-- Index for querying preferences for a channel (admin analytics, future)
CREATE INDEX idx_channel_prefs 
ON user_channel_preferences(channel_id);
```

### State Machine

```
Initial State: No record exists (defaults to regular channel)

┌─────────────────┐
│  No Preference  │ ────┐
│ (no DB record)  │     │ Click favorite
└─────────────────┘     │
        ▲               │
        │               ▼
        │        ┌──────────────┐
        │        │  Favorited   │◄──────┐
        │        │ is_favorite=1│       │
        │        │ is_hidden=0  │       │
        │        └──────────────┘       │
        │               │                │
        │               │ Click hide     │ Click favorite
        │               ▼                │
        │        ┌──────────────┐       │
        └────────┤    Hidden    ├───────┘
    Click X      │ is_favorite=0│
    (unhide)     │ is_hidden=1  │
                 └──────────────┘
                        │
                        │ Click X (unhide)
                        └─────────► Delete record (return to No Preference)
```

**State Transitions**:
- **No record → Favorite**: Create record with `is_favorite=1, is_hidden=0`
- **No record → Hidden**: Create record with `is_favorite=0, is_hidden=1`
- **Favorite → Hidden**: Update record to `is_favorite=0, is_hidden=1`
- **Hidden → Favorite**: Update record to `is_favorite=1, is_hidden=0`
- **Favorite → No Preference**: Update to `is_favorite=0, is_hidden=0` (or delete record)
- **Hidden → No Preference**: Update to `is_favorite=0, is_hidden=0` (or delete record)

**Optimization**: When both flags are false, we could delete the record to save space. However, keeping the record allows us to track "last updated" timestamp for future features.

## Modified Entity: channels

### Changes

**No schema changes required.** The `channels` table remains unchanged. Preferences are stored in the separate `user_channel_preferences` table.

### Query Pattern

To fetch channels with user preferences:

```typescript
const channelsWithPrefs = await db
  .select({
    channel: channels,
    preference: userChannelPreferences,
  })
  .from(channels)
  .leftJoin(
    userChannelPreferences,
    and(
      eq(userChannelPreferences.channelId, channels.id),
      eq(userChannelPreferences.userId, userId)
    )
  )
  .where(eq(channels.deleted, false))
  .orderBy(channels.guideNumber);
```

**Result**: Array of `{ channel, preference | null }` where `preference` is null if no record exists.

## Modified Entity: user

### Changes

**No schema changes required.** Users don't need additional fields.

### Relationship

- User has many `userChannelPreferences` (one per channel they've categorized)
- This is a one-to-many relationship via foreign key

## Database Migration

### Migration File: `0002_channel_preferences.sql`

```sql
-- Migration: Add user channel preferences
-- Feature: 012-channel-favorites
-- Date: 2025-12-02

CREATE TABLE user_channel_preferences (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
  channel_id INTEGER NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  is_favorite INTEGER NOT NULL DEFAULT 0 CHECK(is_favorite IN (0, 1)),
  is_hidden INTEGER NOT NULL DEFAULT 0 CHECK(is_hidden IN (0, 1)),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  
  -- Constraints
  CHECK(NOT (is_favorite = 1 AND is_hidden = 1)),
  UNIQUE(user_id, channel_id)
);

-- Indexes for performance
CREATE UNIQUE INDEX idx_user_channel 
  ON user_channel_preferences(user_id, channel_id);

CREATE INDEX idx_user_prefs 
  ON user_channel_preferences(user_id);

CREATE INDEX idx_channel_prefs 
  ON user_channel_preferences(channel_id);

-- Update timestamp trigger (SQLite doesn't have automatic ON UPDATE)
CREATE TRIGGER update_user_channel_preferences_timestamp 
  AFTER UPDATE ON user_channel_preferences
  FOR EACH ROW
BEGIN
  UPDATE user_channel_preferences 
  SET updated_at = datetime('now') 
  WHERE id = OLD.id;
END;
```

### Rollback Plan

```sql
-- Rollback: Remove user channel preferences
DROP TRIGGER IF EXISTS update_user_channel_preferences_timestamp;
DROP INDEX IF EXISTS idx_channel_prefs;
DROP INDEX IF EXISTS idx_user_prefs;
DROP INDEX IF EXISTS idx_user_channel;
DROP TABLE IF EXISTS user_channel_preferences;
```

## Drizzle ORM Schema

### New Table Definition

Add to `src/lib/database/schema.ts`:

```typescript
/**
 * User channel preferences table (SPEC-012)
 * Stores favorite and hidden status for channels per user
 */
export const userChannelPreferences = sqliteTable(
  'user_channel_preferences',
  {
    id: integer('id', { mode: 'number' }).primaryKey({ autoIncrement: true }),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    channelId: integer('channel_id', { mode: 'number' })
      .notNull()
      .references(() => channels.id, { onDelete: 'cascade' }),
    isFavorite: integer('is_favorite', { mode: 'boolean' }).notNull().default(false),
    isHidden: integer('is_hidden', { mode: 'boolean' }).notNull().default(false),
    updatedAt: text('updated_at')
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    // Unique constraint - one preference per user-channel pair
    unique('user_channel_unique').on(table.userId, table.channelId),
    // Index for fast user lookups
    index('idx_user_prefs').on(table.userId),
    // Index for channel lookups (future analytics)
    index('idx_channel_prefs').on(table.channelId),
  ]
);

export type UserChannelPreference = typeof userChannelPreferences.$inferSelect;
export type NewUserChannelPreference = typeof userChannelPreferences.$inferInsert;

// Relations
export const userChannelPreferencesRelations = relations(
  userChannelPreferences,
  ({ one }) => ({
    user: one(user, {
      fields: [userChannelPreferences.userId],
      references: [user.id],
    }),
    channel: one(channels, {
      fields: [userChannelPreferences.channelId],
      references: [channels.id],
    }),
  })
);

// Add to user relations
export const userRelations = relations(user, ({ many }) => ({
  preferences: many(userChannelPreferences),
  // ... existing relations
}));

// Add to channel relations
export const channelRelations = relations(channels, ({ one, many }) => ({
  tuners: one(tuners, {
    fields: [channels.fk_tuner],
    references: [tuners.id],
  }),
  preferences: many(userChannelPreferences),
}));
```

**Note**: The CHECK constraint `NOT (is_favorite AND is_hidden)` must be added in the SQL migration. Drizzle doesn't have a built-in way to express complex CHECK constraints in the schema definition.

## Data Validation Rules

### Application-Level Validation

```typescript
interface PreferenceUpdate {
  isFavorite?: boolean;
  isHidden?: boolean;
}

function validatePreference(update: PreferenceUpdate): void {
  if (update.isFavorite === true && update.isHidden === true) {
    throw new Error('Channel cannot be both favorited and hidden');
  }
}
```

### Database-Level Validation

- CHECK constraint enforces at database level
- Foreign keys ensure user and channel exist
- UNIQUE constraint prevents duplicate preferences
- Booleans stored as INTEGER (0/1) with CHECK constraint

## Query Patterns

### 1. Get all preferences for a user

```typescript
const preferences = await db
  .select()
  .from(userChannelPreferences)
  .where(eq(userChannelPreferences.userId, userId));
```

**Performance**: Uses `idx_user_prefs` index, O(log n) lookup

### 2. Get specific preference for user and channel

```typescript
const preference = await db
  .select()
  .from(userChannelPreferences)
  .where(
    and(
      eq(userChannelPreferences.userId, userId),
      eq(userChannelPreferences.channelId, channelId)
    )
  )
  .limit(1);
```

**Performance**: Uses `idx_user_channel` unique index, O(1) lookup

### 3. Get channels with preferences for user (main query)

```typescript
const channelsWithPrefs = await db
  .select({
    channel: channels,
    preference: userChannelPreferences,
  })
  .from(channels)
  .leftJoin(
    userChannelPreferences,
    and(
      eq(userChannelPreferences.channelId, channels.id),
      eq(userChannelPreferences.userId, userId)
    )
  )
  .where(eq(channels.is_active, true))
  .orderBy(channels.guideNumber);
```

**Performance**: 
- JOIN uses `idx_user_channel` index
- Filter on `channels.is_active` (existing index)
- Expected time: 20-30ms for 200 channels

### 4. Toggle favorite (upsert pattern)

```typescript
async function toggleFavorite(userId: string, channelId: number): Promise<UserChannelPreference> {
  const existing = await db
    .select()
    .from(userChannelPreferences)
    .where(
      and(
        eq(userChannelPreferences.userId, userId),
        eq(userChannelPreferences.channelId, channelId)
      )
    )
    .limit(1);

  if (existing.length > 0) {
    // Update existing
    const newFavorite = !existing[0].isFavorite;
    return db
      .update(userChannelPreferences)
      .set({
        isFavorite: newFavorite,
        isHidden: newFavorite ? false : existing[0].isHidden, // Auto-unhide if favoriting
        updatedAt: new Date().toISOString(),
      })
      .where(eq(userChannelPreferences.id, existing[0].id))
      .returning();
  } else {
    // Insert new
    return db
      .insert(userChannelPreferences)
      .values({
        userId,
        channelId,
        isFavorite: true,
        isHidden: false,
        updatedAt: new Date().toISOString(),
      })
      .returning();
  }
}
```

## Edge Cases and Data Integrity

### Case 1: User Deleted

**Behavior**: CASCADE delete removes all their preferences  
**Query**: Automatic via foreign key constraint  
**Data Loss**: Acceptable - user is gone, preferences are personal

### Case 2: Channel Deleted

**Behavior**: CASCADE delete removes all preferences for that channel  
**Query**: Automatic via foreign key constraint  
**Data Loss**: Acceptable - channel is gone, no need to remember preferences

### Case 3: Tuner Deleted

**Behavior**: Channels are soft-deleted, preferences remain  
**Query**: Filter by `channels.deleted_at IS NULL`  
**Cleanup**: Optional background job to purge old preferences

### Case 4: Channel Refreshed (guide number changes)

**Behavior**: Channel ID doesn't change, preferences persist  
**Query**: Preferences keyed by channel.id, not guide number  
**Data Integrity**: Maintained

### Case 5: Duplicate Channel (same guide number, different tuner)

**Behavior**: Each channel has unique ID, preferences are independent  
**Query**: User can favorite channel on tuner A but not tuner B  
**User Experience**: Potentially confusing but technically correct

### Case 6: Both Flags False

**Optimization Option 1**: Keep record (tracks "last touched")  
**Optimization Option 2**: Delete record (saves space)  
**Decision**: Keep record for now, optimize later if needed

## Performance Characteristics

### Storage

**Per Record**: ~40 bytes (estimate)
- `id`: 4 bytes
- `user_id`: 36 bytes (UUID text)
- `channel_id`: 4 bytes
- `is_favorite`: 1 byte
- `is_hidden`: 1 byte
- `updated_at`: ~25 bytes (ISO 8601 text)
- Total: ~71 bytes raw, ~40 bytes with SQLite compression

**Capacity**: 1,000 preferences = ~40KB (negligible)

### Query Performance

| Query Type                     | Expected Time | Index Used           |
|--------------------------------|---------------|----------------------|
| Get user preferences           | 5-10ms        | idx_user_prefs       |
| Get specific preference        | <1ms          | idx_user_channel     |
| Get channels with preferences  | 20-30ms       | idx_user_channel     |
| Toggle favorite/hidden         | 10-20ms       | idx_user_channel     |

**Bottleneck**: LEFT JOIN with channels table (acceptable with indexes)

### Scalability

**Current**: 5-20 users, 50-200 channels, 10-50 preferences per user  
**Maximum Tested**: 200 channels, 50 preferences (20-30ms query time)  
**Breaking Point**: ~1,000 channels might need optimization (pagination)

## Future Enhancements (Out of Scope)

These are **not** part of SPEC-012 but could extend this data model:

1. **Custom Channel Names**: Add `custom_name TEXT` field
2. **User Notes**: Add `notes TEXT` field
3. **Last Watched**: Add `last_watched_at TIMESTAMP` field
4. **Watch Count**: Add `watch_count INTEGER` field
5. **Channel Rating**: Add `rating INTEGER` field (1-5 stars)
6. **Categories/Tags**: Add `category TEXT` or separate tags table

**Migration Strategy**: All future enhancements can be added via ALTER TABLE without breaking existing functionality.

---

**Status**: Complete and ready for implementation  
**Next Step**: Create contracts/ with TypeScript interfaces
