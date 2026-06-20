# Tasks: Signal Monitoring & Antenna Tuning (SPEC-015)

**Feature**: SPEC-015 — Signal Monitoring & Antenna Tuning  
**Branch**: `signal-monitor`  
**Plan Reference**: `specs/015-signal-monitoring/plan.md`  
**Created**: 2026-06-19  
**Spec**: `.specify/features/015-signal-monitoring.md`

---

## Legend

- `[P]` — Parallel-safe (no dependency on other in-progress tasks in the same wave)
- `[DEPENDS: T-XXX]` — Must wait for specified task(s) to complete
- **Wave** — Group of tasks that can be executed in parallel after the previous wave completes
- **Complexity**: S = ~30 min, M = ~1–2 hr, L = ~2–4 hr

---

## Wave 0 — Project Setup (Blocker for everything)

- [x] **T-001** `[S]` — Add `recharts` dependency to `@hd-homey/web` workspace and verify it resolves without peer-dep conflicts
  - `npm install recharts -w @hd-homey/web`
  - Verify `recharts` appears in `apps/web/package.json` under `dependencies`
  - Run `npm run build -w @hd-homey/web` to confirm no import errors

---

## Wave 1 — Types & Pure Parsers (Foundation — no UI, no I/O)

All Wave 1 tasks are parallel-safe after T-001.

- [x] **T-002** `[P]` `[M]` `[DEPENDS: T-001]` — Add new signal types to `apps/web/src/lib/hdhr/types.ts`
  - Add `TunerStatusEntry`, `TunerStatusResponse`, `StreamInfoPid`, `ParsedProgram`, `Atsc3PlpInfo`, `Atsc3L1Info`, `TunerLockStatus`
  - All types from `data-model.md` Section 1
  - No behavior changes to existing exports

- [x] **T-003** `[P]` `[L]` `[DEPENDS: T-001]` — Create `apps/web/src/lib/hdhr/signal-parsers.ts` with all pure parsing functions
  - `parseStatusJson(json: TunerStatusResponse, resource: string): TunerStatusEntry | null`
  - `parseStreamInfo(rawText: string): StreamInfoPid[]`
  - `groupStreamInfoByProgram(pids: StreamInfoPid[], vctName?: string): ParsedProgram[]`
  - `parseAtsc3Plp(rawText: string): Atsc3PlpInfo`
  - `parseAtsc3L1(rawText: string): Atsc3L1Info`
  - `parseTunerLockStatus(rawText: string): TunerLockStatus`
  - `formatSseEvent(eventName: string, data: object): string` — formats `event: X\ndata: {...}\n\n`
  - `getSignalQuality(value: number | null, metric: 'SS' | 'SNQ' | 'SEQ'): SignalQuality` — threshold logic
  - Export `SIGNAL_THRESHOLDS` constants (from `data-model.md` Section 5)
  - Export `SignalSseEvent`, `StreamInfoSseEvent`, `Atsc3PlpSseEvent`, `Atsc3L1SseEvent`, `PingSseEvent`, `SignalStreamEvent` union types (from `data-model.md` Section 2)
  - Export `SignalDataPoint`, `TunerSignalState` client-side state types (from `data-model.md` Section 3)

- [x] **T-004** `[P]` `[L]` `[DEPENDS: T-003]` — Write unit tests `apps/web/src/lib/hdhr/signal-parsers.test.ts`
  - `parseStatusJson`: active tuner, idle tuner, malformed JSON, missing resource
  - `parseStreamInfo`: standard multi-program output, single PID, empty string, malformed lines
  - `groupStreamInfoByProgram`: groups correctly, handles empty pids array
  - `parseAtsc3Plp`: valid key-value, partial data, 404 empty string, float snr
  - `parseAtsc3L1`: valid key-value, partial data, empty string
  - `parseTunerLockStatus`: atsc3 lock, atsc1 lock, no lock
  - `getSignalQuality`: all boundary values for SS, SNQ, SEQ (green/yellow/red/idle)
  - `formatSseEvent`: output matches RFC 8895 wire format
  - Target: 100% coverage on this file (pure functions — achievable)

---

## Wave 2 — Polling Manager (Server Core)

- [x] **T-005** `[M]` `[DEPENDS: T-002, T-003]` — Create `apps/web/src/lib/hdhr/signal-poller.ts` — Singleton polling manager
  - Define `SseSubscriber` and `DevicePollEntry` internal types
  - Implement `SignalPollingManager` class:
    - `subscribe(deviceUrl, tunerDbId, resource, controller): string` — returns subscriberId
    - `subscribeAll(deviceUrl, tuners, controller): string` — for antenna mode
    - `unsubscribe(deviceUrl, subscriberId): void` — cleans up if last subscriber
    - `getSubscriberCount(deviceUrl): number`
    - `private startPolling(deviceUrl): void` — starts 2 s interval + 30 s ping interval
    - `private stopPolling(deviceUrl): void` — clears both intervals
    - `private poll(deviceUrl): Promise<void>` — fetches status.json, dispatches events
    - `private fetchWithTimeout(url: string, timeoutMs: number): Promise<Response>` — AbortController wrapper
    - `private dispatchSignalEvent(entry, statusEntry, tunerId): void`
    - `private dispatchStreamInfoIfChanged(entry, statusEntry, tunerId): Promise<void>`
    - `private dispatchAtsc3IfLocked(entry, statusEntry, tunerId): Promise<void>`
  - Export `getSignalPoller(): SignalPollingManager` factory (module-level singleton)
  - Uses `parseStatusJson`, `parseStreamInfo`, `parseAtsc3Plp`, `parseAtsc3L1`, `formatSseEvent` from T-003
  - Uses `parseTunerLockStatus` for ATSC 3.0 lock detection
  - 3 s device fetch timeout; emits `error: 'timeout'` or `error: 'unreachable'` on failure
  - ping interval: 30 s

- [x] **T-006** `[M]` `[DEPENDS: T-005]` — Write unit tests `apps/web/src/lib/hdhr/signal-poller.test.ts`
  - Mock `fetch` globally; test `subscribe` + poll cycle dispatches correct SSE events
  - Test subscriber deduplication (2 subscribers → 1 poll call per cycle)
  - Test `unsubscribe` clears interval when count reaches 0
  - Test device timeout → emits `error: 'timeout'` signal event
  - Test device unreachable → emits `error: 'unreachable'` signal event
  - Test VctNumber change detection → triggers streaminfo fetch
  - Test ATSC 3.0 lock detection → triggers plpinfo + l1info fetches
  - Test graceful handling of 404 on ATSC 3.0 endpoints
  - Target: ≥70% coverage

---

## Wave 3 — API Route Handlers (Parallel after Wave 2)

- [x] **T-007** `[P]` `[L]` `[DEPENDS: T-005]` — Create `apps/web/src/app/api/signal/[tunerId]/stream/route.ts` — Single-tuner SSE endpoint
  - `export const runtime = 'nodejs'`
  - `export const dynamic = 'force-dynamic'`
  - `GET` handler:
    1. `auth.api.getSession()` → 401 if no session
    2. Parse `tunerId` from params → DB lookup → 404 if not found or `deleted_at` not null
    3. Determine `tunerResource` (e.g. `"tuner0"`) from DB record index (tuner `id` relative to device — see note below)
    4. Create `ReadableStream` with `start(controller)` → call `getSignalPoller().subscribe(...)`
    5. Set `cancel(controller)` to call `getSignalPoller().unsubscribe(...)`
    6. Return `new Response(stream, { headers: { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' } })`
  - Listen to `request.signal` abort to close stream
  - **Note on tuner resource**: The `tuners.path` stores the device base URL. To map DB tuner `id` to HDHomeRun `tunerN`, query the DB for all tuners with the same `path` and use the sort-order index. See plan.md for rationale.

- [x] **T-008** `[P]` `[L]` `[DEPENDS: T-005]` — Create `apps/web/src/app/api/signal/antenna/stream/route.ts` — Antenna SSE endpoint
  - Same runtime exports as T-007
  - `GET` handler:
    1. Validate session → 401
    2. Query all active tuners from DB (`is_active = true, deleted_at IS NULL`)
    3. If no tuners → emit single `signal` event with `error: 'no-tuners'` then close stream
    4. Group tuners by `path` (device URL)
    5. For each device group: call `getSignalPoller().subscribeAll(deviceUrl, tuners, controller)`
    6. Return SSE `ReadableStream` Response
    7. On abort: unsubscribe all device subscriptions

- [x] **T-009** `[P]` `[M]` `[DEPENDS: T-005]` — Create `apps/web/src/app/api/signal/[tunerId]/tune/route.ts` — Tune channel (admin)
  > **Note**: Implemented as bonus — originally out-of-scope per product decision (Option A). No UI controls expose this route; admin-only access.
  - `POST` handler:
    1. Validate session → 401; check `role === 'admin'` → 403
    2. Parse `tunerId` → DB lookup → 404
    3. Parse body `{ guideNumber }` → 400 if missing
    4. Verify `guideNumber` exists in channels for this tuner → 404
    5. Check `getSessionManager().getActiveSessions()` for active viewers on this tuner → 409 if found and `?force` not set
    6. Send `GET {devicePath}/tuner{N}/set?channel=v{guideNumber}` with 3 s timeout
    7. Return `{ success: true, resource: "tuner0" }` on success

- [x] **T-010** `[P]` `[M]` `[DEPENDS: T-005]` — Create `apps/web/src/app/api/signal/[tunerId]/clear/route.ts` — Clear tuner (admin)
  > **Note**: Implemented as bonus — originally out-of-scope per product decision (Option A). No UI controls expose this route; admin-only access.
  - `POST` handler:
    1. Validate session → 401; check `role === 'admin'` → 403
    2. Parse `tunerId` → DB lookup → 404
    3. Send `GET {devicePath}/tuner{N}/set?channel=none` with 3 s timeout
    4. Return `{ success: true, resource: "tuner0" }` on success

- [x] **T-011** `[P]` `[M]` `[DEPENDS: T-007, T-008]` — Write route handler tests
  - `stream/route.test.ts`: mock `getSignalPoller`, verify SSE headers on 200; verify 401 on no session; verify 404 on unknown tunerId
  - `antenna/stream/route.test.ts`: verify 401; verify no-tuners event + stream close; verify multi-device subscription
  - `tune/route.test.ts`: verify 403 for viewer role; verify 409 conflict response; verify 404 for unknown channel
  - `clear/route.test.ts`: verify 403 for viewer role; verify 404 for unknown tuner
  - Mock: `auth.api.getSession`, `getDb`, `getSignalPoller`, `getSessionManager`

---

## Wave 4 — UI Components (Parallel after Wave 1; no dependency on Wave 2/3 for pure UI)

- [x] **T-012** `[P]` `[M]` `[DEPENDS: T-003]` — Create `apps/web/src/components/signal/SignalGauge.tsx`
  - Props: `label: string`, `value: number | null`, `metric: 'SS' | 'SNQ' | 'SEQ'`, `unit?: string`
  - Renders:
    - Numeric display: `{value ?? '--'}{unit ?? '%'}`
    - Color badge using `getSignalQuality()` from T-003: green/yellow/red/idle (uses text label + icon, not color alone — WCAG 1.4.1)
    - `aria-label={`${label} ${value !== null ? `${value} percent` : 'not available'}`}`
  - Export `SignalQuality` color class mapping as `const QUALITY_STYLES`

- [x] **T-013** `[P]` `[M]` `[DEPENDS: T-012]` — Write `apps/web/src/components/signal/SignalGauge.test.tsx`
  - Verify green badge renders when SEQ = 100
  - Verify yellow badge renders when SS = 55
  - Verify red badge renders when SNQ = 30
  - Verify idle/gray renders when value = null
  - Verify `aria-label` contains numeric value and "percent"
  - Verify text label not absent (not color-only)

- [x] **T-014** `[P]` `[M]` `[DEPENDS: T-001, T-003]` — Create `apps/web/src/components/signal/SignalGraph.tsx`
  - Props: `title: string`, `data: SignalDataPoint[]`, `dataKey: 'ss' | 'snq'`, `color: string`, `ariaLabel: string`
  - Wraps `recharts` `ResponsiveContainer` > `LineChart` > `Line`
  - Reads `window.matchMedia('(prefers-reduced-motion: reduce)')` in `useEffect` to disable `isAnimationActive`
  - Outer `<div role="img" aria-label={ariaLabel}>` wrapper
  - XAxis: `dataKey="timestamp"` with formatted time label; YAxis: 0–100; 60-point max (enforced by parent)
  - Displays `recharts` `Tooltip` with value + timestamp

- [x] **T-015** `[P]` `[M]` `[DEPENDS: T-014]` — Write `apps/web/src/components/signal/SignalGraph.test.tsx`
  - Verify `role="img"` attribute on wrapper
  - Verify `aria-label` prop is rendered
  - Verify animation is disabled when `prefers-reduced-motion` media query is matched (mock `matchMedia`)
  - Verify component renders without crashing with empty data array
  - Verify component renders without crashing with 60 data points

- [x] **T-016** `[P]` `[M]` `[DEPENDS: T-012, T-014]` — Create `apps/web/src/components/signal/SignalStatusCard.tsx`
  - Props: `state: TunerSignalState`
  - Renders: tuner name + current channel (or "Idle"), compact `SignalGauge` row (SS/SNQ/SEQ), two `SignalGraph` (SS + SNQ), error banner if `state.error`
  - Used exclusively by antenna page

- [x] **T-017** `[P]` `[M]` `[DEPENDS: T-003]` — Create `apps/web/src/components/signal/ProgramList.tsx` (P2)
  - Props: `programs: ParsedProgram[]`, `idle: boolean`, `tunerId: number`
  - Renders collapsible `<details>/<summary>` section: "Programs on this channel"
  - When idle: "No channel tuned"
  - When programs is empty: "No program data available"
  - For each program: program number, name, PID table (pid | codec | type columns)
  - Each program has "Watch" link → `/tuners/{tunerId}/channel/{program.programNumber}/watch` (guideNumber lookup needed — pass as prop)

- [x] **T-018** `[P]` `[M]` `[DEPENDS: T-003]` — Create `apps/web/src/components/signal/Atsc3Details.tsx` (P2)
  - Props: `plp: Atsc3PlpSseEvent | null`, `l1: Atsc3L1SseEvent | null`
  - Returns `null` when both props are null (hidden by default)
  - Renders two sub-sections: "PLP Info" (plpId, plpType, snrDb, fecType) and "L1 Signaling" (fftSize, gi, pp, l1bMod, l1dMod)
  - All fields show "—" when null

---

## Wave 5 — Pages (Parallel; depend on Wave 4 components + Wave 3 routes)

- [x] **T-019** `[P]` `[L]` `[DEPENDS: T-012, T-014, T-016, T-017, T-018, T-007]` — Create `apps/web/src/app/(protected)/tuners/[id]/signal/page.tsx` — Single-tuner signal page
  - `'use client'`
  - Page params: `{ id: string }`
  - On mount: open `EventSource('/api/signal/{id}/stream')`
  - `onmessage`/named event handlers: update `useState` for signal values + history buffer + programs + atsc3 data
  - Rolling buffer: `useRef<SignalDataPoint[]>` capped at 60 entries
  - On unmount: `eventSource.close()`
  - Renders:
    - Breadcrumb: `← Back to /tuners/{id}` | `Antenna Tuning Mode →`
    - `<h1>` {tuner name} Signal Monitor (fetched via initial `fetch('/api/tuners/{id}')` or passed via searchParams/title)
    - Three `SignalGauge` components (SS, SNQ, SEQ)
    - Two `SignalGraph` components (SS + SNQ rolling 60-point)
    - `ProgramList` (P2)
    - `Atsc3Details` (P2)
  - Error banner for device unreachable state
  - Loading skeleton while awaiting first event
  - **Note**: Tuner name can be loaded server-side if using a hybrid Server/Client component pattern; or fetched client-side from `/api/tuners/{id}`. Use client-only fetch for simplicity (aligned with spec FR-026 requiring 'use client').

- [x] **T-020** `[P]` `[L]` `[DEPENDS: T-012, T-014, T-016, T-008]` — Create `apps/web/src/app/(protected)/signal/antenna/page.tsx` — Antenna tuning mode page
  - `'use client'`
  - On mount: open `EventSource('/api/signal/antenna/stream')`
  - Maintain `useState<Record<number, TunerSignalState>>` keyed by tunerId
  - On `signal` event: upsert tuner state, append to history buffer (slice to 60)
  - On unmount: `eventSource.close()`
  - Renders:
    - `<h1>` Antenna Tuning Mode + "Exit Antenna Mode" button → `router.back()`
    - CSS grid of `SignalStatusCard` per tuner (one card per unique tunerId seen in events)
    - Empty state when no events received yet
  - Respect `prefers-reduced-motion` (passed to `SignalGraph` via context or prop drilling)

- [x] **T-021** `[S]` `[DEPENDS: T-007]` — Modify `apps/web/src/app/(protected)/tuners/[id]/page.tsx` — Add "Signal Monitor" link
  - Add `<Link href={`/tuners/${tuner.id}/signal`}><Button variant="secondary">📡 Signal Monitor</Button></Link>` in the `TunerHeader` component's action area, alongside the existing "Edit Tuner" link
  - Keep in same `flex` row as Edit button

---

## Wave 6 — Integration & Documentation

- [x] **T-022** `[P]` `[M]` `[DEPENDS: T-019, T-020, T-021]` — End-to-end manual verification checklist
  - AC-001: Verify `GET /api/signal/[tunerId]/stream` returns `Content-Type: text/event-stream`
  - AC-002: First `signal` event arrives within 3 s
  - AC-003: Events arrive ~every 2 s
  - AC-007: Gauges show `--` for idle tuner
  - AC-008: SEQ color coding (green/yellow/red at boundary values)
  - AC-009: Antenna page shows one card per active tuner
  - AC-010: "Signal Monitor" link exists on `/tuners/[id]` and navigates correctly
  - AC-011: ATSC 3.0 section hidden on ATSC 1.0 device
  - AC-013: All gauges have `aria-label` attributes
  - AC-014: Reduced-motion disables graph animation

- [x] **T-023** `[P]` `[M]` `[DEPENDS: T-019, T-020]` — Update VitePress documentation
  - Create `apps/docs/features/signal-monitoring.md` — full feature documentation
    - Overview, usage guide, signal quality thresholds table, antenna mode instructions
    - ATSC 3.0 section explanation (conditional display)
  - Update `apps/docs/features/index.md` — add Signal Monitoring to feature list
  - Verify `npm run docs:build` passes with no dead links

- [x] **T-024** `[P]` `[S]` `[DEPENDS: T-019, T-020]` — Update `README.md`
  - Add "📡 Signal Monitoring" to the feature highlights list (one line with link to docs)

- [x] **T-025** `[P]` `[S]` `[DEPENDS: all]` — Run full quality gate
  - `npm test -w @hd-homey/web` — all tests pass
  - `npm run lint -w @hd-homey/web` — zero warnings
  - `npm run build -w @hd-homey/web` — build succeeds
  - `npm run docs:build` — docs build succeeds
  - Check coverage report ≥70% on new files: `npm run test:coverage -w @hd-homey/web`

---

## Task Dependency Summary

```
T-001 (recharts install)
  └─► T-002 (types)
  └─► T-003 (parsers) ──────────────────────────────────────────────────────┐
        └─► T-004 (parser tests)                                            │
        └─► T-005 (polling manager) ──────────────────────────────────────┐│
              └─► T-006 (poller tests)                                    ││
              └─► T-007 (single-tuner stream route) ──────────────────────│┤
              └─► T-008 (antenna stream route) ───────────────────────────│┤
              └─► T-009 (tune route)                                      ││
              └─► T-010 (clear route)                                     ││
              └─► T-011 (route tests) [depends T-007, T-008]              ││
                                                                           ││
        └─► T-012 (SignalGauge) ──────────────────────────────────────────┐││
              └─► T-013 (SignalGauge tests)                               │││
        └─► T-014 (SignalGraph) ──────────────────────────────────────────┤││
              └─► T-015 (SignalGraph tests)                               │││
        └─► T-016 (SignalStatusCard) [depends T-012, T-014] ──────────────┤││
        └─► T-017 (ProgramList)                                            │││
        └─► T-018 (Atsc3Details)                                           │││
                                                                            │││
              T-019 (signal page) [depends T-012,T-014,T-016,T-017,T-018,T-007] ◄─┘││
              T-020 (antenna page) [depends T-012,T-014,T-016,T-008] ◄──────┘│
              T-021 (tuner page link) [depends T-007] ◄─────────────────────┘
                    │
                    └─► T-022 (manual verification)
                    └─► T-023 (VitePress docs)
                    └─► T-024 (README update)
                    └─► T-025 (quality gate) [depends all]
```

---

## Acceptance Criteria Cross-Reference

| AC | Task(s) |
|----|---------|
| AC-001: SSE Content-Type | T-007 |
| AC-002: First event within 3 s | T-005, T-007 |
| AC-003: Events every 2.5 s | T-005 |
| AC-004: Polling stops within 5 s | T-005, T-006 |
| AC-005: Tune returns 403 for viewer | T-009, T-011 |
| AC-006: Tune returns 404 for bad channel | T-009, T-011 |
| AC-007: Gauges show `--` when idle | T-012, T-019 |
| AC-008: SEQ color coding | T-003, T-012, T-013 |
| AC-009: Antenna mode one card per tuner | T-020 |
| AC-010: Signal Monitor link on tuner page | T-021 |
| AC-011: ATSC 3.0 section hidden on ATSC 1.0 | T-018, T-019 |
| AC-012: Parser unit tests exist and pass | T-004 |
| AC-013: ARIA labels on gauges | T-012, T-013 |
| AC-014: Reduced-motion disables animation | T-014, T-015 |
| AC-015: `/tuners/[id]/signal` shows all physical tuner slots on the device | T-026, T-027 |
| AC-016: SSE route calls `subscribeAll` instead of `subscribe` | T-026 |
| AC-017: Auto-discovered slots use negative synthetic IDs; DB slots use positive IDs | T-026 |

---

## Wave 7 — Per-Device Signal Page Refinement

- [x] **T-026** `[M]` `[DEPENDS: T-005]` — Change SSE route `/api/signal/[tunerId]/stream` from single-resource `subscribe()` to multi-slot `subscribeAll()`
  - Modify `route.ts`: instead of `resolveTuner()` returning one resource, build `tunersToTrack` from all DB records on the same device path
  - Call `poller.subscribeAll()` instead of `poller.subscribe()`
  - Update route test to expect `subscribeAll` call
  - No DB schema changes — physical slots remain in-memory via auto-discovery

- [x] **T-027** `[M]` `[DEPENDS: T-026]` — Refactor client page `/tuners/[id]/signal/page.tsx` to show all physical tuner slots
  - Change state from single-tuner (`SignalSseEvent | null`) to multi-tuner (`Record<number, TunerSignalState>`)
  - Replace `SignalGaugeRow` + `SignalGraphRow` + `ProgramList` + `Atsc3Details` with a grid of `SignalStatusCard` components (same component and layout as antenna mode)
  - Keep identical breadcrumb, page title "{tunerName} — Signal Monitor", and back button
  - Remove unused `ProgramList` and `Atsc3Details` imports (or keep them for future slot-level detail view — defer if not needed)

- [x] **T-028** `[S]` `[DEPENDS: T-026, T-027]` — Update plan and spec documentation
  - Update `specs/015-signal-monitoring/plan.md` with architecture decision (no DB table for sub-tuners)
  - Update `plan-refinement-per-device.md` if needed
  - Mark all Wave 7 tasks complete

---

## Estimated Total Effort

| Wave | Tasks | Complexity | Approx Time |
|------|-------|-----------|-------------|
| 0 — Setup | 1 | S | 30 min |
| 1 — Types & Parsers | 3 | M+L+L | 4–6 hr |
| 2 — Polling Manager | 2 | M+M | 3–4 hr |
| 3 — API Routes | 5 | L+L+M+M+M | 5–7 hr |
| 4 — UI Components | 7 | M×7 | 6–8 hr |
| 5 — Pages | 3 | L+L+S | 4–5 hr |
| 6 — Integration & Docs | 4 | M+M+S+S | 2–3 hr |
| 7 — Per-Device Signal Page | 3 | M+M+S | 2–3 hr |
| **Total** | **28** | | **~26–36 hr** |
