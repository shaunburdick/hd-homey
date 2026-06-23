# Research: Native HDHomeRun TCP/UDP Protocol Integration

**Feature**: SPEC-015 — Signal Monitoring & Antenna Tuning  
**Research Date**: 2026-06-20  
**Author**: modern-architect-engineer  
**Branch**: `signal-monitor`  
**Status**: Complete — for decision-making, not implementation

---

## Executive Summary

The HDHomeRun native protocol (port 65001) is **fully documented** in the open-source `libhdhomerun` C library and is trivially implementable in pure TypeScript. A working Node.js implementation already exists (`node-hdhomerun`, ~30 GitHub stars, MIT licensed, last commit ~2015). The wire format is a simple TLV (tag-length-value) binary protocol over TCP, with an Ethernet-style CRC32 checksum. The effort to write a modern, typed, async TypeScript implementation is **well-bounded and low-risk**.

The clear recommendation is **Approach C (Pure TypeScript)** for `streaminfo` and `debug` data. This keeps HD Homey dependency-free, Docker-portable, and fully aligned with the project constitution's "Simplicity First" and "Minimal Dependencies" principles.

---

## 1. Protocol Analysis

### 1.1 Transport Layer

The HDHomeRun native protocol runs on **port 65001** and uses **both** UDP and TCP:

| Transport | Purpose |
|-----------|---------|
| **UDP port 65001** | Device discovery (broadcast/targeted) |
| **TCP port 65001** | Control protocol: get/set variable queries |

Sources: `libhdhomerun/hdhomerun_pkt.h` comments:
```c
#define HDHOMERUN_DISCOVER_UDP_PORT 65001
#define HDHOMERUN_CONTROL_TCP_PORT  65001
```

For HD Homey's use case (querying `streaminfo` and `debug` on a device whose IP is already known), **only TCP is needed**. UDP discovery is unnecessary — we already have device IPs stored in the database.

### 1.2 Wire Format

Every packet, for both discovery (UDP) and control (TCP), uses the **same binary framing**:

```
Offset  Length  Field
──────────────────────────────────────────────────────────
0       2       Packet type (big-endian uint16)
2       2       Payload length in bytes (big-endian uint16)
4       N       Payload (TLV sequence)
4+N     4       CRC32 (Ethernet-style, LITTLE-endian uint32)
```

Maximum packet size: 1460 bytes (`HDHOMERUN_MAX_PACKET_SIZE`).

#### Packet Types

| Constant | Value | Description |
|----------|-------|-------------|
| `HDHOMERUN_TYPE_DISCOVER_REQ` | `0x0002` | UDP discovery request |
| `HDHOMERUN_TYPE_DISCOVER_RPY` | `0x0003` | UDP discovery response |
| `HDHOMERUN_TYPE_GETSET_REQ`   | `0x0004` | TCP get/set request |
| `HDHOMERUN_TYPE_GETSET_RPY`   | `0x0005` | TCP get/set response |

For control queries, the request type is `0x0004` and the reply will always be `0x0005` (type + 1).

#### TLV Payload Format

The payload is a sequence of tag-length-value triples:

```
1 byte   Tag
varlen   Length (1 or 2 bytes — see below)
N bytes  Value (null-terminated string for string fields)
```

**Variable-length encoding** (from `hdhomerun_pkt.h` and `hdhomerun_pkt.c`):
- If length ≤ 127: single byte, MSB clear
- If length ≥ 128: two bytes — first byte is `(low 7 bits | 0x80)`, second byte is `(length >> 7)`

#### TLV Tags Used for Control

| Tag Constant | Value | Type | Description |
|---|---|---|---|
| `HDHOMERUN_TAG_GETSET_NAME`  | `0x03` | null-terminated string | Variable name to get/set |
| `HDHOMERUN_TAG_GETSET_VALUE` | `0x04` | null-terminated string | Value returned or set |
| `HDHOMERUN_TAG_ERROR_MESSAGE`| `0x05` | null-terminated string | Device error description |
| `HDHOMERUN_TAG_GETSET_LOCKKEY` | `0x15` | uint32 big-endian | Optional lock key for exclusive tuner access |

#### CRC32 Algorithm

The checksum is an **Ethernet-style (IEEE 802.3) CRC32** computed over all bytes from the start of the packet header to the end of the payload (everything before the checksum itself). It is appended as a **little-endian** uint32.

From `hdhomerun_pkt.c`:
```c
static uint32_t hdhomerun_pkt_calc_crc(uint8_t *start, uint8_t *end) {
    uint32_t crc = 0xFFFFFFFF;
    // ... standard CRC32/ISO-HDLC table-driven loop ...
    return crc ^ 0xFFFFFFFF;
}
```

This is the standard `crc32` algorithm (polynomial `0xEDB88320` reflected). Node.js's built-in `node:zlib` module exposes `createCRC32()` — but the standard `crc32` npm package or even a simple manual implementation will produce compatible output. The `buffer-crc32` package used by `node-hdhomerun` also works correctly.

### 1.3 Control Get Request — Complete Example

To query `/tuner0/streaminfo`:

**Request packet** (`HDHOMERUN_TYPE_GETSET_REQ = 0x0004`):
```
Bytes  Value   Description
00 01: 0x0004  Packet type: GETSET_REQ
02 03: 0x0013  Payload length: 19 bytes
04:    0x03    Tag: HDHOMERUN_TAG_GETSET_NAME
05:    0x12    Length: 18 bytes (strlen("/tuner0/streaminfo") + 1 for null)
06-17: "/tuner0/streaminfo\0"  (18 bytes, null-terminated)
18-21: <CRC32 little-endian>
```

**Response packet** (`HDHOMERUN_TYPE_GETSET_RPY = 0x0005`):
```
Contains HDHOMERUN_TAG_GETSET_VALUE (0x04) with the result string,
   OR    HDHOMERUN_TAG_ERROR_MESSAGE (0x05) on error.
```

The response value for `streaminfo` is the same plain-text format as the HTTP API (multiline, program/PID pairs), just delivered over TCP instead of HTTP.

### 1.4 Connection Handling

From `hdhomerun_control.c`:
- Connect timeout: **2500 ms**
- Send timeout: **2500 ms**
- Recv timeout: **2500 ms**
- The library connects lazily on first use and reconnects automatically if the socket drops
- Responses use a simple request-response model — no multiplexing; one pending request at a time per connection
- The library retries once on failure (2 attempts total)

### 1.5 Variables of Interest

All variables map directly to the same names used in the HTTP API and `hdhomerun_config` CLI:

| Variable | Returns | Notes |
|----------|---------|-------|
| `/tuner{N}/streaminfo` | Plain text program/PID list | The primary target — returns 404 via HTTP on FLEX 4K+ |
| `/tuner{N}/debug` | Multi-line diagnostics | `tun:`, `ts:`, `flt:`, `net:` prefixed lines with bps, te (transport errors), crc, miss counters |
| `/tuner{N}/status` | One-line signal status | Same data as `/status.json` but via native protocol |
| `/sys/model` | Device model string | Useful for capability detection |
| `/sys/features` | Newline-separated feature list | Can detect ATSC 3.0 support, channel map, etc. |

---

## 2. Existing Ecosystem Survey

### 2.1 npm Packages

#### `hdhomerun` (mharsch/node-hdhomerun)
- **npm**: `npm install hdhomerun`
- **Version**: `0.0.3` (last published ~2015)
- **GitHub**: https://github.com/mharsch/node-hdhomerun
- **Stars**: 30 | **Forks**: 9 | **License**: MIT
- **Dependencies**: Only `buffer-crc32` (one direct dep)
- **Verified working**: Referenced by at least 2 other projects (`Behinder/hdhomerun-live`, `hdhrlive`)

**What it does**: Pure JavaScript implementation of the full native control protocol (discovery via UDP, get/set via TCP). Implements the complete TLV encode/decode pipeline with CRC. The `Device.js` connects to TCP port 65001 and exposes `device.get(name, cb)` and `device.set(name, value, cb)` callbacks.

**Critical limitations**:
- No TypeScript types — would need wrapping or type declarations
- Callback-based API (not Promises/async) — workable but dated
- ~10 years without maintenance — uses `new Buffer()` (deprecated API, harmless but noisy)
- Only tested against HDHR3-US (dual tuner ATSC); no FLEX 4K confirmation
- The decode path throws `Error('unknown tag type')` for any tag not in its whitelist — this will break on newer devices that return additional tags in responses (the C library correctly skips unknown tags)

**Verdict**: Useful as a working reference implementation and proof-of-concept, but **not suitable for direct production use** in HD Homey. Would need significant modernization.

#### No other relevant npm packages found
Searching npm for `hdhomerun` returns no other packages implementing the native protocol. The HDHomeRun ecosystem in Node.js is sparse and primarily uses the HTTP API.

### 2.2 Other Node.js Projects Using the Protocol

| Project | Approach | Notes |
|---------|----------|-------|
| `anders94/tvhomerun-backend` | HTTP API only | No native protocol |
| `micahg/hdhrlive` | HTTP API + UDP discovery | Channel scan via native protocol only |
| `metaColin/HDHomeRun2XMLTV` | HTTP API only | Guide data via HTTP |
| `Behinder/hdhomerun-live` | Native protocol via `node-hdhomerun` | Abandoned, confirmed the protocol works |

### 2.3 `hdhomerun_config` Binary Distribution

The CLI binary is **widely packaged** and available in all major Linux distributions:

| Platform | Package |
|----------|---------|
| **Alpine Linux** | `apk add libhdhomerun` (includes `hdhomerun_config`) — used in the HD Homey Docker image |
| **Debian/Ubuntu** | `apt-get install hdhomerun-config` |
| **Fedora** | `dnf install hdhomerun` |
| **macOS** | `brew install libhdhomerun` |
| **Docker** | `lferrarotti74/libhdhomerun-docker` — prebuilt image (34 MB Ubuntu-based), or compile from source in Dockerfile |
| **Alpine version** | `20250815-r0` in Alpine edge community |

The Alpine package is relevant because the existing HD Homey `Dockerfile` almost certainly uses Alpine or Debian for its Node.js base. Adding `hdhomerun-config` would be a single `apk add` or `apt-get install` line.

### 2.4 Native Addons / FFI

No Node.js native addon (napi-rs, node-gyp, etc.) wrapping `libhdhomerun` was found on npm or GitHub. Building one would require original work.

---

## 3. Approach Comparison

### Approach A: `exec` hdhomerun_config CLI

**How it works**: Call `child_process.execFile('hdhomerun_config', [ip, 'get', '/tuner0/streaminfo'])` and parse stdout.

| Factor | Assessment |
|--------|-----------|
| **Implementation effort** | Trivial — ~20 lines of code for the exec + parse layer |
| **TypeScript fit** | Excellent — pure TS, no native deps, full type safety |
| **Docker complexity** | Low — add `apk add libhdhomerun` to Dockerfile (1 line) |
| **Reliability** | Moderate — subprocess spawning adds ~50–200ms overhead per call; process management needed |
| **Error handling** | Awkward — parse stderr, exit codes, and process crashes separately from application errors |
| **Testability** | Poor — requires mocking `child_process` or a real device for unit tests |
| **Compatibility** | Excellent — this is the reference tool; works on all devices and firmware versions |
| **Maintenance** | Low — piggybacks on Silicondust's maintenance of the CLI |
| **Security** | Moderate — must sanitize the device IP before passing to the shell (risk of command injection if IP comes from untrusted input, though in HD Homey the IP comes from the admin-controlled tuner config) |
| **Constitution fit** | ❌ Introduces a binary dependency on the host; violates "Minimal Dependencies" |

**Cons in detail**:
- Process spawn overhead: Each call spawns a new process (~50–200ms extra latency)
- Docker base image must include the binary (bloats image, adds build step)
- `child_process` is not available in Edge Runtime (though SSE routes explicitly use Node.js runtime)
- Parsing stdout is brittle compared to direct protocol access

---

### Approach B: Node.js FFI / napi-rs Binding

**How it works**: Write a thin Rust or C++ native addon that links against `libhdhomerun.so` and exposes `get(ip, name)` as a Node.js function.

| Factor | Assessment |
|--------|-----------|
| **Implementation effort** | Very high — write napi-rs/node-gyp bindings, set up C/Rust build chain, cross-compile for Docker |
| **TypeScript fit** | Poor during development — native addons require separate build step and must be pre-compiled for each Node.js version and platform |
| **Docker complexity** | Very high — Dockerfile needs GCC/Clang, Rust toolchain, libhdhomerun headers; multi-stage build required |
| **Reliability** | Excellent once built — native performance, no subprocess overhead |
| **Error handling** | Complex — native panics/crashes can take down the Node.js process |
| **Testability** | Very poor — native addon requires device or complex mocking |
| **Constitution fit** | ❌❌ Severe violation of "Minimal Dependencies" and "Simplicity First" |

**Verdict**: Categorically wrong for this use case. We're querying a text value from a device a few times per second over a local network — native performance provides zero meaningful benefit over pure JavaScript. The build complexity cost is enormous relative to the gain.

---

### Approach C: Pure TypeScript Implementation

**How it works**: Implement the wire protocol directly using Node.js `net.createConnection()` (TCP socket), `Buffer` APIs, and a CRC32 function.

| Factor | Assessment |
|--------|-----------|
| **Implementation effort** | **Low** — protocol is fully documented; working JS reference exists; estimated ~200–300 lines of well-commented TypeScript |
| **TypeScript fit** | Perfect — stays entirely within the existing stack; full type safety; no build steps |
| **Docker complexity** | Zero — no changes to Dockerfile whatsoever |
| **Reliability** | High — Node.js `net` sockets are production-grade; no subprocess management |
| **Error handling** | Clean — Promise-based with typed error types; socket errors surface as rejections |
| **Testability** | Excellent — can mock the TCP socket or record real packets for deterministic unit tests |
| **Compatibility** | High — protocol unchanged since 2006; works on all devices including FLEX 4K |
| **Maintenance** | Low — the native protocol is extremely stable (HDHomeRun devices have used it for 20 years) |
| **Constitution fit** | ✅ Full alignment — zero new dependencies, pure TypeScript, Node.js built-ins only |

**Cons in detail**:
- Requires implementing a CRC32 function (~15 lines, or one tiny dependency like `buffer-crc32`)
- Initial implementation requires some binary protocol work (Buffer read/write at byte offsets)
- Edge case: tag decoding needs to **skip unknown tags** gracefully (the C library does this; `node-hdhomerun` does not — important lesson learned)

---

### Approach D: HTTP Proxy / Service Sidecar

**How it works**: Run a separate Go or Python service in the same Docker container that speaks the native protocol and re-exposes the data as HTTP endpoints for the Next.js app to consume.

| Factor | Assessment |
|--------|-----------|
| **Implementation effort** | Very high — new service, IPC layer, process management, health checks, startup ordering |
| **TypeScript fit** | N/A for the sidecar; adds a foreign language to the project |
| **Docker complexity** | High — multi-process Docker container or separate compose service |
| **Reliability** | Adds a failure domain — sidecar can crash independently; need restart policies |
| **Constitution fit** | ❌ Severe complexity violation; antithetical to "Simplicity First" |

**Verdict**: Appropriate if the native protocol were extremely complex (e.g., stateful streaming), but for simple get/set queries it is massive overkill.

---

## 4. Approach Comparison Table

| Criterion | A: exec CLI | B: FFI Binding | C: Pure TypeScript | D: Sidecar |
|-----------|:-----------:|:--------------:|:------------------:|:----------:|
| Implementation effort | Low | Very High | **Low** | Very High |
| Zero new Docker deps | ❌ | ❌ | **✅** | ❌ |
| TypeScript native | ✅ | Partial | **✅** | ❌ |
| No binary deps | ❌ | ❌ | **✅** | ❌ |
| Testable without device | ❌ | ❌ | **✅** | ❌ |
| Async / non-blocking | ⚠️ subprocess | ✅ | **✅** | ✅ |
| Works on FLEX 4K+ | ✅ | ✅ | **✅** | ✅ |
| Clean error handling | ❌ | ⚠️ | **✅** | ⚠️ |
| Constitution alignment | ❌ | ❌❌ | **✅** | ❌❌ |
| Maintenance burden | Low | High | **Very Low** | High |
| **Overall** | Acceptable | Reject | **Recommended** | Reject |

---

## 5. Recommendation

**Use Approach C: Pure TypeScript implementation of the native control protocol.**

### Rationale

1. **The protocol is fully specified and stable.** The `hdhomerun_pkt.h` header file is the complete wire format specification, documented in detail with comments. The protocol has been unchanged since 2006. There is no guesswork.

2. **A working JavaScript reference exists.** `mharsch/node-hdhomerun` demonstrates that the protocol is feasible in JavaScript in ~300 lines. A modern TypeScript rewrite would be cleaner, typed, and more robust (particularly around unknown-tag handling and Promise-based async).

3. **Zero added complexity.** No changes to `Dockerfile`, `package.json`, or CI/CD. The implementation lives entirely in `apps/web/src/lib/hdhr/` alongside existing HDHR utilities.

4. **Perfect constitution alignment.** "Minimal Dependencies," "Simplicity First," and "No Over-Engineering" all point to this approach. Adding a binary dependency (Approach A) or a native addon (Approach B) to query a text string from a local network device is a clear violation of these principles.

5. **Full testability.** The TCP socket can be mocked with Node.js `net.Server` in tests, or actual protocol bytes can be captured and replayed. Subprocess-based approaches (Approach A) require `child_process` mocking which is fragile.

6. **The implementation scope is well-bounded.** See Section 6 for the estimate — this is roughly a half-day of focused work for a senior engineer, including tests.

### What We Will NOT Do

- We will **not** re-implement the full `libhdhomerun` API surface (discovery, streaming, channel scanning). We need exactly two read-only get-queries: `streaminfo` and `debug`.
- We will **not** introduce a connection pool or persistent TCP connection singleton. Each query opens a fresh TCP connection (2500 ms timeout), sends one request, reads one response, and closes. The queries are infrequent (on channel-change for `streaminfo`, and polling at ~2s intervals for `debug` if implemented). The overhead of connection setup is negligible at this frequency.
- We will **not** replace the existing HTTP polling architecture. The native protocol is additive — it fills the gap where HTTP endpoints return 404 on newer devices, while HTTP remains the primary channel for signal metrics (`status.json`).

---

## 6. Effort Estimate

For the recommended Approach C, implementing `streaminfo` (Priority #1) and `debug` (Priority #2) queries:

### Component Breakdown

| Component | File | Effort |
|-----------|------|--------|
| CRC32 implementation | `apps/web/src/lib/hdhr/crc32.ts` | 30 min |
| TLV packet encoder | `apps/web/src/lib/hdhr/native-protocol.ts` | 45 min |
| TLV packet decoder | (same file) | 45 min |
| TCP control client (`get()`) | `apps/web/src/lib/hdhr/native-client.ts` | 60 min |
| `streaminfo` parser (structured output) | `apps/web/src/lib/hdhr/signal-parsers.ts` | 45 min |
| `debug` parser (structured output) | (same file) | 30 min |
| Integration with `SignalPollingManager` | `apps/web/src/lib/hdhr/signal-poller.ts` | 60 min |
| Unit tests for parsers and protocol | `*.test.ts` | 90 min |
| Integration test (mock TCP server) | `native-client.test.ts` | 60 min |
| **Total** | | **~8–9 hours** |

This is a well-scoped half-to-full day of implementation work. No architectural changes to the existing SSE pipeline are required — the native client slots in as an alternative data source for `streaminfo` when the HTTP endpoint returns 404.

### Nice-to-Have: Channel Scanning

Adding channel scan support via the native protocol would require:
- Streaming `scan` response parsing (~200 additional lines)
- Timeout management (scans can take 60+ seconds)
- ~4–6 additional hours

This is explicitly out of scope for SPEC-015 but documented here for future reference.

---

## 7. Tradeoffs: Native Protocol vs. Current HTTP-Only Approach

### What We Gain

| Capability | Before (HTTP only) | After (HTTP + native protocol) |
|------------|-------------------|-------------------------------|
| `streaminfo` on FLEX 4K | ❌ 404 | ✅ Always available |
| `streaminfo` on all other devices | ✅ HTTP | ✅ HTTP (unchanged, native as fallback) |
| `debug` data (bps, te, crc, miss) | ❌ Not available via HTTP | ✅ Available for richer signal diagnostics |
| Channel scanning | ❌ | ✅ (future work) |
| PID-level filtering | ❌ | ✅ (future work) |
| Device model/features detection | ✅ HTTP (`/discover.json`) | ✅ Both (native more detailed) |
| Docker image size | Unchanged | **Unchanged** |
| External binary dependencies | 0 | **0** |
| npm dependencies added | 0 | 0 (CRC32 inline, ~15 lines) |

### What We Risk / Lose

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Protocol breaks on future firmware | Very Low | Protocol stable since 2006; Silicondust maintains backward compat |
| TCP port 65001 firewalled | Low | Same risk as the HTTP API; device is on local network |
| Implementation bugs in encoder/decoder | Medium | Mitigated by unit tests with known-good byte sequences from `node-hdhomerun` |
| Additional code surface to maintain | Low | ~300 lines; well-isolated in `lib/hdhr/` |
| Latency of TCP handshake per query | Negligible | ~0.5–2ms on LAN; queries are infrequent |

### Implementation Strategy: Graceful Fallback

The integration should follow a **try-HTTP-first, fall-back-to-native** pattern:

```
1. Attempt HTTP GET http://{device-ip}/tuner{N}/streaminfo
2. If response is 2xx → parse and return
3. If response is 404 → attempt TCP native get /tuner{N}/streaminfo
4. If TCP fails (device unreachable, timeout) → return null/error
```

This ensures backward compatibility with older devices that do support the HTTP endpoint, while unlocking FLEX 4K+ compatibility. The native path is never used when HTTP works, keeping the happy path simple.

---

## 8. Implementation Notes for Approach C

These notes are for whoever implements this (not a specification — just captured observations while the research is fresh).

### CRC32

Node.js 22+ includes a built-in `zlib.crc32()` function — no implementation needed:
- `import { crc32 } from 'node:zlib'` — zero deps, available natively in the project's Node 22 runtime
- The function takes a `Buffer` and returns a `number` (uint32) — exactly what the HDHomeRun protocol needs
- Verified working: `zlib.crc32(Buffer.from('hello'))` returns `0x3610a686`

### Unknown Tag Handling

The `node-hdhomerun` library throws an error on unknown tags. The C library silently skips them. **Always skip unknown tags** — newer firmware may add tags to responses and we must not break.

### Recommended TypeScript API Shape

```typescript
// native-client.ts

/**
 * Sends a single get-request to the HDHomeRun native control protocol
 * (TCP port 65001) and returns the string value of the named variable.
 *
 * Opens a fresh TCP connection per call; suitable for infrequent queries.
 * Throws NativeProtocolError on timeout, CRC mismatch, or device error.
 */
async function nativeGet(
  deviceIp: string,
  variableName: string,
  timeoutMs?: number,
): Promise<string>;
```

### Packet Buffer Size

Max packet size is 1460 bytes (`HDHOMERUN_MAX_PACKET_SIZE`). Allocate a `Buffer.alloc(1460)` for all encode/decode operations rather than growing dynamically.

### TCP Stream Framing

TCP does not guarantee that a `recv` call returns a complete packet. The `hdhomerun_control_recv_sock` implementation in the C library loops until `hdhomerun_pkt_open_frame` returns success — meaning it accumulates bytes until header + payload + CRC are available. A TypeScript implementation must do the same using Node.js `Readable` streams or a manual accumulation loop.

---

## 9. Sources Consulted

| Source | URL | Notes |
|--------|-----|-------|
| `libhdhomerun` repo | https://github.com/Silicondust/libhdhomerun | Primary source; `hdhomerun_pkt.h` has complete protocol spec in header comments |
| `hdhomerun_pkt.c` | (same repo) | CRC32 algorithm, frame framing/sealing |
| `hdhomerun_control.c` | (same repo) | Connection handling, get/set implementation |
| `hdhomerun_control.h` | (same repo) | API surface and timeout constants |
| HDHomeRun Config docs | https://info.hdhomerun.com/info/hdhomerun_config | CLI reference, variable names, output formats |
| Discovery API docs | https://info.hdhomerun.com/info/discovery_api | UDP discovery protocol (C API) |
| `node-hdhomerun` | https://github.com/mharsch/node-hdhomerun | Working JS implementation; validation of approach feasibility |
| `node-hdhomerun` functions.js | (same repo) | CRC32 encode/decode, TLV encode/decode in plain JS |
| Alpine Linux packages | https://pkgs.alpinelinux.org/package/edge/community/x86_64/libhdhomerun | Distribution availability for Approach A |
| `lferrarotti74/libhdhomerun-docker` | https://hub.docker.com/r/lferrarotti74/libhdhomerun-docker | Docker image availability for Approach A |
| HDHomeRun skill | `skills/hdhomerun-api/SKILL.md` | Project-local device quirks reference |
