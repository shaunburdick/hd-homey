# Implementation Plan: Signal Monitoring & Antenna Tuning

**Feature**: SPEC-015 — Signal Monitoring & Antenna Tuning  
**Branch**: `signal-monitor`  
**Plan Version**: 1.0  
**Created**: 2026-06-19  
**Spec Reference**: `.specify/features/015-signal-monitoring.md`

---

## Constitution Alignment

| Principle | Alignment |
|-----------|-----------|
| **I. Simplicity First** | No new dependencies beyond `recharts`. No new DB tables. No WebSocket. Polling manager re-uses the existing singleton module pattern from `session-manager.ts`. |
| **II. User Experience** | Gauges update every 2 s; first event arrives within 3 s of opening the SSE stream. Color coding gives instant signal quality feedback. Antenna mode displays all tuners simultaneously. |
| **III. Code Quality** | TypeScript strict mode throughout; all public functions documented; ≥70% test coverage on new lib code; zero `any` types. |
| **IV. Security by Default** | All signal routes are under `(protected)` or validated via `auth.api.getSession()`; tune/clear admin routes additionally require `role === 'admin'` checked server-side. |
| **V. Data Integrity** | No new database tables or migrations; all signal data is ephemeral in-memory (rolling 60-point buffer on the client). |
| **VI. Development Workflow** | Spec-driven; Docker-compatible (Node.js runtime, no binary deps); tests with Vitest. |

**Anti-pattern checks:**
- ✅ No transactions used
- ✅ No `any` types
- ✅ `dynamic = 'force-dynamic'` on all SSE route handlers
- ✅ Device IPs never exposed to the client (server proxies all HDHR calls)
- ✅ `export const runtime = 'nodejs'` on SSE routes (not Edge)

---

## Architecture Overview

### High-Level Data Flow

```
Browser (EventSource)
        │
        │  GET /api/signal/[tunerId]/stream   (or /antenna/stream)
        │  text/event-stream (SSE)
        ▼
Next.js Route Handler (Node.js runtime)
   ├── Looks up tuner record from DB → gets device IP (tuner.path)
   ├── Calls getSignalPoller(deviceIp)    ← singleton
   │         │
   │         │  registers SSE client (subscriber)
   │         │
   │         └─ PollingManager (module-level singleton)
   │               │
   │               │  setInterval(2 s) — deduplicated per device IP
   │               │
   │               ▼
   │          fetch(`http://{device-ip}/status.json`, { signal: AbortController })
   │          fetch(`http://{device-ip}/tuner{N}/streaminfo`)    [on channel change]
   │          fetch(`http://{device-ip}/tuner{N}/atsc3/plpinfo`) [if ATSC 3.0]
   │          fetch(`http://{device-ip}/tuner{N}/atsc3/l1info`)  [if ATSC 3.0]
   │               │
   │               └─ parses responses → dispatches to all registered SSE controllers
   │
   └── ReadableStream controller
           │
           │  'signal' event (every 2 s)
           │  'streaminfo' event (on channel change)
           │  'atsc3plp' event (on ATSC 3.0 lock change)
           │  'atsc3l1' event (on ATSC 3.0 lock change)
           │  'ping' event (every 30 s)
           │
           ▼
Browser receives SSE events
   ├── updates SS/SNQ/SEQ gauge state
   ├── appends to 60-point rolling buffer → recharts LineChart
   ├── renders PID listing (on 'streaminfo')
   └── renders ATSC 3.0 details (on 'atsc3plp'/'atsc3l1')
```

### Polling Manager: Deduplication Strategy

The `SignalPollingManager` module-level singleton maintains a `Map<deviceIp, DevicePollEntry>` where each entry contains:

- One `setInterval` timer running the device poll loop
- A `Map<subscriberId, ReadableStreamDefaultController>` of active SSE clients
- The last known `VctNumber` per tuner resource (for streaminfo change detection)

When a second browser tab connects to the same device, it receives the same polling fanout — no duplicate device requests. When all tabs disconnect, the interval is cleared.

For the antenna stream (`/api/signal/antenna/stream`), a single SSE connection subscribes to **all** device IPs found in the `tuners` DB table, receiving merged signal events with a `tunerId` discriminator.

---

## New Files to Create

```
apps/web/src/
├── lib/hdhr/
│   ├── signal-poller.ts           # Singleton polling manager
│   ├── signal-parsers.ts          # Pure parsing functions (testable)
│   └── types.ts                   # MODIFIED — add new signal types
├── app/api/signal/
│   ├── [tunerId]/
│   │   ├── stream/route.ts        # SSE: single-tuner signal stream
│   │   ├── tune/route.ts          # POST: tune channel (admin)
│   │   └── clear/route.ts         # POST: clear/release tuner (admin)
│   └── antenna/
│       └── stream/route.ts        # SSE: all-tuners antenna stream
├── app/(protected)/
│   ├── tuners/[id]/signal/
│   │   └── page.tsx               # Single-tuner signal view
│   └── signal/antenna/
│       └── page.tsx               # Multi-tuner antenna tuning mode
└── components/signal/
    ├── SignalGauge.tsx             # Numeric gauge with color badge + ARIA
    ├── SignalGauge.test.tsx
    ├── SignalGraph.tsx             # recharts LineChart wrapper (60-point rolling)
    ├── SignalGraph.test.tsx
    ├── SignalStatusCard.tsx        # Tuner card used in antenna mode
    ├── ProgramList.tsx             # Collapsible P2 PID/program listing
    └── Atsc3Details.tsx            # P2 conditional ATSC 3.0 section
```

## Files to Modify

```
apps/web/src/
├── lib/hdhr/types.ts                   # Add TunerStatusEntry, StreamInfoPid, Atsc3PlpInfo, Atsc3L1Info
└── app/(protected)/tuners/[id]/page.tsx # Add "Signal Monitor" button link
```

---

## Component Tree

### `/tuners/[id]/signal` — Single-Tuner Signal Page

```
page.tsx ('use client')
└── PageContainer
    ├── <breadcrumb> ← Back to /tuners/[id]
    │   └── Link to /signal/antenna ("Antenna Tuning Mode →")
    ├── <h1> {tuner.name} — Signal Monitor
    ├── SignalGaugeRow
    │   ├── SignalGauge label="Signal Strength" value={ss} unit="%" ariaLabel="Signal Strength N percent"
    │   ├── SignalGauge label="SNR Quality"      value={snq} unit="%"
    │   └── SignalGauge label="Symbol Quality"   value={seq} unit="%" (drives color badge)
    ├── [P2] ProgramList programs={programs} idle={idle}
    └── [P2] Atsc3Details plp={atsc3plp} l1={atsc3l1} (hidden when no events received)
```

### `/signal/antenna` — Antenna Tuning Mode Page

```
page.tsx ('use client')
└── PageContainer
    ├── <header>
    │   ├── <h1> Antenna Tuning Mode
    │   └── Button "Exit Antenna Mode" → router.back()
    └── <grid>
        └── SignalStatusCard × N (one per active tuner)
            ├── <h3> {tuner.name}  |  {vctName ?? 'Idle'}
            ├── SignalGauge SS + SNQ + SEQ (compact row)
            ├── SignalGraph title="Signal Strength" data={ssBuffer} color="steelblue"
            └── SignalGraph title="SNR Quality"     data={snqBuffer} color="mediumseagreen"
```

---

## SSE Event Flow Detail

```
Client opens EventSource('/api/signal/[tunerId]/stream')
    │
    ▼  [Server]
Route Handler
  1. Validate session (auth.api.getSession) → 401 if not logged in
  2. Parse tunerId from params → look up tuner record in DB
  3. Call getSignalPoller().subscribe(deviceIp, tunerResource, controller)
  4. Return ReadableStream Response with Content-Type: text/event-stream

  [Every 2 s — inside polling manager]
  5. fetch status.json with 3 s AbortController timeout
  6. Parse TunerStatusEntry for this resource
  7. Build SignalSseEvent → enqueue to ReadableStream controller
  8. If VctNumber changed → fetch streaminfo → parse → emit 'streaminfo' event
  9. If lock contains 'atsc3' → fetch plpinfo + l1info → emit 'atsc3plp' + 'atsc3l1' events
  [Every 30 s]
 10. Emit 'ping' event (keepalive)

  [On request.signal abort]
 11. getSignalPoller().unsubscribe(deviceIp, tunerResource, subscriberId)
 12. If subscriber count drops to 0 → clearInterval(timer)
 13. controller.close()
```

### SSE Wire Format (RFC 8895)

```
id: <timestamp_ms>
event: signal
data: {"tunerId":1,"resource":"tuner0","idle":false,"ss":83,"snq":90,"seq":100,"timestamp":1718750400000}

event: streaminfo
data: {"tunerId":1,"programs":[{"programNumber":1,"name":"KPIX","pids":[...]}]}

event: atsc3plp
data: {"tunerId":1,"plpId":0,"plpType":1,"snrDb":32.5,"fecType":"ldpc"}

event: atsc3l1
data: {"tunerId":1,"fftSize":"16K","gi":"1/192","pp":"PP4","l1bMod":"bpsk","l1dMod":"qam16"}

event: ping
data: 

```

---

## Route Design

### API Routes

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/signal/[tunerId]/stream` | Session | SSE stream for single tuner |
| GET | `/api/signal/antenna/stream` | Session | SSE stream for all tuners |
| POST | `/api/signal/[tunerId]/tune` | Admin | Tune tuner to channel (P2 edge case) |
| POST | `/api/signal/[tunerId]/clear` | Admin | Clear/release tuner |

### Page Routes

| Path | Type | Description |
|------|------|-------------|
| `/tuners/[id]/signal` | Client Component | Single-tuner signal gauges + P2 sections |
| `/signal/antenna` | Client Component | Multi-tuner antenna mode with rolling graphs |

---

## Key Technical Decisions

### 1. Signal Parsers as Pure Functions in Separate Module

`signal-parsers.ts` contains only pure, side-effect-free functions: `parseStatusJson()`, `parseStreamInfo()`, `parseAtsc3Plp()`, `parseAtsc3L1()`, and `formatSseEvent()`. This makes them trivially testable with mocked string/object inputs. The polling manager imports and calls them but owns none of the parsing logic.

**Rationale**: Aligns with Constitution Principle III (testable code). Pure functions are easiest to cover at 70%+ without integration tests.

### 2. Module-Level Singleton for Polling Manager

`signal-poller.ts` exports `getSignalPoller()` which returns a module-level singleton `SignalPollingManager` instance — the same pattern as `getSessionManager()` in `transcoding/session-manager.ts`. Next.js module caching in Node.js runtime ensures the same instance is reused across concurrent requests.

**Rationale**: Prevents N polls for N browser tabs (NFR-003/NFR-004). Consistent with existing codebase patterns.

### 3. Separate `signal-parsers.ts` from `signal-poller.ts`

Parsing logic and polling orchestration are separate concerns. The poller is harder to unit test (I/O-heavy); the parsers are pure functions. This split keeps each file focused and keeps test complexity low.

### 4. Client-Side Rolling Buffer (60 × 2 s = 120 s)

The spec says "60 data points" and "60 seconds" — these are reconciled by the spec's FR-028: "a maximum of 60 data points (one per 2-second poll cycle = 120 seconds)". We implement a 60-point rolling buffer (`useRef<SignalDataPoint[]>`) in the client component, capping at 60 entries via `.slice(-60)`.

**Note**: The spec text says both "60 seconds" (Story 2 AC) and "120 seconds" (FR-028). We follow FR-028 (60 points × 2 s = 120 s window) as the more precise technical requirement.

### 5. recharts `LineChart` with `isAnimationActive={!prefersReducedMotion}`

We use `window.matchMedia('(prefers-reduced-motion: reduce)')` in a `useEffect` to read the user's motion preference on mount, storing it in component state. This value is passed to recharts' `isAnimationActive` prop to satisfy NFR-011.

### 6. Tune/Clear Routes Scoped to Admin, Conflict Check via TranscodingSessionManager

The `/api/signal/[tunerId]/tune` route checks `session.user.role === 'admin'` server-side (NFR-007). It queries `getSessionManager().getActiveSessions()` to detect viewer conflicts before sending the tune command to the device.

### 7. ATSC 3.0 Lock Detection via `Resource` Field

The spec references a `lock` field (FR-011) but the `status.json` payload (FR-002) only shows `Resource`, `VctNumber`, etc. The lock type information is available from a separate device endpoint `/tuner{N}/status` (plain text `key=value`). We fetch this alongside `status.json` as part of the per-tuner status fetch when ATSC 3.0 detection is needed. The lock field check for `"atsc3"` substring is done server-side in the poller.

---

## Library Addition: recharts

`recharts` is not currently in the workspace. It must be added:

```bash
npm install recharts -w @hd-homey/web
```

**Version**: recharts `^2.15` (latest stable as of 2026-06)  
**Bundle impact**: Recharts is a peer-dependency consumer of React/ReactDOM (already present). Tree-shaking will include only the `LineChart`, `Line`, `XAxis`, `YAxis`, `ResponsiveContainer`, and `Tooltip` components we need.  
**Alternative considered**: Chart.js — rejected because recharts has native React 19 support and is spec-mandated.

---

## Accessibility Implementation

Per NFR-008/009/010/011:

1. **SignalGauge**: Each gauge renders `<span aria-label="Signal Strength 83 percent">83%</span>` plus a colored text label (not just color) for WCAG 1.4.1.
2. **SignalGraph**: `<div role="img" aria-label="Signal Strength rolling graph, current value: 83%">` wraps the recharts component.
3. **Color badges**: Include icon + label text, not just color class, e.g. `● Good (83%)` where `●` is colored.
4. **Reduced motion**: `isAnimationActive` set to `false` via `prefers-reduced-motion` media query check.

---

## Per-Device Signal Page — All Physical Tuner Slots

**Added**: Wave 7 (2026-06-19) — see `plan-refinement-per-device.md` for the full rationale.

### Problem

The `/tuners/[id]/signal` page originally subscribed to a single physical slot (`tuner0`) because the SSE route called `poller.subscribe()` with one resource. Users with multi-slot devices (2 or 4 tuners per box) could not see all their tuners on one page.

### Architecture Decision: No New Database Table

Physical tuner slots are **not** stored in the database. They are discovered at runtime from the device's `/status.json` endpoint and tracked in-memory by the `SignalPollingManager`.

| Consideration | DB Table | In-Memory (chosen) |
|---|---|---|
| Data accuracy | Stale on firmware change | Self-correcting — reads device every 2 s |
| Sync complexity | Insert/delete/update needed | Zero — device is source of truth |
| Migration required | Yes | No |
| Runtime cost | DB read per cycle | Already fetched every 2 s |
| Simplicity (Const. I) | ❌ More moving parts | ✅ Zero new infrastructure |

The existing `autoDiscoverTuners()` method in `SignalPollingManager` already handles this — it iterates `/status.json` entries, detects untracked resources, assigns synthetic negative IDs, and emits events for all of them.

### Changes (Wave 7)

- **`route.ts`** — Changed `poller.subscribe()` → `poller.subscribeAll()`. The route now builds `tunersToTrack` from all DB records sharing the same `tuner.path` (device URL), ordering them by ascending `id` to assign stable `tuner0`, `tuner1`, … resource indices.
- **`page.tsx`** — Refactored from single-tuner state (`SignalSseEvent | null`) to multi-tuner state (`Record<number, TunerSignalState>`) and replaced the `SignalGaugeRow` + `SignalGraphRow` + `ProgramList` + `Atsc3Details` layout with a CSS grid of `SignalStatusCard` components (identical to the antenna page).
- **Test** — Updated route test assertion from `poller.subscribe` to `poller.subscribeAll` and added argument verification.

### Synthetic ID Convention

- DB-backed tuner slots → positive integer id (stable across restarts)
- Auto-discovered slots → synthetic negative ids (`-1`, `-2`, …) assigned by the poller (ephemeral — reset on server restart)
- The UI treats both identically; display names are derived from the `resource` field (e.g. `"tuner2"` → `"Tuner 2"`)

---

## Testing Strategy

Per NFR-014 and AC-012:

- **Unit tests** (Vitest, no DOM): `signal-parsers.test.ts` — test all four parser functions with sample device responses, including error/empty cases.
- **Component tests** (React Testing Library): `SignalGauge.test.tsx` — verify correct color class for threshold values; verify `aria-label` text.
- **Component tests**: `SignalGraph.test.tsx` — verify `role="img"` present; verify reduced-motion disables animation.
- **Route handler tests** (Vitest with mocked fetch): `stream/route.test.ts` — verify SSE response headers; verify auth rejection; verify `subscribeAll` call with correct arguments; mock polling manager.

Target: ≥70% coverage on all new files in `src/lib/hdhr/` and `src/app/api/signal/`.
