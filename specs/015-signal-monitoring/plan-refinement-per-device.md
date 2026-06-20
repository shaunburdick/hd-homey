# Refinement Plan: Per-Device Signal Page Shows All Physical Tuner Slots

**Feature**: SPEC-015 — Signal Monitoring & Antenna Tuning  
**Branch**: `signal-monitor`  
**Created**: 2026-06-19  
**Parent Plan**: `specs/015-signal-monitoring/plan.md`  
**Spec Reference**: `.specify/features/015-signal-monitoring.md`

---

## Problem Statement

In the HD Homey data model, one `tuner` record in the database represents **one physical HDHomeRun device box** (e.g., "HDHomeRun Connect 4", "HDHomeRun Flex 4K"). Each device box has N physical tuner slots (typically 2 or 4, named `tuner0`, `tuner1`, `tuner2`, `tuner3`).

The `/tuners/[id]/signal` page currently subscribes to only **one** physical slot (`tuner0`) because the SSE route calls `poller.subscribe()` with a single resource. Users with multi-tuner devices expect to see **all** physical tuner slots on their device.

---

## Architecture Decision: No New Database Table

**Decision**: Physical tuner slots are **not** stored in the database. They are discovered at runtime from the device's `/status.json` endpoint and tracked in-memory by the poller.

### Rationale

| Consideration | DB Table Approach | In-Memory Approach (chosen) |
|---|---|---|
| **Data accuracy** | Stale if device swapped/firmware changed | Self-correcting — reads actual device state every 2 s |
| **Sync complexity** | Insert/delete/update logic needed | Zero — device is source of truth |
| **Migration required** | Yes (new table, data migration) | No |
| **Stable IDs** | Yes | No — synthetic IDs are ephemeral per poller instance |
| **Runtime cost** | DB read per poll cycle | Already fetched every 2 s from `/status.json` |
| **Simplicity (Constitution I)** | ❌ More moving parts | ✅ Zero new infrastructure |

The existing `autoDiscoverTuners()` method in `SignalPollingManager` already handles this — it iterates `/status.json` entries, detects untracked resources, assigns synthetic negative IDs, and emits events for all of them. No additional DB infrastructure is needed.

### What Synthetic IDs Mean for the UI

- DB-backed tuner slots use the DB `id` (positive integer, stable across restarts)
- Auto-discovered slots get synthetic negative IDs (`-1`, `-2`, `-3`, etc.)
- Negative IDs are ephemeral — they change on server restart
- The UI treats both identically; the tuner name is derived from the `resource` field (e.g., "Tuner 1", "Tuner 2")

---

## Changes

### 1. SSE Route: `/api/signal/[tunerId]/stream/route.ts`

**Before**: Calls `poller.subscribe()` for one resource
```typescript
subscriberId = poller.subscribe({ deviceUrl, tunerDbId: tunerId, resource, controller });
```

**After**: Calls `poller.subscribeAll()` for all slots on the device
```typescript
// Build tunersToTrack from all DB records on the same device path
const tunersToTrack = deviceTuners.map((t, i) => ({
    tunerId: t.id,
    resource: `tuner${i}`,
}));
subscriberId = poller.subscribeAll({ deviceUrl, tunersToTrack, controller });
```

The device string stored in `tuner.path` (e.g., `http://192.168.1.100`) is used as the device URL. `resolveTuner()` already computes the resource index correctly — we just need to pass all tuners instead of one.

### 2. Client Page: `/tuners/[id]/signal/page.tsx`

**Before**: Single-tuner state with `SignalGaugeRow` + `SignalGraphRow` + `ProgramList` + `Atsc3Details`

**After**: Multi-tuner state with a grid of `SignalStatusCard` components (same component and layout as the antenna page)

State change:
```typescript
// Before
signal: SignalSseEvent | null
programs: ParsedProgram[]
history: SignalDataPoint[]

// After
tunerStates: Record<number, TunerSignalState>   // same type as antenna page
```

Render change:
```typescript
// Before
<SignalGaugeRow signal={signal} />
<SignalGraphRow signal={signal} history={history} />
<ProgramList programs={programs} idle={idle} />
<Atsc3Details plp={atsc3plp} l1={atsc3l1} />

// After
<div className="antenna-grid">
    {tunerList.map(tunerState => (
        <SignalStatusCard key={tunerState.tunerId} state={tunerState} />
    ))}
</div>
```

The breadcrumb, page title ("{tunerName} — Signal Monitor"), and back button remain unchanged.

### 3. Route Test: `routes.test.ts`

The test at line 170 (`returns 200 with SSE Content-Type for valid tuner`) expects `poller.subscribe` to be called. After the change, `poller.subscribeAll` is called instead. Update the mock expectation and verify `subscribeAll` was called with the correct arguments.

### 4. Plan & Spec Updates

- **plan.md**: Add section "Per-Device Signal Page — All Physical Tuner Slots" documenting the architecture decision above
- **plan-refinement-per-device.md**: This document
- **tasks.md**: Add new tasks (see below)
- **spec**: No changes needed — the existing spec already describes the single-tuner page, and the new behavior is strictly additive (showing more data on the same page)

### What Does NOT Change

- `/signal/antenna` — unchanged, still shows all physical slots across all devices
- `signal-poller.ts` — `autoDiscoverTuners()` already handles the multi-slot case
- All other routes (tune, clear) — unchanged
- Auth/security — unchanged
- `/tuners` list — still shows one row per device box

---

## Files Modified

```
apps/web/src/
├── app/api/signal/[tunerId]/stream/route.ts   # Changed: subscribe → subscribeAll
├── app/(protected)/tuners/[id]/signal/page.tsx  # Changed: single-tuner → multi-tuner display
└── app/api/signal/tests/routes.test.ts           # Updated: mock expectation
```

Specs:
```
specs/015-signal-monitoring/plan.md               # Updated: add architecture decision
specs/015-signal-monitoring/tasks.md               # Updated: add new tasks
specs/015-signal-monitoring/plan-refinement-per-device.md  # This document
```
