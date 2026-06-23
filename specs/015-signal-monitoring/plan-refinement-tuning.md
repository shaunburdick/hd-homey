# Plan Refinement: Per-Slot Tuning Controls

**Feature**: SPEC-015 — Signal Monitoring & Antenna Tuning  
**Spec**: `.specify/features/015-signal-monitoring.md` (v1.1)  
**Branch**: `signal-monitor`  
**Date**: 2026-06-22

---

## Problem

The per-device signal page (`/tuners/[id]/signal`) shows all 4 physical tuner slots with gauges, graphs, and diagnostics, but provides no way to *change* what channel a tuner is locked to. The `/signal/antenna` page that originally occupied the "tuning" niche has been removed.

Tune and clear API routes already exist (`POST /api/signal/[tunerId]/tune` and `POST /api/signal/[tunerId]/clear`), but they use an implicit sibling-sort index to determine which physical slot to target — this doesn't work for auto-discovered slots with negative tunerId.

## Design

### Backend Changes

**Tune route** (`apps/web/src/app/api/signal/[tunerId]/tune/route.ts`):

Change the POST body contract:
- **Before**: `{ guideNumber: "3.1" }` — slot resolved implicitly via sibling sort
- **After**: `{ guideNumber: "3.1", resource: "tuner2" }` — slot targeted explicitly

Changes:
1. Add `resource` as a **required** field in the parsed body
2. Remove `resolveTunerAndIndex()` — no longer needed
3. Extract `tunerNum` directly from resource string: `parseInt(resource.replace(/\D/g, ''), 10)`
4. Use `tuner.path` (device URL) + parsed `tunerNum` for the device command URL
5. Validate `resource` format matches `/^tuner\d+$/` — return 400 if invalid
6. Keep existing viewer conflict check (HTTP 409) and admin auth

**Clear route** (`apps/web/src/app/api/signal/[tunerId]/clear/route.ts`):

Same approach:
1. Add `resource` as required body field
2. Remove implicit sibling-sort index resolution
3. Extract tuner number from resource string
4. Build `channel=none` URL from `tuner.path` + parsed tuner number

### Frontend: TuningControl Component

New component `apps/web/src/components/signal/TuningControl.tsx`:

**Props**:
```typescript
interface TuningControlProps {
    tunerId: number;            // The page's DB tuner ID (from URL) for API calls
    resource: string;           // Physical slot name, e.g. "tuner2"
    vctName?: string;           // Currently tuned channel name (from live signal state)
    vctNumber?: string;         // Currently tuned channel number (from live signal state)
    idle: boolean;              // Whether the slot is idle (no channel tuned)
}
```

**Behavior**:
- Fetches channels via `GET /api/tuners/[tunerId]/channels` on mount
- Renders: `<select>` dropdown of channels (guideNumber — guideName) + "Tune" button + "Clear" button
- Shows current channel info when slot is locked: badge with `vctNumber vctName`
- Grayed out "No channels available" state when lineup is empty
- All controls require admin role (check via server-side response; client can check session)
- On Tune click: `POST /api/signal/[tunerId]/tune` with `{ guideNumber, resource }`
- On Clear click: `POST /api/signal/[tunerId]/clear` with `{ resource }`
- Handle HTTP 409 (viewer conflict) by showing confirmation dialog, then resend with `?force=true`
- Handle HTTP 401/403 by hiding controls
- Loading state while fetching channels

### Integration into Per-Device Signal Page

In `apps/web/src/app/(protected)/tuners/[id]/signal/page.tsx`:

1. Import `TuningControl`
2. In `SignalGrid` or within each `SignalStatusCard`:
   - Add `<TuningControl>` alongside the diagnostics section
   - Pass the page's `tunerId` (from useParams)
   - Pass the slot's `resource`, `vctName`, `vctNumber`, and `idle` from the `TunerSignalState`

This keeps tuning controls visually grouped with their slot's card.

### Non-Admin Handling

For viewer-role users:
- The tune/clear routes return 403, so the client will get an error response
- The `TuningControl` component hides all controls when it receives a 403
- Better UX: check session on the client side (via a fetch to `/api/auth/session` or a passed prop) and don't render controls at all

### Auto-Discovered Slots

Auto-discovered slots have negative `tunerId` values (-1, -2, -3) and no DB record. The `TuningControl` uses the **page URL's** DB tunerId for API calls, plus the slot's own `resource` name. This works because:
- The device URL is resolved from the DB tuner record (the page's tunerId)
- The physical slot is targeted by the `resource` field
- Channels are fetched using the page's tunerId (same device lineup)

## Effort

| Task | Description | Complexity |
|------|-------------|------------|
| T-039 | Modify tune route — require `resource`, remove sibling-sort | M |
| T-040 | Modify clear route — require `resource`, remove sibling-sort | S |
| T-041 | Create `TuningControl` component | M |
| T-042 | Wire `TuningControl` into per-device signal page | M |
| T-043 | Unit tests for modified tune/clear routes + TuningControl | M |
| T-044 | Update docs and quality gate | S |

**Total**: ~4–6 hr
