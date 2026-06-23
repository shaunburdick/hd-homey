# Data Model: Signal Monitoring & Antenna Tuning

**Feature**: SPEC-015  
**Version**: 1.0  
**Created**: 2026-06-19

This document defines all TypeScript types and interfaces for this feature. Types prefixed with `Tuner*` or `Atsc3*` are device-facing (raw API response shapes); types suffixed `Event` are SSE payloads; types suffixed `DataPoint` are client-side graph buffer entries.

---

## 1. HDHomeRun Device API Response Types

These types represent the raw JSON/text responses from the HDHomeRun device HTTP API. They are added to `apps/web/src/lib/hdhr/types.ts`.

### 1.1 `TunerStatusEntry` — `/status.json` array element

```typescript
/**
 * Raw entry from HDHomeRun /status.json array.
 *
 * An active tuner includes all optional fields.
 * An idle tuner contains only `Resource`.
 *
 * Example (active):
 *   { Resource: "tuner0", VctNumber: "5.1", VctName: "KPIX",
 *     Frequency: 695000000, SignalStrengthPercent: 83,
 *     SignalQualityPercent: 90, SymbolQualityPercent: 100 }
 *
 * Example (idle):
 *   { Resource: "tuner1" }
 */
export interface TunerStatusEntry {
  /** Always present. E.g. "tuner0", "tuner1" */
  Resource: string;
  /** Virtual channel number. E.g. "5.1". Absent when idle. */
  VctNumber?: string;
  /** Guide name. E.g. "KPIX". Absent when idle. */
  VctName?: string;
  /** RF frequency in Hz. E.g. 695000000. Absent when idle. */
  Frequency?: number;
  /** Signal power level as integer 0–100. Absent when idle. */
  SignalStrengthPercent?: number;
  /** MER / SNR quality as integer 0–100. Absent when idle. */
  SignalQualityPercent?: number;
  /** Symbol error quality as integer 0–100. Absent when idle. */
  SymbolQualityPercent?: number;
}
```

### 1.2 `TunerStatusResponse` — full `/status.json` payload

```typescript
/**
 * Full response from HDHomeRun /status.json — an array of per-slot entries.
 * Index position corresponds to tuner slot number.
 */
export type TunerStatusResponse = TunerStatusEntry[];
```

### 1.3 `StreamInfoPid` — parsed PID entry from `/tuner{N}/streaminfo`

```typescript
/**
 * Parsed PID entry from /tuner{N}/streaminfo plain-text response.
 *
 * Raw line format: `{pid}: {codec} {type} {program} [{extra}]`
 * Example raw lines:
 *   "481: mpeg2video v 1"
 *   "482: ac3 a 1 0x81"
 *   "483: ac3 a 1 0x82"
 *   "484: data 1 0x100"     ← note: no 'a'/'v' type token on data lines
 */
export interface StreamInfoPid {
  /** Decimal PID value. E.g. 481 */
  pid: number;
  /** Codec string. E.g. "mpeg2video", "ac3", "data", "mpeg4aac" */
  codec: string;
  /** Normalized PID type */
  type: 'video' | 'audio' | 'data' | 'other';
  /** Program number this PID belongs to */
  program: number;
}
```

### 1.4 `ParsedStreamInfo` — grouped by program

```typescript
/**
 * Stream info parsed and grouped by program number.
 * One entry per MPEG program found in the transport stream.
 */
export interface ParsedProgram {
  /** MPEG program number */
  programNumber: number;
  /** Program name from VctName (passed in externally, may be empty string) */
  name: string;
  /** All PIDs belonging to this program */
  pids: StreamInfoPid[];
}
```

### 1.5 `Atsc3PlpInfo` — parsed from `/tuner{N}/atsc3/plpinfo`

```typescript
/**
 * Parsed ATSC 3.0 PLP (Physical Layer Pipe) entry.
 *
 * Raw key=value format:
 *   plpid=0
 *   plptype=1
 *   snr=32.5
 *   fectype=ldpc
 *
 * All fields are null when not present or on parse error.
 */
export interface Atsc3PlpInfo {
  /** PLP identifier (integer) */
  plpId: number | null;
  /** PLP type code (integer) */
  plpType: number | null;
  /** Signal-to-noise ratio in dB (float) */
  snrDb: number | null;
  /** Forward error correction type. E.g. "ldpc" */
  fecType: string | null;
}
```

### 1.6 `Atsc3L1Info` — parsed from `/tuner{N}/atsc3/l1info`

```typescript
/**
 * Parsed ATSC 3.0 L1 signaling data.
 *
 * Raw key=value format:
 *   fftsize=16K
 *   gi=1/192
 *   pp=PP4
 *   l1bmod=bpsk
 *   l1dmod=qam16
 *
 * All fields are null when not present or on parse error.
 */
export interface Atsc3L1Info {
  /** FFT size. E.g. "16K", "32K" */
  fftSize: string | null;
  /** Guard interval. E.g. "1/192", "1/64" */
  gi: string | null;
  /** Pilot pattern. E.g. "PP4" */
  pp: string | null;
  /** L1-Basic modulation scheme. E.g. "bpsk" */
  l1bMod: string | null;
  /** L1-Detail modulation scheme. E.g. "qam16" */
  l1dMod: string | null;
}
```

### 1.7 `TunerLockStatus` — from `/tuner{N}/status` plain text

```typescript
/**
 * Parsed tuner lock status from /tuner{N}/status plain-text response.
 * Used to detect ATSC 3.0 lock (lock field contains "atsc3").
 *
 * Raw key=value format:
 *   lock=atsc3-t2
 *   ss=83
 *   snq=90
 *   seq=100
 *   bps=18974560
 *   pps=71
 */
export interface TunerLockStatus {
  /** Lock type string. E.g. "atsc3-t2", "atsc1-t", "none". */
  lock: string | null;
  /** Signal strength percent. Redundant with status.json, used as fallback. */
  ss: number | null;
  /** SNR quality percent */
  snq: number | null;
  /** Symbol quality percent */
  seq: number | null;
}
```

---

## 2. SSE Event Payload Types

These are the JSON payloads sent inside SSE `data:` lines. They are defined in `apps/web/src/lib/hdhr/signal-parsers.ts` and consumed by client components.

### 2.1 `SignalSseEvent` — `event: signal` (every 2 s)

```typescript
/**
 * Emitted every 2 seconds per tuner while the SSE connection is open.
 * `idle: true` when the tuner has no channel tuned (VctNumber absent).
 * `error` is present only when the device fetch failed.
 */
export interface SignalSseEvent {
  /** Discriminator for SSE event multiplexing */
  event: 'signal';
  /** HD Homey database tuner ID */
  tunerId: number;
  /** HDHomeRun resource name. E.g. "tuner0" */
  resource: string;
  /** True when tuner has no active channel tuned */
  idle: boolean;
  /** Virtual channel number. E.g. "5.1". Undefined when idle. */
  vctNumber?: string;
  /** Channel guide name. E.g. "KPIX". Undefined when idle. */
  vctName?: string;
  /** Signal strength percent (0–100). Null when idle or on error. */
  ss: number | null;
  /** SNR quality percent (0–100). Null when idle or on error. */
  snq: number | null;
  /** Symbol quality percent (0–100). Null when idle or on error. */
  seq: number | null;
  /** Unix timestamp in milliseconds */
  timestamp: number;
  /** Present on device fetch failure */
  error?: 'timeout' | 'unreachable' | 'no-tuners';
}
```

### 2.2 `StreamInfoSseEvent` — `event: streaminfo`

```typescript
/**
 * Emitted when the tuned channel changes (VctNumber change detected)
 * or on first channel lock. Programs array is empty when no data available.
 */
export interface StreamInfoSseEvent {
  event: 'streaminfo';
  tunerId: number;
  programs: ParsedProgram[];
}
```

### 2.3 `Atsc3PlpSseEvent` — `event: atsc3plp`

```typescript
/**
 * Emitted when ATSC 3.0 lock is detected (lock string contains "atsc3").
 * All fields are null when the lock is released.
 */
export interface Atsc3PlpSseEvent {
  event: 'atsc3plp';
  tunerId: number;
  plpId: number | null;
  plpType: number | null;
  snrDb: number | null;
  fecType: string | null;
}
```

### 2.4 `Atsc3L1SseEvent` — `event: atsc3l1`

```typescript
/**
 * Emitted alongside atsc3plp when ATSC 3.0 lock is detected.
 */
export interface Atsc3L1SseEvent {
  event: 'atsc3l1';
  tunerId: number;
  fftSize: string | null;
  gi: string | null;
  pp: string | null;
  l1bMod: string | null;
  l1dMod: string | null;
}
```

### 2.5 `PingSseEvent` — `event: ping`

```typescript
/**
 * Keepalive event emitted every 30 seconds.
 * Prevents proxy/load-balancer idle connection timeouts.
 */
export interface PingSseEvent {
  event: 'ping';
}
```

### 2.6 Union type for all SSE events

```typescript
/**
 * Discriminated union of all SSE event payloads from /api/signal/* endpoints.
 */
export type SignalStreamEvent =
  | SignalSseEvent
  | StreamInfoSseEvent
  | Atsc3PlpSseEvent
  | Atsc3L1SseEvent
  | PingSseEvent;
```

---

## 3. Client-Side State Types

Defined in or near the client page components.

### 3.1 `SignalDataPoint` — recharts graph buffer entry

```typescript
/**
 * Single data point in the 60-entry rolling graph buffer.
 * Used as recharts data array element.
 */
export interface SignalDataPoint {
  /** Unix ms timestamp — used as recharts XAxis dataKey */
  timestamp: number;
  /** Signal strength percent (0–100), or null if idle/error */
  ss: number | null;
  /** SNR quality percent (0–100), or null if idle/error */
  snq: number | null;
}
```

### 3.2 `TunerSignalState` — per-tuner state in antenna mode

```typescript
/**
 * Live state for a single tuner as rendered in antenna mode.
 * Managed in a `useRef<Map<tunerId, TunerSignalState>>` or
 * `useState<Record<number, TunerSignalState>>` in the antenna page.
 */
export interface TunerSignalState {
  tunerId: number;
  tunerName: string;
  resource: string;
  idle: boolean;
  vctName?: string;
  vctNumber?: string;
  ss: number | null;
  snq: number | null;
  seq: number | null;
  /** Rolling 60-point buffer for graphs */
  history: SignalDataPoint[];
  /** Last error string if device unreachable */
  error?: string;
}
```

---

## 4. Polling Manager Internal Types

Defined in `signal-poller.ts`, not exported externally.

### 4.1 `SseSubscriber`

```typescript
/** Internal: represents one active SSE connection subscribed to a device's signal feed */
interface SseSubscriber {
  /** Unique subscriber ID (e.g. crypto.randomUUID()) */
  id: string;
  /** ReadableStream controller to enqueue SSE data */
  controller: ReadableStreamDefaultController<Uint8Array>;
  /** DB tuner ID — used to filter events in multi-tuner (antenna) subscriptions */
  tunerId: number;
  /** HDHomeRun resource name this subscriber is filtering for, or '*' for antenna (all) */
  resource: string;
}
```

### 4.2 `DevicePollEntry`

```typescript
/** Internal: tracks polling state for a single HDHomeRun device (by IP) */
interface DevicePollEntry {
  /** Device base URL. E.g. "http://192.168.1.100" */
  deviceUrl: string;
  /** Active poll interval handle */
  intervalHandle: ReturnType<typeof setInterval> | null;
  /** Active keepalive (ping) interval handle */
  pingHandle: ReturnType<typeof setInterval> | null;
  /** All SSE subscribers watching this device */
  subscribers: Map<string, SseSubscriber>;
  /** Last seen VctNumber per resource — used for streaminfo change detection */
  lastVctNumber: Map<string, string | undefined>;
  /** Last seen lock type per resource — used for ATSC 3.0 change detection */
  lastLockType: Map<string, string | null>;
}
```

---

## 5. Color Threshold Constants

Defined in `apps/web/src/lib/hdhr/signal-parsers.ts` (or a `signal-thresholds.ts` co-file):

```typescript
/**
 * Signal quality thresholds for color-coded indicators.
 * All values are integer percentages (0–100).
 */
export const SIGNAL_THRESHOLDS = {
  SS: { green: 70, yellow: 40 },   // >70 green, 40–70 yellow, <40 red
  SNQ: { green: 70, yellow: 40 },  // same scale
  SEQ: { green: 100, yellow: 80 }, // 100 green, 80–99 yellow, <80 red
} as const;

/**
 * Color quality tier — maps to CSS class names and ARIA label suffixes
 */
export type SignalQuality = 'good' | 'fair' | 'poor' | 'idle';
```

---

## 6. Validation Constraints

| Field | Type | Constraints |
|-------|------|-------------|
| `TunerStatusEntry.SignalStrengthPercent` | `number` | Integer 0–100, absent when idle |
| `TunerStatusEntry.SignalQualityPercent` | `number` | Integer 0–100, absent when idle |
| `TunerStatusEntry.SymbolQualityPercent` | `number` | Integer 0–100, absent when idle |
| `TunerStatusEntry.Frequency` | `number` | Hz, e.g. 695000000, positive integer |
| `StreamInfoPid.pid` | `number` | Positive integer, decimal |
| `Atsc3PlpInfo.snrDb` | `number` | Float, typically 0–40 |
| `SignalDataPoint` history buffer | `SignalDataPoint[]` | Max 60 entries (slice at 61) |
| Ping interval | — | 30 000 ms |
| Poll interval | — | 2 000 ms |
| Device fetch timeout | — | 3 000 ms |

---

## 7. State Transitions

### Tuner States

```
          ┌──────────────────────────────────────────┐
          │                                          │
          ▼                                          │
    [connecting]                                     │
          │                                          │
          │  First 'signal' event received           │
          ▼                                          │
     [idle]  ◄──── VctNumber absent ────────── [active]
          │                                     ▲   │
          │  VctNumber present                  │   │ VctNumber absent
          │  → emits 'streaminfo'               │   │
          └──────────────────────────────────── ┘   │
                                                     │
     [error] ◄──── device unreachable/timeout ───────┘
          │
          │  device responds again
          └──────────────────────────────────────────► [active or idle]
```
