# Feature Specification: Signal Monitoring & Antenna Tuning

**Feature ID**: `015-signal-monitoring`  
**Created**: 2026-06-19  
**Last Updated**: 2026-06-19  
**Status**: Implemented — All 30 tasks complete  
**Owner**: HD Homey Core Team  
**Version**: 1.0  
**Dependencies**: SPEC-001 (Tuner Management), SPEC-003 (User Authentication)

---

## Overview

Signal Monitoring & Antenna Tuning adds real-time RF signal diagnostics to HD Homey, turning it from a remote-streaming tool into also a tuner installation and diagnostic tool. Users can view live signal strength (SS), SNR quality (SNQ), and symbol error quality (SEQ) for individual tuners, use an antenna tuning mode that shows all tuners simultaneously with rolling graphs, view ATSC 3.0 / NextGen TV advanced data, inspect available programs and PIDs on a tuned channel, and tune channels directly from the signal view.

Signal data is fetched from the HDHomeRun device's own HTTP API — specifically `http://{device-ip}/status.json` — using the standard `fetch()` call that already works in the HD Homey server environment. No binary protocol, no `hdhomerun_config` CLI binary, and no additional native dependencies are introduced. Real-time delivery to the browser uses Server-Sent Events (SSE) via a Next.js Route Handler returning a `ReadableStream`, which integrates naturally with the existing app-router infrastructure. Historical signal data is not persisted to the database; all graphs are computed from an in-memory rolling buffer maintained per SSE connection.

---

## User Stories

### Story 1: View Signal Status for a Single Tuner (Priority: P1)

**As a** user  
**I want** to see the current signal strength, SNR quality, and symbol quality for a specific tuner  
**So that** I can diagnose poor reception on an individual tuner without needing a separate tool

**Acceptance Criteria**:
- **Given** I am on a tuner detail page (`/tuners/[id]`), **When** I click "Signal Monitor", **Then** I navigate to `/tuners/[id]/signal`
- **Given** I am on `/tuners/[id]/signal`, **When** the page loads, **Then** I see labeled numeric gauges for Signal Strength (%), SNR Quality (%), and Symbol Quality (%) refreshed every 2 seconds
- **Given** the tuner is actively tuned to a channel, **When** I view the gauges, **Then** they reflect the live values from the device
- **Given** the tuner is idle (no channel tuned), **When** I view the gauges, **Then** they display `--` and an "Idle" indicator
- **Given** I navigate away from the page, **When** the page unmounts, **Then** the SSE connection is closed and server-side polling stops within 5 seconds

---

### Story 2: Antenna Tuning Mode — All Tuners Simultaneously (Priority: P1)

**As a** user positioning an antenna  
**I want** to see signal graphs for every tuner at the same time  
**So that** I can physically adjust my antenna while watching the response on all tuners simultaneously

**Acceptance Criteria**:
- **Given** I am on any tuner signal page, **When** I click "Antenna Tuning Mode", **Then** I navigate to `/signal/antenna`
- **Given** I am on `/signal/antenna`, **When** the page loads, **Then** I see a grid card for every configured active tuner in the system
- **Given** I am in antenna mode, **When** the page is rendering, **Then** each tuner card shows:
  - Tuner name and current channel (or "Idle")
  - Live numeric values for SS (%), SNQ (%), SEQ (%)
  - A color-coded Symbol Quality badge: green (100%), yellow (80–99%), red (<80%)
  - Two rolling line graphs: SS over the last 60 seconds, and SNQ over the last 60 seconds
- **Given** the antenna mode is running, **When** 60 seconds have passed, **Then** the oldest data point rolls off the graph and a new one is appended
- **Given** `prefers-reduced-motion` is set, **When** graphs render, **Then** animation is disabled and graphs update as static snapshots every 2 seconds
- **Given** I click "Exit Antenna Mode", **When** the navigation completes, **Then** all SSE connections are closed and I return to the previous tuner page

---

### Story 3: Signal Quality Color Coding (Priority: P1)

**As a** user  
**I want** visual indicators that immediately communicate whether my signal is good, marginal, or bad  
**So that** I don't need to memorize numeric thresholds

**Acceptance Criteria**:
- **Given** SEQ (Symbol Quality) is 100%, **When** the value is displayed, **Then** the indicator is green
- **Given** SEQ is between 80–99% inclusive, **When** the value is displayed, **Then** the indicator is yellow
- **Given** SEQ is below 80%, **When** the value is displayed, **Then** the indicator is red
- **Given** SS (Signal Strength) is above 70%, **When** the value is displayed, **Then** the indicator is green
- **Given** SS is between 40–70% inclusive, **When** the value is displayed, **Then** the indicator is yellow
- **Given** SS is below 40%, **When** the value is displayed, **Then** the indicator is red
- **Given** SNQ (Signal Quality / MER) is above 70%, **When** the value is displayed, **Then** the indicator is green
- **Given** SNQ is between 40–70% inclusive, **When** the value is displayed, **Then** the indicator is yellow
- **Given** SNQ is below 40%, **When** the value is displayed, **Then** the indicator is red
- **Given** all three values are `--` (tuner idle), **When** displayed, **Then** all indicators are gray

---

### Story 4: Program and PID Listing (Priority: P2)

**As a** user  
**I want** to see the programs and PID assignments on the currently tuned channel  
**So that** I can diagnose multi-program transport streams and understand what is being broadcast

**Acceptance Criteria**:
- **Given** I am on `/tuners/[id]/signal`, **When** the tuner is actively tuned, **Then** I see a collapsible "Programs on this channel" section below the gauges
- **Given** the tuner is tuned, **When** the program list loads, **Then** it shows for each program: program number, guide name, video PID, audio PID(s), and data PIDs (if any)
- **Given** the tuner is idle, **When** I view the program section, **Then** it shows "No channel tuned"
- **Given** the device returns program data, **When** the list renders, **Then** each entry has a "Watch" link that opens `/tuners/[id]/channel/[guideNumber]/watch` for that program
- **Given** the page is loaded, **When** program data fails to fetch, **Then** an error message "Could not load program data" is shown; signal gauges still function independently

---

### Story 5: ATSC 3.0 / NextGen TV Details (Priority: P2)

**As a** user with a NextGen TV-capable HDHomeRun device  
**I want** to see ATSC 3.0 Physical Layer Pipe (PLP) and L1 detail information  
**So that** I can verify ATSC 3.0 signal quality and debug reception issues specific to NextGen TV

**Acceptance Criteria**:
- **Given** the tuner is locked to an ATSC 3.0 channel (lock type contains "atsc3"), **When** the signal page renders, **Then** an "ATSC 3.0 Details" section is shown
- **Given** the ATSC 3.0 section is shown, **When** PLP data is available, **Then** it displays: PLP ID, PLP Type, PLP SNR (dB), and PLP FEC Type
- **Given** the ATSC 3.0 section is shown, **When** L1 data is available, **Then** it displays: FFT Size, Guard Interval, Pilot Pattern, L1-Basic Modulation, and L1-Detail Modulation
- **Given** the device does not return ATSC 3.0 data (ATSC 1.0 or DVB lock), **When** the signal page renders, **Then** the ATSC 3.0 section is not shown
- **Given** the tuner lock type is unknown or idle, **When** rendering, **Then** ATSC 3.0 section is hidden

---

### Story 6: Signal Page Link from Tuner Detail (Priority: P1)

**As a** user  
**I want** a clear entry point to the signal monitor from the existing tuner detail page  
**So that** I can find signal diagnostics without searching menus

**Acceptance Criteria**:
- **Given** I am on `/tuners/[id]`, **When** the page renders, **Then** I see a "Signal Monitor" button or link in the tuner action area
- **Given** I am on `/tuners/[id]/signal`, **When** the page renders, **Then** I see a breadcrumb or back link to `/tuners/[id]`
- **Given** I am on `/signal/antenna`, **When** the page renders, **Then** I see a global "Antenna Mode" nav link accessible from any signal page

---

## Functional Requirements

### Signal Data Retrieval

- **FR-001**: System MUST fetch signal data by calling `http://{device-ip}/status.json` via `fetch()` on the server — not by shelling out to `hdhomerun_config` or any CLI binary
- **FR-002**: The `/status.json` endpoint returns a JSON array with one object per tuner slot; each active slot includes `Resource`, `SignalStrengthPercent`, `SignalQualityPercent`, `SymbolQualityPercent`, `VctName`, `VctNumber`, and `Frequency`; inactive slots contain only `Resource`
- **FR-003**: System MUST parse `SignalStrengthPercent` (SS), `SignalQualityPercent` (SNQ), and `SymbolQualityPercent` (SEQ) as 0–100 integer values from the JSON response
- **FR-004**: System MUST determine whether a tuner is idle by checking for the absence of `VctName` or `VctNumber` fields in the tuner's entry in the array
- **FR-005**: System MUST poll the device's `/status.json` endpoint every 2 seconds while an active SSE connection is open; polling MUST stop within 5 seconds of all SSE clients disconnecting from a given tuner endpoint
- **FR-006**: System MUST NOT poll any device's status endpoint when no client is actively subscribed to that device's signal feed

### Program and Stream Info

- **FR-007**: System MUST fetch stream info by calling `http://{device-ip}/tuner{N}/streaminfo` (plain text) to retrieve program/PID data for the currently tuned channel
- **FR-008**: The `/tuner{N}/streaminfo` plain-text response lists PIDs in the format `<pid>: <type> <program>` (e.g., `481: mpeg2video v 1`, `482: ac3 a 1 0x81`); System MUST parse this into structured program/PID objects
- **FR-009**: System MUST re-fetch streaminfo whenever the tuned channel changes (detected by a change in `VctNumber` in the status response)
- **FR-010**: Program/PID data MUST be fetched server-side and delivered to the client via the same SSE stream as signal metrics, as a distinct event type `streaminfo`

### ATSC 3.0 Details

- **FR-011**: System MUST check whether the `Resource` entry's `lock` field (from the device status or debug endpoint) contains the substring `"atsc3"` to detect ATSC 3.0 channels
- **FR-012**: System MUST fetch ATSC 3.0 PLP data from `http://{device-ip}/tuner{N}/atsc3/plpinfo` when an ATSC 3.0 channel is locked; this endpoint is device-optional and returns an empty response or 404 if not available
- **FR-013**: System MUST fetch ATSC 3.0 L1 data from `http://{device-ip}/tuner{N}/atsc3/l1info` when an ATSC 3.0 channel is locked; same device-optional handling applies
- **FR-014**: Both ATSC 3.0 endpoints respond with plain text in `key=value` format; System MUST parse key-value pairs into typed objects and deliver them via the SSE stream as `atsc3plp` and `atsc3l1` event types
- **FR-015**: System MUST gracefully handle 404 or connection errors from ATSC 3.0 endpoints without interrupting signal gauge delivery

### Real-Time Delivery (SSE)

- **FR-016**: System MUST implement a Next.js Route Handler at `GET /api/signal/[tunerId]/stream` that returns a `text/event-stream` Response wrapping a `ReadableStream`
- **FR-017**: The SSE stream MUST export `export const runtime = 'nodejs'` (not Edge Runtime) and `export const dynamic = 'force-dynamic'` to allow long-lived connections and prevent response buffering
- **FR-018**: The SSE stream MUST emit named events: `signal` (every 2 s with SS/SNQ/SEQ), `streaminfo` (on channel change), `atsc3plp` (on ATSC 3.0 lock change), and `atsc3l1` (on ATSC 3.0 lock change)
- **FR-019**: Each SSE event payload MUST be valid JSON conforming to the data shapes defined in the Data Requirements section
- **FR-020**: The server MUST send a `ping` event (empty data) every 30 seconds to keep the SSE connection alive through proxies and firewalls
- **FR-021**: When the client aborts the request (`request.signal` abort event), the server MUST stop the polling interval and close the `ReadableStream` controller
- **FR-022**: System MUST implement a Route Handler at `GET /api/signal/antenna/stream` that fans out `signal` events for **all** active tuners across all configured devices, emitting per-tuner objects in a single stream with a `tunerId` field in each event payload
- **FR-023**: The antenna stream MUST handle partial device failures gracefully: if one device is unreachable, its tuners emit `{ error: "unreachable" }` while other devices continue normally

### UI Pages

- **FR-024**: System MUST add a `/tuners/[id]/signal` page (Next.js App Router, under `(protected)`) that renders the single-tuner signal view
- **FR-025**: System MUST add a `/signal/antenna` page (Next.js App Router, under `(protected)`) that renders the multi-tuner antenna view
- **FR-026**: Both pages MUST be client components (using `'use client'`) because they manage SSE `EventSource` connections and live graph state
- **FR-027**: The single-tuner signal page MUST display a "Signal Monitor" button on the existing `/tuners/[id]` page; implementation MUST modify `apps/web/src/app/(protected)/tuners/[id]/page.tsx` to add this link
- **FR-028**: Rolling graphs MUST use the `recharts` library for chart rendering (add as a dependency if not already present); each graph MUST display a maximum of 60 data points (one per 2-second poll cycle = 120 seconds)

---

## Non-Functional Requirements

- **NFR-001**: Performance — SSE endpoint MUST stream the first `signal` event within 3 seconds of connection
- **NFR-002**: Performance — Signal gauge updates MUST appear in the browser within 500 ms of the server receiving the device response (net round-trip budget: 2000 ms poll + 500 ms delivery)
- **NFR-003**: Resource Usage — Each open SSE connection to `/api/signal/[tunerId]/stream` MUST NOT maintain more than one concurrent polling request to the HDHomeRun device per tuner (fan-out/deduplication is handled by a server-side polling manager singleton)
- **NFR-004**: Resource Usage — The antenna mode stream (`/api/signal/antenna/stream`) MUST NOT create duplicate per-device polling when multiple clients connect; the polling manager MUST share a single poll timer per device
- **NFR-005**: Reliability — Device fetch timeouts of 3 seconds MUST be enforced; a timeout MUST emit a `signal` event with `{ error: "timeout" }` rather than dropping the SSE connection
- **NFR-006**: Security — All signal API routes MUST require an authenticated session (enforced by the existing proxy at `src/proxy.ts`); no additional auth work is needed for read-only signal routes
- **NFR-007**: Security — Channel tuning endpoints (`/api/signal/[tunerId]/tune`, `/api/signal/[tunerId]/clear`) MUST additionally require admin role checked server-side in the route handler
- **NFR-008**: Accessibility — Signal gauge values MUST have ARIA labels; e.g., `aria-label="Signal Strength 83 percent"` — not just visual color coding
- **NFR-009**: Accessibility — Color-coded indicators MUST also have text labels or icons so the information is not conveyed by color alone (WCAG 1.4.1)
- **NFR-010**: Accessibility — Graphs MUST have `role="img"` and an `aria-label` summarizing the current value for screen readers
- **NFR-011**: Compatibility — Antenna mode graphs MUST respect `prefers-reduced-motion` by disabling CSS transitions and animation when the media query matches
- **NFR-012**: Compatibility — The feature MUST work on HDHomeRun Connect, Extend, Flex, and Quatro (ATSC 1.0) models; ATSC 3.0 sections degrade gracefully on older hardware
- **NFR-013**: Compatibility — DVB-T/T2 devices (EU models) return the same `/status.json` structure with the same field names; the signal gauges MUST work identically; ATSC 3.0 section is simply never shown
- **NFR-014**: Testing — All server-side signal parsing logic (status.json parser, streaminfo parser, ATSC 3.0 parser, SSE event formatting) MUST have unit tests with mocked device responses; minimum 70% coverage on new code
- **NFR-015**: No new environment variables are introduced by this feature
- **NFR-016**: No new database tables or migrations are required; all signal data is ephemeral in-memory

---

## Data Requirements

### HDHomeRun Device API Contracts

#### `GET http://{device-ip}/status.json`

Returns a JSON array with one entry per tuner slot:

```json
[
  {
    "Resource": "tuner0",
    "VctNumber": "5.1",
    "VctName": "KPIX",
    "Frequency": 695000000,
    "SignalStrengthPercent": 83,
    "SignalQualityPercent": 90,
    "SymbolQualityPercent": 100
  },
  {
    "Resource": "tuner1"
  }
]
```

Active tuner fields:
- `Resource` (string): always present, e.g. `"tuner0"`
- `VctNumber` (string, optional): virtual channel number, e.g. `"5.1"`
- `VctName` (string, optional): channel guide name, e.g. `"KPIX"`
- `Frequency` (number, optional): RF frequency in Hz
- `SignalStrengthPercent` (number, 0–100): raw signal power level
- `SignalQualityPercent` (number, 0–100): MER / SNR quality
- `SymbolQualityPercent` (number, 0–100): symbol error quality (100% = no errors)

#### `GET http://{device-ip}/tuner{N}/streaminfo`

Returns plain text with one PID entry per line:

```
481: mpeg2video v 1
482: ac3 a 1 0x81
483: ac3 a 1 0x82
484: data 1 0x100
```

Format per line: `{pid}: {codec} {type} {program} [{extra}]`
- `type`: `v` = video, `a` = audio, `d` = data

#### `GET http://{device-ip}/tuner{N}/atsc3/plpinfo` (optional)

Returns plain text `key=value` pairs:
```
plpid=0
plptype=1
snr=32.5
fectype=ldpc
```

#### `GET http://{device-ip}/tuner{N}/atsc3/l1info` (optional)

Returns plain text `key=value` pairs:
```
fftsize=16K
gi=1/192
pp=PP4
l1bmod=bpsk
l1dmod=qam16
```

---

### SSE Event Payload Shapes (TypeScript)

```typescript
/** Emitted every 2 seconds while SSE connection is open */
interface SignalEvent {
  event: 'signal';
  tunerId: number;           // DB tuner record ID (from HD Homey's tuners table)
  resource: string;          // "tuner0", "tuner1", etc.
  idle: boolean;             // true when VctNumber absent from status.json
  vctNumber?: string;        // e.g. "5.1"
  vctName?: string;          // e.g. "KPIX"
  ss: number | null;         // SignalStrengthPercent, null when idle
  snq: number | null;        // SignalQualityPercent, null when idle
  seq: number | null;        // SymbolQualityPercent, null when idle
  timestamp: number;         // Unix ms (Date.now())
  error?: 'timeout' | 'unreachable';  // Present on fetch failure
}

/** Emitted when VctNumber changes or on first lock */
interface StreamInfoEvent {
  event: 'streaminfo';
  tunerId: number;
  programs: ProgramInfo[];
}

interface ProgramInfo {
  programNumber: number;
  name: string;             // From VctName if available, else empty string
  pids: PidInfo[];
}

interface PidInfo {
  pid: number;              // decimal PID value
  codec: string;            // e.g. "mpeg2video", "ac3", "data"
  type: 'video' | 'audio' | 'data' | 'other';
  program: number;          // program number this PID belongs to
}

/** Emitted when ATSC 3.0 lock detected, or null fields when lock released */
interface Atsc3PlpEvent {
  event: 'atsc3plp';
  tunerId: number;
  plpId: number | null;
  plpType: number | null;
  snrDb: number | null;     // float, e.g. 32.5
  fecType: string | null;   // e.g. "ldpc"
}

interface Atsc3L1Event {
  event: 'atsc3l1';
  tunerId: number;
  fftSize: string | null;   // e.g. "16K"
  gi: string | null;        // e.g. "1/192"
  pp: string | null;        // e.g. "PP4"
  l1bMod: string | null;    // e.g. "bpsk"
  l1dMod: string | null;    // e.g. "qam16"
}

/** Keepalive, no data */
interface PingEvent {
  event: 'ping';
}
```

---

### TypeScript Types to Add to `apps/web/src/lib/hdhr/types.ts`

```typescript
/** Raw entry from HDHomeRun /status.json array */
export interface TunerStatusEntry {
  Resource: string;
  VctNumber?: string;
  VctName?: string;
  Frequency?: number;
  SignalStrengthPercent?: number;
  SignalQualityPercent?: number;
  SymbolQualityPercent?: number;
}

/** Parsed PID entry from /tuner{N}/streaminfo plain text */
export interface StreamInfoPid {
  pid: number;
  codec: string;
  type: 'video' | 'audio' | 'data' | 'other';
  program: number;
}

/** Parsed ATSC 3.0 PLP entry from /tuner{N}/atsc3/plpinfo plain text */
export interface Atsc3PlpInfo {
  plpId: number | null;
  plpType: number | null;
  snrDb: number | null;
  fecType: string | null;
}

/** Parsed ATSC 3.0 L1 entry from /tuner{N}/atsc3/l1info plain text */
export interface Atsc3L1Info {
  fftSize: string | null;
  gi: string | null;
  pp: string | null;
  l1bMod: string | null;
  l1dMod: string | null;
}
```

---

## Page & Route Structure

```
apps/web/src/
├── app/
│   ├── (protected)/
│   │   ├── tuners/
│   │   │   └── [id]/
│   │   │       ├── page.tsx              # MODIFIED: add "Signal Monitor" link
│   │   │       └── signal/
│   │   │           └── page.tsx          # NEW: single-tuner signal view (client component)
│   │   └── signal/
│   │       └── antenna/
│   │           └── page.tsx              # NEW: antenna tuning mode (client component)
│   └── api/
│       └── signal/
│           ├── [tunerId]/
│           │   ├── stream/
│           │   │   └── route.ts          # NEW: SSE stream for single tuner
│           │   ├── tune/
│           │   │   └── route.ts          # NEW: POST tune channel
│           │   └── clear/
│           │       └── route.ts          # NEW: POST clear/release tuner
│           └── antenna/
│               └── stream/
│                   └── route.ts          # NEW: SSE stream for all tuners
└── lib/
    └── hdhr/
        ├── types.ts                      # MODIFIED: add new types above
        ├── tuner.ts                      # MODIFIED: add getSignalStatus(), getStreamInfo(), atsc3 methods
        └── signal-poller.ts              # NEW: singleton polling manager
```

---

## Technical Constraints

- **Pure HTTP**: Signal data MUST be fetched via standard `fetch()` from the device's `/status.json` endpoint on port 80 (the same base address used for `/lineup.json`).
- **No WebSocket**: Real-time delivery uses SSE (Server-Sent Events) via Next.js Route Handler `ReadableStream`. This is simpler than WebSocket, requires no additional library (no socket.io), and is natively supported by browsers via `EventSource`. WebSocket is explicitly out of scope.
- **Node.js Runtime**: SSE route handlers must export `export const runtime = 'nodejs'` to avoid Edge Runtime 30-second timeout. This is consistent with the existing transcoding routes.
- **Recharts for charting**: Rolling line graphs MUST use the `recharts` library. Add `recharts` to the workspace dependencies if not already present.
- **Polling Manager Singleton**: The server-side polling manager MUST be implemented as a Node.js module-level singleton (standard Next.js module caching in the server runtime) that tracks active device polls by `{deviceIp}` and fan-outs to SSE clients. This prevents N device requests for N browser tabs.
- **Drizzle/DB access**: Signal pages need to look up tuner device IPs. Use `getDb()` in server-side helper functions. The SSE route handlers run server-side (Node.js runtime) so database access is fine.
- **No transactions**: Do not use transactions for any operations in this feature (consistent with project-wide constraint).

---

## Edge Cases & Error Handling

### Device Unreachable

- **Scenario**: The HDHomeRun device goes offline while the signal page is open
- **Handling**: The `fetch()` call will reject; the polling manager catches the error and emits `{ error: "unreachable" }` in the next `signal` event; the UI shows "Device unreachable — retrying..." and continues polling every 2 seconds; when the device comes back, normal events resume automatically

### Fetch Timeout

- **Scenario**: Device is on network but responds slowly (e.g., > 3 seconds)
- **Handling**: Use `AbortController` with 3-second timeout on each device fetch; emit `{ error: "timeout" }` on timeout; do not drop the SSE connection

### Tuner Idle (No Channel Tuned)

- **Scenario**: All tuners on the device are idle (no active streams, no manually tuned channel)
- **Handling**: `status.json` returns objects with only `Resource`; signal page shows `--` with gray indicators; graph receives no data points (graph flatlines at 0 or shows empty); program/PID section shows "No channel tuned"

### Channel Tuning Conflict

- **Scenario**: User tries to re-tune a tuner that is actively serving a stream to other viewers
- **Handling**: The `/api/signal/[tunerId]/tune` route checks the in-memory transcoding session registry (from SPEC-005); if active viewers > 0, returns HTTP 409 with `{ conflict: true, viewers: N }`; the client shows a modal: "This will interrupt N viewer(s). Continue?" — if confirmed, re-sends the same request with `?force=true` query param; the route then proceeds with tuning

### ATSC 3.0 Endpoints Absent

- **Scenario**: Device does not have `/tuner{N}/atsc3/plpinfo` (e.g., older firmware or ATSC 1.0 device)
- **Handling**: `fetch()` returns 404 or network error; polling manager emits no `atsc3plp` or `atsc3l1` events; client never shows the ATSC 3.0 section (hidden by default, shown only when events arrive)

### Multiple Browser Tabs in Antenna Mode

- **Scenario**: Two browser windows open `/signal/antenna` simultaneously
- **Handling**: Each tab opens its own SSE connection to `/api/signal/antenna/stream`; the polling manager recognizes all device IPs are already being polled, increments subscriber counts, and fans out to both connections; device polling does NOT double up; when the first tab closes, the subscriber count decrements but polling continues for the second tab

### streaminfo Parse Failure

- **Scenario**: Device returns malformed or empty `streaminfo` response
- **Handling**: Parse function catches errors and returns an empty `programs: []` array; a `streaminfo` event with empty programs is emitted; UI shows "No program data available" in the programs section; signal gauges are unaffected

### Antenna Mode with Zero Active Tuners

- **Scenario**: All configured tuners are on unreachable devices or no tuners are configured
- **Handling**: The `/api/signal/antenna/stream` still opens successfully; for each unreachable device it emits error events; if `tuners` table is empty, the SSE stream emits a single `signal` event with `{ error: "no-tuners" }` and then closes

---

## Acceptance Criteria Summary

The following are specific, binary-testable pass/fail criteria:

- **AC-001**: `GET /api/signal/[tunerId]/stream` returns `Content-Type: text/event-stream` with status 200 for an authenticated user
- **AC-002**: Within 3 seconds of opening the SSE stream, at least one `signal` event arrives
- **AC-003**: `signal` events arrive at least every 2.5 seconds (2 s poll + 500 ms delivery margin)
- **AC-004**: When the browser closes the SSE connection, the server-side polling interval stops within 5 seconds (verified by server log)
- **AC-005**: `POST /api/signal/[tunerId]/tune` from a viewer-role user returns HTTP 403
- **AC-006**: `POST /api/signal/[tunerId]/tune` with a non-existent guide number returns HTTP 404
- **AC-007**: Signal gauges display `--` when tuner is idle (no `VctNumber` in `status.json`)
- **AC-008**: SEQ = 100 renders green badge; SEQ = 50 renders yellow badge; SEQ = 30 renders red badge
- **AC-009**: Antenna mode page shows one card per active tuner in the `tuners` database table
- **AC-010**: The "Signal Monitor" link exists on `/tuners/[id]` and navigates to `/tuners/[id]/signal`
- **AC-011**: ATSC 3.0 section is hidden when the lock string does not contain `"atsc3"`
- **AC-012**: Unit tests for `parseStatusJson()`, `parseStreamInfo()`, `parseAtsc3Plp()`, and `parseAtsc3L1()` exist and pass
- **AC-013**: All gauges have `aria-label` attributes with human-readable values
- **AC-014**: With `prefers-reduced-motion: reduce` media query active, rolling graph animations are disabled

---

## Out of Scope

Explicitly excluded from this feature:

- ❌ **Historical signal data storage** — No database tables for signal history; all rolling graph data is ephemeral in the browser memory
- ❌ **Signal-based alerts or notifications** — No alert thresholds, no email/push notifications when signal drops
- ❌ **Scheduled channel scanning from signal view** — Channel scanning is already handled by SPEC-002
- ❌ **DVB-T/T2 specific channel maps or frequency displays** — EU devices work with the same signal gauges but no special DVB UI is added
- ❌ **Signal quality graphs stored in database** — Rolling graph data lives only in the `EventSource` client's memory
- ❌ **WebSocket infrastructure** — SSE is used instead; no socket.io or ws package
- ❌ **Embedded video player on the signal page** — Watch links navigate to the existing watch page (SPEC-005)
- ❌ **HDHomeRun device web UI embedding** — No iframe of the device's own web interface
- ❌ **Signal-based tuner auto-selection** — Auto-routing streams to the tuner with the best signal
- ❌ **dBm/dB unit conversion** — Values are displayed as % (0–100) as returned by the device; no conversion to dBm/dBmV is performed because the conversion factor varies by device model

---

## Success Criteria

### Measurable Outcomes

- **SC-001**: Signal gauges update within 500 ms of receiving a device response in 95th percentile
- **SC-002**: Antenna tuning mode shows zero duplicate device polls when 3+ tabs are open simultaneously (verified by server-side poll counter log)
- **SC-003**: Feature works on HDHomeRun Connect 4 (2-tuner ATSC 1.0) and HDHomeRun Flex 4K (ATSC 3.0) hardware
- **SC-004**: All new code passes ESLint with zero warnings
- **SC-005**: Test coverage ≥ 70% for all new files in `src/lib/hdhr/` and `src/app/api/signal/`

### User Validation

- [ ] Signal gauges tested on at least one physical HDHomeRun device
- [ ] Antenna tuning mode used during actual antenna positioning exercise
- [ ] Program/PID listing verified against a known multi-program transport stream
- [ ] ATSC 3.0 section verified on a NextGen TV-capable device (or marked "not tested" if hardware unavailable)

---

## Dependencies

**Depends On**:
- **SPEC-001** (Tuner Management) — `tuners` database table provides device addresses (`path`) and the tuner DB `id`; the tuner detail page (`/tuners/[id]`) is modified to add Signal Monitor link
- **SPEC-003** (User Authentication) — Session-based authentication enforced by proxy

**Does Not Block**:
- No other planned specs depend on Signal Monitoring

**Related To**:
- **SPEC-002** (Channel Streaming) — Channel list context aids understanding of which channels the signal is being measured on
- **SPEC-007** (Tuner Autodiscovery) — Discovered devices' IP addresses are the same base URL used here

---

## References

- HDHomeRun HTTP Development Guide: https://info.hdhomerun.com/info/http_api
- HDHomeRun Signal & Quality Fields: https://info.hdhomerun.com/info/hdhomerun_config (`/tuner/status` and signal interpretation)
- Signal Strength Interpretation Guide: https://info.hdhomerun.com/info/troubleshooting:signal_strength_quality
- Reference implementation (uses `hdhomerun_config` CLI — our approach uses HTTP REST instead): https://github.com/Petelombardo/hdhomerunsignal
- `status.json` field names discovered via: https://github.com/hjdhjd/prismcast/blob/main/src/hdhr/discover.ts
- Next.js SSE Route Handler pattern: https://nextjs.org/docs/app/guides/streaming#streaming-in-route-handlers
- Next.js SSE real-time guide: https://damianhodgkiss.com/tutorials/real-time-updates-sse-nextjs
- Related specs:
  - `.specify/features/001-tuner-management.md`
  - `.specify/features/002-channel-streaming.md`
  - `.specify/features/005-video-transcoding.md`
  - `.specify/features/007-tuner-autodiscovery.md`

---

## Clarifications Applied

All design decisions below were resolved during the specification phase (no `[NEEDS CLARIFICATION]` markers remain).

| Decision | Resolution | Rationale |
|---|---|---|
| HTTP polling vs WebSocket vs SSE? | **SSE via Next.js Route Handler ReadableStream** | SSE is natively supported by browsers; no library needed; Next.js App Router has first-class SSE support; WebSocket would require socket.io or `ws` (new dependency, violates Principle I); polling from client is simpler but adds client-side timer complexity |
| Store historical signal data? | **No — ephemeral in-memory rolling buffer only** | Signal history has no business value beyond live antenna alignment; storing it would add migration, schema changes, and write load for no persistent benefit; constitution Principle I (Simplicity) and Principle V (Data Integrity — don't store ephemeral data) |
| Antenna mode: separate page or modal? | **Separate page at `/signal/antenna`** | A separate page is bookmarkable, has its own URL, and integrates naturally with Next.js routing; a modal would make the antenna view inaccessible from direct URL navigation and is harder to implement accessibly |
| Minimum viable set vs stretch goals? | **P1 = signal gauges + antenna mode + color coding + entry point; P2 = program/PID listing + ATSC 3.0** | P1 items deliver core antenna-alignment value; P2 items add diagnostic depth |
| Multi-region (ATSC vs DVB-T/T2)? | **Single unified implementation; ATSC 3.0 section conditionally displayed; DVB devices work identically for gauges** | `status.json` field names are the same on US and EU devices; ATSC 3.0 endpoints simply return 404 on EU devices; no special DVB-specific UI paths needed |
| dBm/dB conversions? | **Not implemented; percentages only** | The dBm conversion factor (80% ≈ −12 dBmV) varies by device model and antenna input impedance; official SiliconDust guidance is to use % for alignment decisions; conversion would add complexity and potential user confusion |
| Signal data source: HTTP REST vs `hdhomerun_config` binary? | **HTTP REST only (`/status.json` on port 80)** | `hdhomerun_config` is a CLI binary requiring separate installation and native execution; HD Homey is a pure Node.js/Next.js app; the `/status.json` endpoint provides identical data via standard `fetch()`; no native binary dependency |
| Chart library? | **Use `recharts` library** | Recharts is a well-known React charting library that simplifies building rolling line graphs; approved product decision |

---

**Version**: 1.0 | **Created**: 2026-06-19 | **Status**: Implemented — 2026-06-19

*Specification complete. All 25 tasks implemented and tested.*
