# Fix: Inactive Tuner Enforcement

**Date**: 2025-11-19  
**Status**: ✅ Complete

## Problem

Marking a tuner as inactive didn't prevent it from being used for streaming. Additionally, there was no visual indication on the tuners list page to show which tuners were inactive.

## Solution

### 1. Enforce Inactive Status in Streaming Routes

Added `is_active` checks to prevent streaming from inactive tuners:

**Direct Stream Route** (`src/app/(protected)/tuners/[id]/channel/[channel_id]/stream/route.tsx`):
```typescript
// Check if tuner is active
if (!channel.tuners.is_active) {
    Logger.warn({ tunerId: id, channelId: channel_id, tunerName: channel.tuners.name },
        'Stream request for inactive tuner');
    return new Response('Tuner is not active', { status: 403 });
}
```

**Transcode Playlist Route** (`src/app/api/transcode/[tunerId]/[channelId]/playlist.m3u8/route.ts`):
```typescript
// Check if tuner is active
if (!channel.tuners.is_active) {
    Logger.warn({
        tunerId,
        channelId,
        tunerName: channel.tuners.name,
    }, 'Transcode playlist request for inactive tuner');
    return new Response('Tuner is not active', { status: 403 });
}
```

### 2. Visual Indicators on Tuners List

Updated tuners list page (`src/app/(protected)/tuners/page.tsx`) to show inactive status:

**Visual Changes**:
- **Reduced opacity** (60%) for inactive tuner cards
- **"Inactive" badge** in warning color (orange) shown on card header
- **Maintained functionality** - cards remain clickable to allow admins to edit

### 3. Visual Indicators on Tuner Detail Page

Updated tuner detail page (`src/app/(protected)/tuners/[id]/page.tsx`) to show inactive status:

**Visual Changes**:
- **"⚠️ Inactive" badge** next to tuner name in warning color (orange)
- **Warning message** below path: "This tuner is inactive and unavailable for streaming"
- **Prominent display** to clearly communicate tuner cannot be used

**Implementation**:
```typescript
<Card style={{
    height: '100%',
    opacity: tuner.is_active ? 1 : 0.6,
}}>
    <div className="flex items-center justify-between mb-2">
        <h3>{tuner.name}</h3>
        {!tuner.is_active && (
            <span style={{
                backgroundColor: 'var(--color-warning-bg)',
                color: 'var(--color-warning)',
            }}>
                Inactive
            </span>
        )}
    </div>
    {/* ... rest of card ... */}
</Card>
```

## Behavior

### Active Tuners
- ✅ Streams work normally
- ✅ Transcoding works normally
- ✅ Full opacity on list page
- ✅ No special indicators

### Inactive Tuners
- ❌ Direct streams return **403 Forbidden**
- ❌ Transcoding playlists return **403 Forbidden**
- 🔍 Reduced opacity (60%) on list page
- 🏷️ "Inactive" badge displayed
- 📝 Logged with warning level
- ✅ Still visible/editable by admins

## Testing

### Manual Tests
1. **Mark tuner inactive** on edit page
2. **Try to stream** from an inactive tuner's channel
   - Should fail with 403 error
   - Should see warning in logs
3. **Check tuners list** page
   - Inactive tuner should have reduced opacity
   - Should show orange "Inactive" badge
4. **Click inactive tuner** card
   - Should still navigate to detail page (for editing)

### Automated Tests
- ✅ All 128 existing tests pass
- ✅ No new breaking changes
- ✅ ESLint passes with 0 errors

## Files Modified

1. `src/app/(protected)/tuners/[id]/channel/[channel_id]/stream/route.tsx` - Added active check
2. `src/app/api/transcode/[tunerId]/[channelId]/playlist.m3u8/route.ts` - Added active check
3. `src/app/(protected)/tuners/page.tsx` - Added visual indicators on list
4. `src/app/(protected)/tuners/[id]/page.tsx` - Added inactive warning on detail page
5. `CHANGELOG.md` - Documented fix

## Impact

### User Experience
- **Improved clarity** - Users can immediately see which tuners are inactive
- **Proper enforcement** - Inactive tuners can no longer be streamed from
- **Better logging** - Warning logs when inactive tuner streaming is attempted

### Admin Experience
- **Visual feedback** - Clear indication of tuner status without navigating to detail page
- **Control** - Inactive flag now actually controls streaming availability
- **Maintenance** - Can temporarily disable problematic tuners without deleting

## Future Enhancements

Possible improvements:
- Add "Last Active" timestamp to show when tuner was last used
- Add quick toggle button on list page to activate/deactivate
- Show reason for inactive status (maintenance, offline, etc.)
- Add bulk activate/deactivate operations
- Filter tuners list by active/inactive status

---

**Status**: ✅ Ready for production
