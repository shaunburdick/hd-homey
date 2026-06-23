# Plan Refinement: Native TCP Protocol Integration

**Feature**: SPEC-015 — Signal Monitoring & Antenna Tuning  
**Date**: 2026-06-20  
**Research**: `research-native-protocol.md`

---

## Summary

Implement a **pure TypeScript HDHomeRun native protocol client** (TCP port 65001) to unlock two data sources unavailable via HTTP on newer devices:

1. **`streaminfo`** — Program/PID listing (404 on FLEX 4K+ via HTTP; always works via native)
2. **`debug`** — Transport stream diagnostics (bps, transport errors, CRC errors, missed packets)

The approach is zero-dependency: inline CRC32, Node.js `net` module for TCP, and Buffer APIs for binary encoding/decoding. No changes to Dockerfile, package.json, or CI.

---

## Architecture Decision

### Native Protocol as Fallback, Not Replacement

The existing HTTP polling path remains the primary channel. The native protocol fills gaps:

```
For streaminfo:
  1. Try HTTP GET /tuner{N}/streaminfo
  2. If 2xx → parse and dispatch (existing path)
  3. If 404 → try native TCP get /tuner{N}/streaminfo (NEW)
  4. If native fails → try lineup.json fallback (existing path)

For debug data:
  1. On each poll cycle for active tuners → native TCP get /tuner{N}/debug (NEW)
  2. Parse and dispatch as new SSE event type
```

### Connection Model

Simple request-response per query, no persistent connections:

- Open TCP socket to `{ip}:65001`
- Send 4-byte header + TLV payload + CRC32
- Read response header (4 bytes) → payload length → read N bytes → verify CRC32
- Parse TLV response payload for value tag or error tag
- Close socket

Timeout: 2500 ms (matching libhdhomerun defaults)

---

## New/Modified Files

| File | Status | Description |
|------|--------|-------------|
| `apps/web/src/lib/hdhr/native-protocol.ts` | **NEW** | TLV encode/decode, packet framing, `nativeGet()` client (uses `zlib.crc32()` built-in from Node 22) |
| `apps/web/src/lib/hdhr/signal-parsers.ts` | Modified | Add `parseDebugStatus()` parser |
| `apps/web/src/lib/hdhr/signal-poller.ts` | Modified | Wire native fallback in `dispatchStreamInfoIfChanged`; add debug polling |
| `apps/web/src/lib/hdhr/signal-poller.test.ts` | Modified | Integration tests for native protocol path |
| `apps/web/src/lib/hdhr/native-protocol.test.ts` | **NEW** | Protocol encoding/decoding + TCP mock tests |

---

## Tasks

### T-031 — CRC32 implementation (`crc32.ts`)
- Inline table-driven CRC32/ISO-HDLC (polynomial 0xEDB88320)
- One export: `function crc32(data: Buffer): number` (returns uint32)
- ~15 lines, zero dependencies, fully typed

### T-032 — TLV packet encoder/decoder (`native-protocol.ts`)
- `encodeGetRequest(variable: string): Buffer` — encodes a get-request packet (type 0x0004, TLV payload with GETSET_NAME tag, CRC32 footer)
- `decodeResponse(data: Buffer): { value?: string; error?: string }` — parses response packet (type 0x0005), extracts GETSET_VALUE or ERROR_MESSAGE tag, verifies CRC32
- Handle variable-length encoding (1 or 2 bytes per TLV length field)
- Gracefully skip unknown tags (do NOT throw)
- Max packet buffer: 1460 bytes (`HDHOMERUN_MAX_PACKET_SIZE`)

### T-033 — TCP get client (`nativeGet` in `native-protocol.ts`)
- `async function nativeGet(deviceIp: string, variable: string, timeoutMs?: number): Promise<string>`
- Opens TCP connection to `{deviceIp}:65001`
- Sends encoded request, reads response with framing (accumulate until full header + payload + CRC received)
- Default timeout: 2500 ms
- Returns the value string on success
- Throws typed `NativeProtocolError` on: connect timeout, read timeout, CRC mismatch, device error response, connection refused

### T-034 — Debug status parser (`signal-parsers.ts`)
- `function parseDebugStatus(rawText: string): DebugStatus`
- Parses the multi-line format:
  ```
  tun: ch=auto:33 lock=atsc1-t ss=83 snq=90 seq=100 dbg=22081-6930
  dev: resync=0 overflow=0
  ts:  bps=38809216 ut=94 te=0 miss=0 crc=0
  flt: bps=38809216
  net: pps=0 err=0 stop=0
  ```
- Export `DebugSseEvent` type
- Return structured object with all fields

### T-035 — Wire native fallback into `signal-poller.ts`
- In `dispatchStreamInfoIfChanged`, after HTTP 404 (the `!response.ok` branch), before lineup fallback:
  1. Try `nativeGet(deviceUrl.hostname, '/tuner{N}/streaminfo')`
  2. If successful: parse with existing `parseStreamInfo()` + `groupStreamInfoByProgram()`, dispatch SSE
  3. If native fails: proceed to existing `tryLineupFallback()` as before
- Add new SSE event type `debug` and dispatch on each poll cycle for active tuners
- Extract hostname from `deviceUrl` (strip protocol/port) for native TCP

### T-036 — Unit tests for protocol (`native-protocol.test.ts`)
- CRC32: known byte sequences from libhdhomerun test vectors
- `encodeGetRequest`: verify packet bytes against known-good encoding
- `decodeResponse`: test value response, error response, CRC mismatch, truncated data
- `nativeGet`: mock TCP socket to simulate device responses; test success, timeout, connection refused, CRC mismatch

### T-037 — Integration tests for polling manager (`signal-poller.test.ts`)
- Update existing streaminfo-404 tests to verify native protocol is attempted first
- Mock `nativeGet` to return valid streaminfo → verify SSE dispatch
- When native also fails → verify lineup fallback still works

### T-038 — Update documentation
- Update `plan.md` with native protocol architecture
- Update `research-native-protocol.md` status to "Used"
- Mark all new tasks complete in `tasks.md`
