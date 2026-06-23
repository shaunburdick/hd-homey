---
name: hdhomerun-api
description: >-
  Reference for SiliconDust HDHomeRun device APIs — HTTP endpoints, discovery protocol,
  hdhomerun_config CLI, and firmware-specific differences. Load this skill whenever
  you need to interact with HDHomeRun hardware, implement tuner management, channel
  scanning, signal monitoring, streaming, or device discovery. Covers device status
  endpoints (status.json, lineup.json, /tuner{N}/status, /tuner{N}/streaminfo),
  ATSC 3.0 endpoints, the UDP discovery protocol, and known model-specific quirks
  (e.g., FLEX 4K missing HTTP streaminfo).
---

# HDHomeRun API Reference

This skill documents the SiliconDust HDHomeRun device APIs used by the HD Homey project. It covers all the endpoints and tools you need when implementing tuner management, signal monitoring, channel scanning, streaming, or device discovery.

## Documentation Sources

| Source | URL |
|--------|-----|
| GitHub Wiki (Guide API, Tuner API, UI) | https://github.com/Silicondust/documentation/wiki |
| HTTP API Guide (lineup, streaming, tuning) | https://info.hdhomerun.com/info/http_api |
| Discovery API (UDP device discovery) | https://info.hdhomerun.com/info/discovery_api |
| hdhomerun_config CLI reference | https://info.hdhomerun.com/info/hdhomerun_config |
| DVR API | https://info.hdhomerun.com/info/dvr_api |
| Developer Portal (downloads, SDK) | https://www.silicondust.com/hdhomerun/developers/ |
| libhdhomerun (C library) | https://github.com/Silicondust/libhdhomerun |
| Community Forums | https://www.silicondust.com/forum/ |

---

## HTTP API

All HDHomeRun devices expose an HTTP API on port `5004` (or port `80` on some models).

### Base URL Pattern

```
http://<device-ip>:5004/<endpoint>
```

### Channel Lineup

Available on all devices. Returns the full channel list.

| Endpoint | Format | Description |
|----------|--------|-------------|
| `/lineup.json` | JSON | Channel lineup with GuideNumber, GuideName, URL, and codec info |
| `/lineup.xml` | XML | Same data as XML |
| `/lineup.m3u` | M3U | Playlist format for media players |

**`lineup.json` response fields:**

```json
{
  "GuideNumber": "3.1",
  "GuideName": "WSTMNBC",
  "URL": "http://192.168.1.100:5004/auto/v3.1",
  "HD": 1,
  "Favorite": 0,
  "VideoCodec": "mpeg2video",    // Present on FLEX 4K+ firmware
  "AudioCodec": "ac3"            // Present on FLEX 4K+ firmware
}
```

> **Note:** `VideoCodec` and `AudioCodec` fields were added in newer firmware (FLEX 4K, SCRIBE 4K with 20250815+). They are NOT present on older devices like the HDHomeRun Connect 4.

### Device Status

Returns basic device-level information.

| Endpoint | Description |
|----------|-------------|
| `/status.json` | Device status including tuner count, model, firmware version |

### Tuner Status

Address individual physical tuner slots. Tuners are indexed `0` through `N-1` where `N` is the number of tuners on the device.

| Endpoint | Description |
|----------|-------------|
| `/tuner{N}/status` | Signal status for one tuner (returns raw key=value text) |

**`/tuner{N}/status` response format:**

```
ch=auto:33 lock=atsc1-t ss=83 snq=90 seq=100 bps=38807712 pps=0
```

Fields:

| Field | Meaning | Example |
|-------|---------|---------|
| `ch` | Channel requested | `auto:33`, `qam:651000000` |
| `lock` | Modulation detected | `atsc1-t`, `qam256`, `none` |
| `ss` | Signal strength (0-100) | `83` (80% ≈ -12dBmV) |
| `snq` | Signal-to-noise quality (0-100) | `90` |
| `seq` | Symbol error quality (0-100) | `100` |
| `bps` | Raw channel bits per second | `38807712` |
| `pps` | Packets per second sent through network | `0` |

### Stream Info (PROGRAM DATA)

Returns program/sub-channel information for the currently tuned channel.

| Endpoint | Description |
|----------|-------------|
| `/tuner{N}/streaminfo` | Program listing for currently tuned tuner |

**Response format (when available):**

```
3: 20.1 KBWB-HD
4: 20.4 AZTECA
```

**⚠️ Important:** `streaminfo` is a **native-protocol-only** endpoint — it was never a standard HTTP API. Some older models (Connect 4, PRIME, EXTEND) also expose it over HTTP as a convenience. The native protocol (`hdhomerun_config get /tuner{N}/streaminfo`) works on all models.

When HTTP streaminfo is unavailable, the application falls back to `lineup.json` data using `VideoCodec`/`AudioCodec` fields for synthetic program entries.

### ATSC 3.0 Endpoints

Only available on ATSC 3.0-capable devices when tuned to an ATSC 3.0 channel.

| Endpoint | Description | Available On |
|----------|-------------|-------------|
| `/tuner{N}/atsc3/plpinfo` | Physical Layer Pipe info | FLEX 4K (when tuned to ATSC 3.0) |
| `/tuner{N}/atsc3/l1info` | L1 signaling info | FLEX 4K (when tuned to ATSC 3.0) |

> **Note:** These endpoints also return 404 on most devices. `atsc3/plpinfo` and `atsc3/l1info` only work when the tuner is actively locked to an ATSC 3.0 channel.

### Streaming

Start an MPEG-TS stream from a virtual channel.

| Pattern | Description |
|---------|-------------|
| `/auto/v{channel}` | Auto-select any available tuner for this virtual channel |
| `/tuner{N}/v{channel}` | Force a specific physical tuner |

**Examples:**

```
http://192.168.1.100:5004/auto/v3.1
http://192.168.1.100:5004/tuner0/v5.1?duration=120
http://192.168.1.100:5004/auto/v3.1?transcode=mobile   (EXTEND only)
```

**Optional parameters:**

| Parameter | Description |
|-----------|-------------|
| `duration=<n>` | Stop streaming after `<n>` seconds |
| `transcode=<profile>` | Enable transcoding (EXTEND only, see profiles below) |

**Transcode profiles** (EXTEND only):

| Profile | Description |
|---------|-------------|
| `heavy` | AVC with same resolution, framerate, interlacing as original (e.g., 1080i60 → AVC 1080i60) |
| `mobile` | AVC progressive, max 1280×720 @ 30fps |
| `internet540` | Low bitrate AVC, max 960×540 @ 30fps |
| `internet480` | Low bitrate AVC, max 848×480 (16:9) or 640×480 (4:3) @ 30fps |
| `internet360` | Low bitrate AVC, max 640×360 (16:9) or 480×360 (4:3) @ 30fps |
| `internet240` | Low bitrate AVC, max 432×240 (16:9) or 320×240 (4:3) @ 30fps |

**Error codes:**

| Header Value | Meaning |
|-------------|---------|
| `801` | Unknown Channel |
| `802` | Unknown Transcode Profile (EXTEND only) |
| `803` | System Busy (channel scan in progress) |
| `804` | Tuner In Use (specific tuner requested) |
| `805` | All Tuners In Use |
| `806` | Tune Failed (TA error or hardware error) |
| `807` | No Video Data (bad reception/off air) |
| `808` | DVR Failure |
| `809` | Playback Connection Limit |
| `810` | DVR Full |
| `811` | Content Protection Required (PRIME only) |

---

## Device Discovery Protocol

HDHomeRun devices can be discovered on the local network using a **UDP broadcast** mechanism. The native C library (`libhdhomerun`) handles this, but the same protocol can be implemented over raw UDP sockets.

### Discovery via UDP Broadcast

Send a discovery request to UDP port `65001` on the subnet broadcast address. Devices respond on UDP port `65002`.

### Discovery via HTTP

Devices can also be found by probing known IP ranges:

```
http://<ip>:5004/lineup.json   → 200 if a device lives at this IP
```

### libhdhomerun Discovery API

The C library provides structured discovery functions:

| Function | Description |
|----------|-------------|
| `hdhomerun_discover_create()` | Create a discover object |
| `hdhomerun_discover2_find_devices_broadcast()` | Find all devices on local network (400ms) |
| `hdhomerun_discover2_find_devices_targeted()` | Query a known IP address |
| `hdhomerun_discover2_device_get_device_id()` | Get 32-bit serial number |
| `hdhomerun_discover2_device_get_tuner_count()` | Get number of tuner slots |
| `hdhomerun_discover2_device_if_get_base_url()` | Get device HTTP base URL |
| `hdhomerun_discover2_device_if_get_lineup_url()` | Get lineup.json URL |

Full documentation: https://info.hdhomerun.com/info/discovery_api

Source code: https://github.com/Silicondust/libhdhomerun

---

## hdhomerun_config CLI

The `hdhomerun_config` utility provides low-level access via UDP/TCP. It uses a different protocol than the HTTP API and has access to endpoints not available over HTTP.

### Installation

| Platform | Command |
|----------|---------|
| Windows | Download HDHomeRun software installer |
| macOS | Download HDHomeRun for Mac DMG |
| Linux | `git clone https://github.com/Silicondust/libhdhomerun && make` |

### Basic Usage

```bash
# Discover devices on local network
hdhomerun_config discover

# Get tuner status (includes streaminfo!)
hdhomerun_config <device-id-or-ip> get /tuner0/status

# Get stream info via native protocol (works on ALL devices)
hdhomerun_config <device-id-or-ip> get /tuner0/streaminfo

# Get debug info (detailed signal diagnostics)
hdhomerun_config <device-id-or-ip> get /tuner0/debug

# List all supported options
hdhomerun_config <device-id-or-ip> get help

# Tune a channel (physical frequency)
hdhomerun_config <device-id-or-ip> set /tuner0/channel auto:651000000

# Tune a virtual channel (guide number, e.g. "3.1")
# The device internally resolves the virtual channel to the correct physical
# frequency and program. Works on all models including FLEX 4K.
hdhomerun_config <device-id-or-ip> set /tuner0/vchannel 3.1

# Start streaming to a UDP target
hdhomerun_config <device-id-or-ip> set /tuner0/target udp://192.168.1.100:5000

# Save stream to file
hdhomerun_config <device-id-or-ip> save /tuner0 capture.ts

# Scan channels (logs to file)
hdhomerun_config <device-id-or-ip> scan /tuner0 scan0.log

# Stop tuner
hdhomerun_config <device-id-or-ip> set /tuner0/channel none
```

### Key Differences from HTTP API

| Capability | HTTP API | hdhomerun_config CLI |
|-----------|----------|---------------------|
| `/tuner{N}/streaminfo` | ❌ Not available (native protocol only) | ✅ Always available |
| `/tuner{N}/debug` | ❌ Not available | ✅ Available |
| `/tuner{N}/status` | ✅ Available | ✅ Available |
| `/tuner{N}/vchannel` | ❌ Not available | ✅ Available (set virtual channel) |
| Channel scanning | ❌ Not available | ✅ Available via `scan` command |
| PID filtering | ❌ Not available | ✅ Available via `set /tuner{N}/filter` |
| Streaming to UDP target | ❌ Not available | ✅ Available via `set /tuner{N}/target` |
| Stream download to file | ✅ Available via HTTP GET | ✅ Available via `save` command |

### /tuner{N}/debug Output

```
tun: ch=qam:33 lock=qam256 ss=84 snq=88 seq=100 dbg=22081-6930
dev: resync=0 overflow=0
ts:  bps=38809216 ut=94 te=0 miss=0 crc=0
flt: bps=38809216
net: pps=0 err=0 stop=0
```

| Line | Fields | Description |
|------|--------|-------------|
| `tun` | ch, lock, ss, snq, seq, dbg | Tuner status (same as `/tuner{N}/status`) |
| `dev` | resync, overflow | Device-level errors |
| `ts` | bps, ut, te, miss, crc | Transport stream: utilization, transport errors, missed packets, CRC errors |
| `flt` | bps | Bits per second after PID filtering |
| `net` | pps, err, stop | Network: packets/sec, drops, stop reason |

> Counters reset on channel change. Diagnostic assessments should use **change in values over time**, not absolute values.

---

## Model-Specific Differences

HDHomeRun devices have significant firmware-dependent behavior. Here's what the HD Homey project has learned from real-world testing.

### FLEX 4K (HDFX-4K, firmware 20250815)

| Feature | Status |
|---------|--------|
| `status.json` | ✅ Works |
| `lineup.json` | ✅ Works (includes VideoCodec/AudioCodec) |
| `/tuner{N}/status` | ✅ Works |
| `/tuner{N}/streaminfo` (HTTP) | ❌ Native protocol only |
| `/tuner{N}/atsc3/plpinfo` (HTTP) | ❌ 404 (even on ATSC 3.0 channels?) |
| `/tuner{N}/atsc3/l1info` (HTTP) | ❌ 404 |
| Streaminfo via hdhomerun_config | ✅ Works |
| Tuner count | 4 (tuner0-tuner3) |

### HDHomeRun Connect 4

| Feature | Status |
|---------|--------|
| `status.json` | ✅ Works |
| `lineup.json` | ✅ Works |
| `/tuner{N}/status` | ✅ Works |
| `/tuner{N}/streaminfo` (HTTP) | ✅ Works |
| Streaminfo via hdhomerun_config | ✅ Works |
| Tuner count | 4 (tuner0-tuner3) |

### Known Quirks

1. **Unused tuner slots may 404**: `/tuner{N}/status` on an unpopulated slot (e.g., tuner3 on a 4-tuner device where slot 3 does not exist as a physical connector) may return HTTP 404.
2. **ATSC 3.0 endpoints only work when locked**: Even on ATSC 3.0-capable devices, `/atsc3/*` endpoints return 404 unless the tuner is actively locked to an ATSC 3.0 signal.
3. **Signal counters reset on channel change**: When evaluating signal quality over time, compare **deltas** between poll cycles, not absolute values.
4. **`idle` vs `lock=none`**: When a tuner is idle but still allocated, `lock=none` returns with `ss=0`. When truly unallocated, `/tuner{N}/status` may 404 entirely.
5. **Use `vchannel` for virtual channel tuning, not `channel`**: The `/tuner{N}/channel` variable only accepts physical frequencies or channel numbers (e.g., `auto:651000000`, `auto:18`). To tune by virtual channel (guide number), use the **`vchannel`** variable instead (e.g., `/tuner{N}/vchannel` = `3.1`). The device internally resolves the virtual channel to the correct physical frequency and program. This works on all tested models including FLEX 4K (firmware 20250815+). Attempting to set `channel=auto:3.1` will fail with `"ERROR: invalid channel"` — this is expected behavior, not a firmware quirk.

---

## Key API Patterns Used in This Project

### Signal Monitoring Polling Cycle

```
1. GET /status.json              → device info, tuner count
2. For each tuner:
   a. GET /tuner{N}/status       → SS/SNQ/SEQ values
   b. GET /tuner{N}/streaminfo   → program listing (some models; falls back to native protocol + lineup.json)
   c. If ATSC 3.0 locked:
      GET /tuner{N}/atsc3/plpinfo
      GET /tuner{N}/atsc3/l1info
```

**Failure handling:** All endpoints can fail (network, 404, device busy). The application must handle failures gracefully without crashing or blocking.

### Auto-Discovery of Tuner Slots

The device's tuner count is obtained from `status.json` or the UDP discovery protocol. Each physical slot is mapped to a resource name (`tuner0`, `tuner1`, etc.). Slots not tracked in the database use synthetic negative IDs.

### Lineup Fallback for Program Data

When HTTP `/tuner{N}/streaminfo` is unavailable (native protocol also fails), use `lineup.json` as fallback:
- Find the entry matching the tuned virtual channel by `GuideNumber`
- Return the channel name and codec info (`VideoCodec`, `AudioCodec`) as synthetic program data
- This provides at minimum the channel name without per-PID stream details
