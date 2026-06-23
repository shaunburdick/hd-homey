# API Contracts: Signal Monitoring & Antenna Tuning

**Feature**: SPEC-015  
**Version**: 1.0  
**Created**: 2026-06-19

---

## 1. GET `/api/signal/[tunerId]/stream`

### Purpose
Returns a Server-Sent Events (SSE) stream delivering real-time signal data for a single HDHomeRun tuner.

### Authentication
Requires an authenticated session. Enforced by `src/proxy.ts` at the Edge Runtime level. The route handler also validates the session via `auth.api.getSession()` as a defense-in-depth measure.

### Runtime Exports
```typescript
export const runtime = 'nodejs';        // Long-lived connection; Edge Runtime has 30s timeout
export const dynamic = 'force-dynamic'; // Never cache; always fresh SSE response
```

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tunerId` | `string` | Yes | HD Homey database tuner ID (integer, coerced from string) |

### Request Headers
| Header | Required | Description |
|--------|----------|-------------|
| `Accept` | Recommended | `text/event-stream` |
| `Cookie` | Yes | Better-Auth session cookie (handled by browser/EventSource) |

### Response: 200 OK
```
Content-Type: text/event-stream
Cache-Control: no-cache, no-store, must-revalidate
Connection: keep-alive
X-Accel-Buffering: no
```

**Event stream format** (RFC 8895):

```
id: 1718750400000
event: signal
data: {"event":"signal","tunerId":1,"resource":"tuner0","idle":false,"vctNumber":"5.1","vctName":"KPIX","ss":83,"snq":90,"seq":100,"timestamp":1718750400000}

id: 1718750402000
event: signal
data: {"event":"signal","tunerId":1,"resource":"tuner0","idle":false,"vctNumber":"5.1","vctName":"KPIX","ss":81,"snq":89,"seq":100,"timestamp":1718750402000}

event: streaminfo
data: {"event":"streaminfo","tunerId":1,"programs":[{"programNumber":1,"name":"KPIX","pids":[{"pid":481,"codec":"mpeg2video","type":"video","program":1},{"pid":482,"codec":"ac3","type":"audio","program":1}]}]}

event: atsc3plp
data: {"event":"atsc3plp","tunerId":1,"plpId":0,"plpType":1,"snrDb":32.5,"fecType":"ldpc"}

event: atsc3l1
data: {"event":"atsc3l1","tunerId":1,"fftSize":"16K","gi":"1/192","pp":"PP4","l1bMod":"bpsk","l1dMod":"qam16"}

event: ping
data: 

```

**Idle tuner example:**
```
event: signal
data: {"event":"signal","tunerId":1,"resource":"tuner0","idle":true,"ss":null,"snq":null,"seq":null,"timestamp":1718750400000}

```

**Device error example:**
```
event: signal
data: {"event":"signal","tunerId":1,"resource":"tuner0","idle":false,"ss":null,"snq":null,"seq":null,"timestamp":1718750402000,"error":"timeout"}

```

### Error Responses

| Status | Body | Condition |
|--------|------|-----------|
| 401 | `Unauthorized` | No valid session |
| 404 | `Tuner not found` | `tunerId` not in DB or `deleted_at` not null |
| 500 | `Internal server error` | Unexpected server error during setup |

### Connection Lifecycle
1. Browser opens `EventSource('/api/signal/[tunerId]/stream')`
2. Server validates session, looks up tuner, registers SSE subscriber
3. Server emits `signal` events every 2 s; `ping` every 30 s
4. On `streaminfo` changes: emits `streaminfo` event
5. On ATSC 3.0 lock: emits `atsc3plp` + `atsc3l1` events
6. On browser close / navigate away: `request.signal` abort fires → server unregisters subscriber → interval cleared (if no remaining subscribers)

---

## 2. GET `/api/signal/antenna/stream`

### Purpose
Returns an SSE stream delivering real-time signal data for **all** active tuners across all configured HDHomeRun devices. Used by the Antenna Tuning Mode page.

### Authentication
Same as single-tuner stream. Session required.

### Runtime Exports
```typescript
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
```

### Request Parameters
None.

### Response: 200 OK
Same headers as single-tuner stream.

**Event stream format** — same event types, but each `signal` event includes all active tuners' data identified by `tunerId`:

```
event: signal
data: {"event":"signal","tunerId":1,"resource":"tuner0","idle":false,"vctNumber":"5.1","vctName":"KPIX","ss":83,"snq":90,"seq":100,"timestamp":1718750400000}

event: signal
data: {"event":"signal","tunerId":2,"resource":"tuner0","idle":true,"ss":null,"snq":null,"seq":null,"timestamp":1718750400000}

event: signal
data: {"event":"signal","tunerId":1,"resource":"tuner1","idle":false,"vctNumber":"7.1","vctName":"KQED","ss":71,"snq":85,"seq":100,"timestamp":1718750400000}

event: ping
data: 

```

**Partial device failure:**
```
event: signal
data: {"event":"signal","tunerId":3,"resource":"tuner0","idle":false,"ss":null,"snq":null,"seq":null,"timestamp":1718750402000,"error":"unreachable"}

```

**No tuners configured:**
```
event: signal
data: {"event":"signal","tunerId":-1,"resource":"","idle":true,"ss":null,"snq":null,"seq":null,"timestamp":1718750400000,"error":"no-tuners"}

```
_(Stream closes after this event.)_

### Error Responses
| Status | Body | Condition |
|--------|------|-----------|
| 401 | `Unauthorized` | No valid session |
| 500 | `Internal server error` | Unexpected error during setup |

---

## 3. POST `/api/signal/[tunerId]/tune`

### Purpose
Commands the HDHomeRun device to tune a specific tuner to a channel. **Admin only.**

### Authentication
Session required **and** `session.user.role === 'admin'`. Returns 403 for viewer-role users.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tunerId` | `string` | Yes | HD Homey database tuner ID |

### Query Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `force` | `boolean` | No | When `true`, override viewer conflict check |

### Request Body (`application/json`)
```json
{
  "guideNumber": "5.1"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `guideNumber` | `string` | Yes | Virtual channel number to tune (e.g. `"5.1"`) |

### Response: 200 OK
```json
{ "success": true, "resource": "tuner0" }
```

### Error Responses
| Status | Body | Condition |
|--------|------|-----------|
| 400 | `{ "error": "Missing guideNumber" }` | Body missing `guideNumber` |
| 403 | `Forbidden` | User is not admin |
| 404 | `{ "error": "Tuner not found" }` | `tunerId` not in DB |
| 404 | `{ "error": "Channel not found" }` | `guideNumber` not in channels table for this tuner |
| 409 | `{ "conflict": true, "viewers": 2 }` | Active transcoding viewers; use `?force=true` to override |
| 500 | `{ "error": "Internal server error" }` | Device unreachable or unexpected error |

---

## 4. POST `/api/signal/[tunerId]/clear`

### Purpose
Commands the HDHomeRun device to clear/release the currently tuned channel on a specific tuner. **Admin only.**

### Authentication
Session required **and** `session.user.role === 'admin'`.

### Path Parameters
| Parameter | Type | Required | Description |
|-----------|------|----------|-------------|
| `tunerId` | `string` | Yes | HD Homey database tuner ID |

### Request Body
None required.

### Response: 200 OK
```json
{ "success": true, "resource": "tuner0" }
```

### Error Responses
| Status | Body | Condition |
|--------|------|-----------|
| 403 | `Forbidden` | User is not admin |
| 404 | `{ "error": "Tuner not found" }` | `tunerId` not in DB |
| 500 | `{ "error": "Internal server error" }` | Device unreachable or unexpected error |

---

## 5. SSE Event Payload Schemas

### 5.1 `signal` event

```json
{
  "event": "signal",
  "tunerId": 1,
  "resource": "tuner0",
  "idle": false,
  "vctNumber": "5.1",
  "vctName": "KPIX",
  "ss": 83,
  "snq": 90,
  "seq": 100,
  "timestamp": 1718750400000
}
```

**Fields:**
| Field | Type | Nullable | Description |
|-------|------|----------|-------------|
| `event` | `"signal"` | No | Event type discriminator |
| `tunerId` | `number` | No | HD Homey DB tuner ID |
| `resource` | `string` | No | E.g. `"tuner0"` |
| `idle` | `boolean` | No | True when no channel tuned |
| `vctNumber` | `string` | Yes (undefined) | Virtual channel number |
| `vctName` | `string` | Yes (undefined) | Channel guide name |
| `ss` | `number \| null` | Yes | Signal strength 0–100 |
| `snq` | `number \| null` | Yes | SNR quality 0–100 |
| `seq` | `number \| null` | Yes | Symbol quality 0–100 |
| `timestamp` | `number` | No | Unix ms |
| `error` | `"timeout" \| "unreachable" \| "no-tuners"` | Yes (undefined) | Error type |

### 5.2 `streaminfo` event

```json
{
  "event": "streaminfo",
  "tunerId": 1,
  "programs": [
    {
      "programNumber": 1,
      "name": "KPIX",
      "pids": [
        { "pid": 481, "codec": "mpeg2video", "type": "video", "program": 1 },
        { "pid": 482, "codec": "ac3", "type": "audio", "program": 1 },
        { "pid": 483, "codec": "ac3", "type": "audio", "program": 1 }
      ]
    }
  ]
}
```

### 5.3 `atsc3plp` event

```json
{
  "event": "atsc3plp",
  "tunerId": 1,
  "plpId": 0,
  "plpType": 1,
  "snrDb": 32.5,
  "fecType": "ldpc"
}
```

### 5.4 `atsc3l1` event

```json
{
  "event": "atsc3l1",
  "tunerId": 1,
  "fftSize": "16K",
  "gi": "1/192",
  "pp": "PP4",
  "l1bMod": "bpsk",
  "l1dMod": "qam16"
}
```

### 5.5 `ping` event

SSE wire format (no JSON body):
```
event: ping
data: 

```

---

## 6. Color Threshold Contract

The following thresholds are the canonical source of truth for color-coded indicators. They are defined as constants in `src/lib/hdhr/signal-parsers.ts` and must be used by both server-side event generation and client-side rendering.

| Metric | Green | Yellow | Red |
|--------|-------|--------|-----|
| **SS** (Signal Strength) | > 70% | 40–70% (inclusive) | < 40% |
| **SNQ** (Signal Quality / MER) | > 70% | 40–70% (inclusive) | < 40% |
| **SEQ** (Symbol Quality) | = 100% | 80–99% (inclusive) | < 80% |

**When idle / null**: All indicators display as `idle` (gray).

---

## 7. HDHomeRun Device Endpoint Reference

These endpoints are called **server-side only** by `signal-poller.ts`. The device base URL comes from the `tuners.path` database field.

| Endpoint | Method | Response Type | Description |
|----------|--------|---------------|-------------|
| `{path}/status.json` | GET | `application/json` | Array of TunerStatusEntry per slot |
| `{path}/tuner{N}/status` | GET | `text/plain` (key=value) | Single tuner lock/signal status |
| `{path}/tuner{N}/streaminfo` | GET | `text/plain` (lines) | PID/program listing |
| `{path}/tuner{N}/atsc3/plpinfo` | GET | `text/plain` (key=value) | ATSC 3.0 PLP data (device-optional) |
| `{path}/tuner{N}/atsc3/l1info` | GET | `text/plain` (key=value) | ATSC 3.0 L1 signaling (device-optional) |
| `{path}/tuner{N}/set?channel={ch}` | GET | `text/plain` | Tune to channel (used by tune route) |
| `{path}/tuner{N}/set?channel=none` | GET | `text/plain` | Clear/release tuner |

**Timeout**: All device fetches use `AbortController` with a 3 000 ms timeout (NFR-005).

**Error handling**: `fetch()` rejection (network unreachable) → emit `{ error: "unreachable" }`; AbortController timeout → emit `{ error: "timeout" }`.
