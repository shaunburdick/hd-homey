# Feature Specification: Video Transcoding & In-Browser Playback

**Feature ID**: `005-video-transcoding`
**Created**: 2025-11-16
**Status**: Ready for Testing (Phase 8/10 Complete - Feature complete, needs testing & docs)
**Owner**: HD Homey Core Team

## Overview

Video Transcoding enables users to watch live TV streams directly in their browser without requiring external media players. HD HomeRun devices stream in MPEG-2 format, which most modern browsers cannot play natively. This feature transcodes MPEG-2 streams into browser-compatible formats (H.264/HLS) in real-time, provides an in-browser media player, and includes intelligent stream sharing to minimize resource usage when multiple users watch the same channel.

## User Stories

### Story 1: Watch Stream in Browser (Priority: P1)

**As a** user
**I want** to watch live TV directly in my web browser
**So that** I don't need to use external media players or configure additional software

**Why this priority**: Core value proposition - makes the application accessible to non-technical users

**Acceptance Criteria**:
- **Given** I navigate to a channel's watch page, **When** the page loads, **Then** I see an embedded video player showing the live stream
- **Given** the stream is playing, **When** I use standard player controls, **Then** I can play/pause and adjust volume
- **Given** the stream starts, **When** transcoding begins, **Then** video appears within 5 seconds
- **Given** I'm on a mobile device, **When** I view the stream, **Then** the player adapts to my screen size

---

### Story 2: Automatic Format Detection (Priority: P1)

**As a** system
**I want** to automatically detect if the source stream requires transcoding
**So that** we only transcode when necessary and save resources

**Why this priority**: Critical for performance optimization and resource efficiency

**Acceptance Criteria**:
- **Given** a channel streams in MPEG-2, **When** a user requests playback, **Then** the system automatically transcodes to H.264/HLS
- **Given** a channel already streams in H.264, **When** a user requests playback, **Then** the system proxies without transcoding
- **Given** transcoding is unavailable, **When** a user tries to play, **Then** they see the direct stream URL with instructions

---

### Story 3: Shared Transcoding Sessions (Priority: P1)

**As a** system administrator
**I want** multiple users watching the same channel to share a single transcode process
**So that** server resources are used efficiently

**Why this priority**: Essential for scalability and preventing resource exhaustion

**Acceptance Criteria**:
- **Given** User A is watching Channel 1, **When** User B starts watching Channel 1, **Then** they both consume the same transcoded stream
- **Given** the last viewer stops watching, **When** 30 seconds pass with no viewers, **Then** the transcoding process terminates
- **Given** a user starts watching, **When** a transcode is already running for that channel, **Then** they join within 2 seconds

---

### Story 4: Configure Transcoding Settings (Priority: P1)

**As an** administrator
**I want** to configure transcoding quality and performance settings
**So that** I can balance video quality with server performance

**Why this priority**: Different deployment scenarios require different configurations

**Acceptance Criteria**:
- **Given** I access the settings page, **When** I view transcoding options, **Then** I see presets (Low/Medium/High/Custom)
- **Given** I select a preset, **When** I save, **Then** new transcoding sessions use those settings
- **Given** I choose custom settings, **When** I configure bitrate/resolution/codec, **Then** the system validates and applies them
- **Given** settings are invalid, **When** I try to save, **Then** I see clear error messages

---

### Story 5: Transcoding Status & Health Check (Priority: P2)

**As an** administrator
**I want** to see transcoding system status and active streams
**So that** I can monitor resource usage and troubleshoot issues

**Why this priority**: Important for operations and debugging but not core functionality

**Acceptance Criteria**:
- **Given** I access the admin dashboard, **When** I view transcoding status, **Then** I see whether ffmpeg is available and version
- **Given** streams are being transcoded, **When** I view active sessions, **Then** I see channel names, viewer counts, and resource usage
- **Given** transcoding fails, **When** I check the logs, **Then** I see detailed error information

---

### Story 6: Graceful Degradation (Priority: P2)

**As a** user
**I want** to still access streams when transcoding is unavailable
**So that** I'm not completely blocked from content

**Why this priority**: Ensures the system remains partially functional even with issues

**Acceptance Criteria**:
- **Given** ffmpeg is not installed, **When** I view a channel page, **Then** I see a direct stream URL and VLC/player instructions
- **Given** transcoding fails, **When** playback errors occur, **Then** I'm shown the direct stream URL as fallback
- **Given** the system is overloaded, **When** transcode queue is full, **Then** new viewers get a helpful error message

---

### Story 7: Performance Recommendations (Priority: P3)

**As an** administrator
**I want** to receive recommendations for optimal transcoding settings
**So that** I can make informed decisions about quality vs performance

**Why this priority**: Nice-to-have feature that improves user experience

**Acceptance Criteria**:
- **Given** I access transcoding settings, **When** the page loads, **Then** I see recommendations based on detected CPU cores and memory
- **Given** I select high-quality settings, **When** my system resources are limited, **Then** I see a warning about potential performance issues
- **Given** I'm configuring settings, **When** I hover over options, **Then** I see tooltips explaining each setting's impact

## Requirements

### Functional Requirements

- **FR-001**: System MUST detect when ffmpeg is available at startup and log its status
- **FR-002**: System MUST check video codec of source stream before deciding to transcode
- **FR-003**: System MUST transcode MPEG-2 streams to H.264 video + AAC audio in HLS format
- **FR-004**: System MUST maintain a registry of active transcoding sessions indexed by tuner+channel
- **FR-005**: System MUST allow multiple viewers to share the same transcoding session
- **FR-006**: System MUST terminate transcoding sessions after 30 seconds with no active viewers
- **FR-007**: System MUST provide an HTML5 video player with HLS.js for browser compatibility
- **FR-008**: System MUST serve HLS manifest (.m3u8) and segment (.ts) files over HTTP
- **FR-009**: System MUST store transcoding configuration in the settings table
- **FR-010**: System MUST provide fallback to direct stream URLs when transcoding unavailable
- **FR-011**: System SHOULD limit maximum concurrent transcoding sessions (configurable)
- **FR-012**: System SHOULD support hardware acceleration when available (Quick Sync, NVENC, VAAPI)
- **FR-013**: System SHOULD log transcoding errors with sufficient detail for debugging
- **FR-014**: System SHOULD clean up temporary HLS files after sessions end

### Non-Functional Requirements

- **NFR-001**: Performance - Transcoding startup latency < 5 seconds
- **NFR-002**: Performance - HLS segment duration 2-4 seconds for low latency
- **NFR-003**: Performance - System MUST handle at least 3 concurrent 1080p transcodes on 4-core CPU
- **NFR-004**: Reliability - Transcoding failures MUST NOT crash the entire application
- **NFR-005**: Reliability - System MUST recover automatically from transcode process crashes
- **NFR-006**: Usability - Video player controls MUST be intuitive and match standard HTML5 video conventions
- **NFR-007**: Usability - Settings page MUST provide clear descriptions and recommendations
- **NFR-008**: Security - HLS segments MUST use existing stream token authentication
- **NFR-009**: Compatibility - Player MUST work on Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- **NFR-010**: Resource Usage - Each 1080p transcode SHOULD use < 20% CPU on modern 4-core processor

### Data Requirements

- **Transcoding Settings**: Stored in `settings` table with keys:
  - `transcoding.enabled` - Boolean to enable/disable transcoding
  - `transcoding.preset` - Quality preset: low/medium/high/custom
  - `transcoding.video_codec` - Codec to use: h264/h264_qsv/h264_nvenc/h264_vaapi
  - `transcoding.video_bitrate` - Video bitrate in kbps (e.g., 2000)
  - `transcoding.audio_bitrate` - Audio bitrate in kbps (e.g., 128)
  - `transcoding.resolution` - Max resolution: 480p/720p/1080p/source
  - `transcoding.framerate` - Max framerate: 24/30/60/source
  - `transcoding.max_sessions` - Maximum concurrent transcodes (default: 5)
  - `transcoding.segment_duration` - HLS segment length in seconds (2-6)
  - `transcoding.hardware_accel` - Hardware acceleration type: none/qsv/nvenc/vaapi

- **Active Sessions**: In-memory registry (not persisted):
  - Session ID (tuner:channel)
  - Viewer count
  - Process PID
  - Start time
  - Output directory path
  - Last accessed timestamp

## Technical Constraints

### Required Software
- **ffmpeg 4.4+**: Required for transcoding (MUST be in PATH or Docker image)
- **HLS.js 1.5+**: JavaScript library for HLS playback in browsers that don't support HLS natively

### Docker Image
- MUST include ffmpeg with libx264, libfdk-aac (or native AAC), and HLS muxer
- SHOULD include hardware acceleration libraries when possible (VA-API for Intel)
- Base image: Consider using `node:22-alpine` + `ffmpeg` package or `linuxserver/ffmpeg` as inspiration

### Transcoding Format
- Container: HLS (HTTP Live Streaming) - `.m3u8` playlist + `.ts` segments
- Video Codec: H.264 (baseline profile for maximum compatibility)
- Audio Codec: AAC-LC
- Segment Duration: 2-4 seconds (configurable)
- Playlist: Rolling window of last 10 segments

### Integration Points
- Extends existing channel streaming routes (`/tuners/[id]/channel/[channel_id]`)
- New routes:
  - `/tuners/[id]/channel/[channel_id]/watch` - Player page
  - `/api/transcode/[tunerId]/[channelId]/playlist.m3u8` - HLS manifest
  - `/api/transcode/[tunerId]/[channelId]/segment[N].ts` - HLS segments
- Uses existing stream token authentication system
- Settings managed via admin settings page

### Resource Management
- Temporary files stored in `${HD_HOMEY_DATA_PATH}/transcoding/[session-id]/`
- Cleanup after session ends (30s after last viewer disconnects)
- Process isolation - each transcode runs as separate ffmpeg child process
- Memory limits enforced via Node.js child process options

## Edge Cases & Error Handling

### Transcoding Unavailable
- **Scenario**: ffmpeg not found in PATH or Docker image
- **Handling**: Disable transcoding globally, show direct stream URLs only, log warning at startup

### Transcode Process Crashes
- **Scenario**: ffmpeg process dies unexpectedly
- **Handling**: Log error with stderr output, notify connected viewers, clean up session, allow retry

### Insufficient Resources
- **Scenario**: CPU/memory exhausted, max sessions reached
- **Handling**: Return HTTP 503 with retry-after header, show queue position if applicable

### Codec Already Compatible
- **Scenario**: Source stream is already H.264/AAC
- **Handling**: Skip transcoding, proxy stream directly with correct content-type

### Network Interruption to Tuner
- **Scenario**: HDHomeRun device becomes unreachable during streaming
- **Handling**: ffmpeg will fail, terminate session, show error to users, clean up resources

### Concurrent Session Management
- **Scenario**: User A starts watching, User B joins 1 second later
- **Handling**: Both share session, B waits for next HLS segment (2-4s max delay)

### Authentication Failures
- **Scenario**: Stream token expires mid-session
- **Handling**: Return 401, force client to refresh token and reconnect

### Browser Compatibility
- **Scenario**: User on old browser without HLS support
- **Handling**: HLS.js polyfill loads automatically, fallback to direct URL if JS disabled

## Success Criteria

### Measurable Outcomes

- **SC-001**: 95%+ of users can play streams without external players
- **SC-002**: Transcoding startup latency < 5 seconds for 90th percentile
- **SC-003**: Zero application crashes due to transcoding errors in first month
- **SC-004**: Resource usage: 3+ concurrent 1080p streams on 4-core CPU
- **SC-005**: Stream sharing works: 2+ users on same channel use single transcode process

### User Validation

- [ ] Feature tested with 10+ concurrent streams across 3+ channels
- [ ] Tested on Chrome, Firefox, Safari, Edge on desktop + mobile
- [ ] Admin successfully configures settings without external documentation
- [ ] Transcoding failures gracefully degrade to direct URLs
- [ ] No memory leaks after 24 hours of continuous operation

## Dependencies

- **Depends On**:
  - SPEC-002: Channel Streaming (must have existing stream infrastructure)
  - SPEC-003: User Authentication (for token-based stream access)
  - SPEC-004: Settings system (for configuration storage)

- **Blocks**:
  - Future: DVR functionality (would use transcoding for format conversion)
  - Future: Mobile apps (could consume HLS streams directly)

- **Related To**:
  - SPEC-001: Tuner Management (channels provide content to transcode)

## Out of Scope

Explicitly list what this feature does NOT include:

- ❌ Video recording/DVR functionality
- ❌ Multiple bitrate adaptive streaming (ABR)
- ❌ DASH format support (only HLS)
- ❌ Thumbnail generation or preview images
- ❌ Closed captioning/subtitle support
- ❌ Video quality analytics or telemetry
- ❌ Per-user quality preferences (global settings only)
- ❌ GPU-accelerated encoding (software encoding only in initial release)
- ❌ Transcoding for non-live content (future: recorded media)
- ❌ Audio-only transcoding or alternate audio tracks

## Open Questions

- [x] **Q1**: Should we support VP9/AV1 for better compression?
  **A**: No, H.264 has better hardware support and browser compatibility. Consider for v2.

- [x] **Q2**: Should transcoding be enabled by default?
  **A**: No, require explicit admin enablement after verifying ffmpeg works.

- [x] **Q3**: How many concurrent transcodes should be the default limit?
  **A**: 5 sessions, with recommendations based on detected CPU cores (1 per core + 1).

- [ ] **Q4**: Should we support DASH alongside HLS?
  **A**: Deferred - HLS is more widely supported, especially on Apple devices.

- [ ] **Q5**: How to handle HDR content from tuners?
  **A**: TBD - Most live TV is SDR. Consider tone-mapping in future iteration.

- [ ] **Q6**: Should we implement adaptive bitrate (ABR) streaming?
  **A**: Not in v1 - significant complexity. Single quality tier sufficient for most networks.

## Technical Research Notes

### Browser Video Format Support (2025)

| Format | Chrome | Firefox | Safari | Edge | Mobile |
|--------|--------|---------|--------|------|--------|
| MPEG-2 | ❌ | ❌ | ❌ | ❌ | ❌ |
| H.264/AVC | ✅ | ✅ | ✅ | ✅ | ✅ |
| VP9 | ✅ | ✅ | ✅ | ✅ | Partial |
| AV1 | ✅ | ✅ | ✅ | ✅ | Limited |
| HLS (Native) | ❌ | ❌ | ✅ | ❌ | iOS ✅ |
| HLS (via HLS.js) | ✅ | ✅ | N/A | ✅ | ✅ |

**Recommendation**: H.264 + HLS provides best compatibility across all platforms.

### FFmpeg Command Reference

```bash
# Low latency HLS transcode (for live streaming)
ffmpeg -i http://tuner:5004/auto/v10.1 \
  -c:v libx264 -preset ultrafast -tune zerolatency \
  -b:v 2000k -maxrate 2000k -bufsize 4000k \
  -profile:v baseline -level 3.1 \
  -c:a aac -b:a 128k -ar 48000 \
  -f hls -hls_time 2 -hls_list_size 10 \
  -hls_flags delete_segments+append_list \
  -hls_segment_filename "segment%03d.ts" \
  playlist.m3u8
```

**Key Parameters**:
- `-preset ultrafast`: Minimal CPU usage, faster encoding
- `-tune zerolatency`: Optimize for live streaming
- `-profile:v baseline`: Maximum device compatibility
- `-hls_time 2`: 2-second segments for low latency
- `-hls_list_size 10`: Keep last 10 segments in playlist
- `delete_segments`: Auto-cleanup old segments

### Hardware Acceleration Options

| Type | Flag | Platform | Performance Gain |
|------|------|----------|------------------|
| Intel QSV | `-c:v h264_qsv` | Intel CPU (6th gen+) | 3-5x |
| NVIDIA NVENC | `-c:v h264_nvenc` | NVIDIA GPU | 5-10x |
| AMD VCE | `-c:v h264_amf` | AMD GPU | 4-6x |
| VA-API | `-c:v h264_vaapi` | Intel/AMD Linux | 2-4x |

**Recommendation**: Support QSV and VA-API in Docker (most common server hardware). NVENC for GPU servers.

### Stream Sharing Architecture

```
User A → HLS Client → /api/transcode/1/42/playlist.m3u8 → Session Manager
                                                              ↓
                                                         Check if session exists
                                                              ↓
                                                    [Yes] → Increment viewer count
                                                              ↓
User B → HLS Client → /api/transcode/1/42/playlist.m3u8 → Return same m3u8
                                                              ↓
                                                    [No] → Spawn new ffmpeg process
                                                              ↓
                                                         Register session
                                                              ↓
                                                    Monitor viewer count
                                                              ↓
                                                    [0 viewers] → Wait 30s → Terminate
```

### Process Cleanup Implementation

**Critical Issue Resolved**: The initial implementation suffered from a critical audio corruption bug caused by improper audio resampling. The ffmpeg command was using `-ar 48000` (audio resampling) which caused degraded/segmented audio playback.

**Solution**: 
- Removed `-ar 48000` flag to preserve original audio stream quality
- Audio codec detection now uses correct stream parsing (`a:0` instead of `v:0`)
- FFmpeg processes are properly cleaned up when streams end

**Verification**:
```bash
# Check for running ffmpeg processes
ps aux | grep ffmpeg

# After stopping stream, wait 30s and verify cleanup
# No orphaned ffmpeg processes should remain
```

## References

- MDN Web Video Codecs: https://developer.mozilla.org/en-US/docs/Web/Media/Guides/Formats/Video_codecs
- HLS.js GitHub: https://github.com/video-dev/hls.js/
- FFmpeg HLS Streaming Guide: https://trac.ffmpeg.org/wiki/StreamingGuide
- Apple HLS Specification: https://datatracker.ietf.org/doc/html/rfc8216
- HD HomeRun HTTP API: https://www.silicondust.com/hdhomerun/developers/
- Related spec: `.specs/features/002-channel-streaming/spec.md`

---

*This specification should be reviewed and approved before creating an implementation plan.*
