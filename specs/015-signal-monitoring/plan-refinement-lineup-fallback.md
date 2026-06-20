# Plan Refinement: lineup.json Fallback for Program Data

**Date**: 2026-06-19  
**Author**: Project Manager  
**Context**: User reports that the HDHomeRun FLEX 4K (firmware 20250815) returns 404 on
`/tuner{N}/streaminfo` HTTP endpoint. Program/PID data shows empty. However, the device
does serve `/lineup.json` which includes per-channel VideoCodec and AudioCodec info.

## Problem

Newer HDHomeRun models (FLEX 4K, SCRIBE 4K) dropped several HTTP endpoints that existed
on older hardware:
- `/tuner{N}/streaminfo` → **404**
- `/tuner{N}/status` → **404**
- `/tuner{N}/atsc3/plpinfo` → **404**
- `/tuner{N}/atsc3/l1info` → **404**

These endpoints still work via the native `hdhomerun_config` binary protocol (UDP/TCP),
but that requires installing a system binary and is out of scope for this project.

## Solution: lineup.json Fallback

When `/tuner{N}/streaminfo` returns non-200, fall back to the device's `/lineup.json`
which is known to work on all models. Cross-reference the tuner's current `VctNumber`
against `GuideNumber` entries in the lineup to extract codec information.

### Data Flow

```
client connects via SSE
  → poller fetches /status.json (works on all models)
  → VctNumber changes → poller fetches /tuner{N}/streaminfo
  → 404 / error → poller fetches /lineup.json
  → matches current VctNumber vs GuideNumber
  → creates synthetic ParsedProgram[] with VideoCodec & AudioCodec
  → dispatches as streaminfo SSE event (same types, same client rendering)
  → caches lineup data per device (refetch on next poll if still empty)
```

### Synthetic Program Structure

From lineup.json entry matching guide number "3.1":
```json
{"GuideNumber":"3.1","GuideName":"WSTMNBC","VideoCodec":"MPEG2","AudioCodec":"AC3","HD":1}
```

Creates:
```typescript
[{
  programNumber: 0,       // synthetic — no real program number from lineup
  name: "WSTMNBC",        // GuideName from lineup
  pids: [
    { pid: 0, codec: "MPEG2 video", type: "video", program: 0 },
    { pid: 1, codec: "AC3 audio",   type: "audio", program: 0 },
  ]
}]
```

### Why This Works

- `lineup.json` is fetched via HTTP from the same device and works on all models
- `GuideNumber` in lineup matches `VctNumber` in status.json (both are the virtual
  channel number like "3.1")
- The `ParsedProgram` type is the same, so `ProgramList` renders identically
- The user gets "MPEG2 video / AC3 audio" instead of "No program data available"

### Limitations

- No per-PID detail (no individual PID numbers, no data PIDs, no closed caption info)
- No program number (only one synthetic program with programNumber=0)
- ATSC 3.0 details remain unavailable via HTTP on these devices
- Codec info is at the channel level, not the transport stream level

## Changes Required

### File: `apps/web/src/lib/hdhr/signal-parsers.ts`

Add new pure function:
- `createLineupFallbackProgram(guideNumber, vctName, lineupData): ParsedProgram[]`

### File: `apps/web/src/lib/hdhr/signal-poller.ts`

- Add `lineupCache: ChannelInfo[] | null` to `DevicePollEntry` interface
- Modify `dispatchStreamInfoIfChanged`: in the catch block, try fetching `lineup.json`
  if not cached, look up current VctNumber, dispatch synthetic program via
  `createLineupFallbackProgram`
- Cache the lineup data to avoid refetching every poll cycle

### File: `apps/web/src/lib/hdhr/signal-parsers.test.ts` (or `signal-poller.test.ts`)

- Add test fixture with sample lineup.json data
- Unit test `createLineupFallbackProgram`:
  - Match found → returns [program with correct codec]
  - No match → returns []
  - Missing VideoCodec/AudioCodec → returns [program with empty pids]
- Integration test: mock lineup.json to return 200 with data and verify
  streaminfo SSE event contains synthetic program data

## Non-Goals

- No changes to client components (ProgramList, Atsc3Details)
- No new dependencies
- No DB schema changes
- No ATSC 3.0 fallback (will still show empty — no HTTP endpoint)
