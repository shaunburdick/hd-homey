# Implementation Plan: Video Transcoding & In-Browser Playback

**Feature ID**: `005-video-transcoding`
**Spec**: [spec.md](./spec.md)
**Date**: 2025-11-16
**Branch**: `005-video-transcoding`

## Summary

Implement real-time video transcoding from MPEG-2 to H.264/HLS format with shared session management, allowing users to watch live TV directly in their browser. The system will detect ffmpeg availability, manage concurrent transcoding processes, serve HLS streams, and provide an HTML5 video player with configurable quality settings.

## Technical Context

**Framework**: Next.js 15 + React 18 + TypeScript 5
**Database**: SQLite with Drizzle ORM
**Authentication**: NextAuth.js v5
**Styling**: new.css (classless)
**Testing**: Vitest + React Testing Library
**Validation**: TypeBox
**New Dependencies**:
- `hls.js` - HLS playback library for browsers
- Node.js `child_process` - For spawning ffmpeg processes
- `fs/promises` - For managing temporary HLS files

## Constitution Check

Review against HD Homey Constitution:

- [x] ✅ Follows Next.js app router conventions
- [x] ✅ Uses server components by default (player page, watch page)
- [x] ✅ Server actions for mutations (settings updates)
- [x] ✅ TypeScript strict mode compliance
- [x] ✅ Drizzle ORM for database access (settings storage)
- [x] ✅ TypeBox validation at API boundaries (settings, API routes)
- [x] ✅ Unit tests for business logic (session manager, ffmpeg detection)
- [x] ⚠️ No soft deletes (transcoding sessions are ephemeral, in-memory only)
- [x] ✅ Authentication required (uses existing stream token system)
- [x] ✅ Mobile responsive (video player adapts to screen size)

**Violations/Justifications**:
- Soft deletes don't apply to in-memory transcoding sessions (they're temporary by nature)
- External dependency on ffmpeg binary (system requirement, gracefully degrades if unavailable)

## Architecture

### Directory Structure

```
src/
├── app/
│   ├── (protected)/
│   │   ├── tuners/[id]/channel/[channel_id]/
│   │   │   └── watch/
│   │   │       └── page.tsx                 # NEW: Video player page
│   │   └── settings/
│   │       └── page.tsx                     # MODIFIED: Add transcoding settings
│   └── api/
│       └── transcode/
│           └── [tunerId]/[channelId]/
│               ├── playlist.m3u8/
│               │   └── route.ts             # NEW: HLS manifest endpoint
│               ├── segment[N].ts/
│               │   └── route.ts             # NEW: HLS segment endpoint
│               └── status/
│                   └── route.ts             # NEW: Session status endpoint
├── lib/
│   ├── transcoding/
│   │   ├── ffmpeg.ts                        # NEW: FFmpeg detection & validation
│   │   ├── session-manager.ts               # NEW: Shared session management
│   │   ├── transcode.ts                     # NEW: Core transcoding logic
│   │   ├── hls-server.ts                    # NEW: HLS file serving
│   │   └── types.ts                         # NEW: TypeScript interfaces
│   ├── settings.ts                          # MODIFIED: Add transcoding settings
│   └── database/
│       └── schema.ts                        # MODIFIED: Add transcoding settings keys
├── components/
│   ├── video-player.tsx                     # NEW: HLS.js video player (client)
│   └── transcoding-status.tsx               # NEW: Admin status dashboard
└── migrations/
    └── 0002_add_transcoding_settings.sql    # NEW: Settings defaults

public/
└── hls.js/                                  # NEW: HLS.js library (CDN fallback)

docker/
└── Dockerfile                               # MODIFIED: Add ffmpeg installation
```

### Data Model

#### Settings Table (Modified)

No schema changes needed - using existing `settings` table with new keys:

```typescript
// New settings keys (no migration needed, created at runtime)
const TRANSCODING_SETTINGS = {
  'transcoding.enabled': 'false',
  'transcoding.preset': 'medium',
  'transcoding.video_codec': 'libx264',
  'transcoding.video_bitrate': '2000',
  'transcoding.audio_bitrate': '128',
  'transcoding.resolution': '1080p',
  'transcoding.framerate': '30',
  'transcoding.max_sessions': '5',
  'transcoding.segment_duration': '2',
  'transcoding.hardware_accel': 'none',
};
```

#### In-Memory Session Registry

```typescript
interface TranscodingSession {
  sessionId: string;           // `${tunerId}:${channelId}`
  tunerId: number;
  channelId: number;
  viewerCount: number;
  process: ChildProcess;
  pid: number;
  outputDir: string;           // e.g., /data/transcoding/1-42/
  playlistPath: string;
  startTime: number;
  lastAccessTime: number;
  settings: TranscodeSettings;
  status: 'starting' | 'running' | 'stopping' | 'error';
  error?: string;
}

// Global registry
const activeSessions = new Map<string, TranscodingSession>();
```

### TypeScript Types

```typescript
// src/lib/transcoding/types.ts
export interface TranscodeSettings {
  enabled: boolean;
  preset: 'low' | 'medium' | 'high' | 'custom';
  videoCodec: 'libx264' | 'h264_qsv' | 'h264_nvenc' | 'h264_vaapi';
  videoBitrate: number;        // kbps
  audioBitrate: number;        // kbps
  resolution: '480p' | '720p' | '1080p' | 'source';
  framerate: 24 | 30 | 60 | 0; // 0 = source
  maxSessions: number;
  segmentDuration: number;     // seconds
  hardwareAccel: 'none' | 'qsv' | 'nvenc' | 'vaapi';
}

export interface FFmpegInfo {
  available: boolean;
  version?: string;
  codecs: string[];
  hwAccel: string[];
  path?: string;
}

export interface SessionStats {
  sessionId: string;
  channel: string;
  viewerCount: number;
  uptime: number;              // seconds
  cpuUsage?: number;
  memoryUsage?: number;
}
```

### API Endpoints

| Method | Path | Purpose | Auth Required |
|--------|------|---------|---------------|
| GET | `/api/transcode/[tunerId]/[channelId]/playlist.m3u8?token=xxx` | Get HLS manifest | Token |
| GET | `/api/transcode/[tunerId]/[channelId]/segment###.ts?token=xxx` | Get HLS segment | Token |
| GET | `/api/transcode/status` | List active sessions | Admin |
| POST | `/api/transcode/[tunerId]/[channelId]/stop` | Force stop session | Admin |

### Components

#### Pages

- **`/tuners/[id]/channel/[channel_id]/watch/page.tsx`**: Server component that renders video player with signed stream URL
- **`/settings/page.tsx`**: Modified to include transcoding configuration section (server component)

#### Client Components

- **`<VideoPlayer />`**: HLS.js-based video player
  - Props: `playlistUrl`, `channelName`, `autoplay`
  - Handles HLS initialization, error recovery, quality display

- **`<TranscodingStatus />`**: Admin dashboard widget
  - Props: `sessions: SessionStats[]`
  - Shows active transcodes, viewer counts, resource usage

#### Server Components

- **`<TranscodingSettings />`**: Settings form for admin
  - Preset selector, custom settings panel
  - Performance recommendations based on system

### Core Libraries

```typescript
// src/lib/transcoding/ffmpeg.ts
export async function detectFFmpeg(): Promise<FFmpegInfo>
export async function validateSettings(settings: TranscodeSettings): Promise<string[]>
export function buildFFmpegCommand(sourceUrl: string, outputDir: string, settings: TranscodeSettings): string[]

// src/lib/transcoding/session-manager.ts
export class TranscodingSessionManager {
  getOrCreateSession(tunerId: number, channelId: number): Promise<TranscodingSession>
  incrementViewers(sessionId: string): void
  decrementViewers(sessionId: string): void
  stopSession(sessionId: string): Promise<void>
  cleanupInactiveSessions(): Promise<void>
  getActiveSessions(): SessionStats[]
}

// src/lib/transcoding/transcode.ts
export async function startTranscode(sourceUrl: string, outputDir: string, settings: TranscodeSettings): Promise<ChildProcess>
export function stopTranscode(process: ChildProcess): Promise<void>
export async function waitForPlaylist(playlistPath: string, timeout: number): Promise<boolean>

// src/lib/transcoding/hls-server.ts
export async function servePlaylist(outputDir: string, token: string): Promise<Response>
export async function serveSegment(outputDir: string, segmentName: string, token: string): Promise<Response>
```

## Implementation Steps

### Phase 1: Docker & FFmpeg Setup (Est: 2-3 hours)

- [x] Research ffmpeg packages for Alpine Linux
- [ ] Update `Dockerfile` to install ffmpeg with required codecs
  - Install: `ffmpeg`, `libx264`, `aac` support
  - Verify hardware acceleration libraries (VA-API if possible)
- [ ] Add health check to verify ffmpeg availability
- [ ] Test Docker build with ffmpeg: `docker build . && docker run --rm IMAGE ffmpeg -version`
- [ ] Document minimum ffmpeg version requirement (4.4+)

**Test Command**:
```bash
docker build -t hd-homey:transcode .
docker run --rm hd-homey:transcode ffmpeg -version
docker run --rm hd-homey:transcode ffmpeg -codecs | grep h264
```

### Phase 2: FFmpeg Detection & Settings (Est: 3-4 hours) ✅ COMPLETE

- [x] Create `src/lib/transcoding/ffmpeg.ts`
  - Implement `detectFFmpeg()` using `child_process.exec`
  - Parse ffmpeg output for version, codecs, hardware acceleration
  - Cache detection results in memory (check on startup)
- [x] Add transcoding settings to `src/lib/settings.ts`
  - Define default settings constant
  - Add `getTranscodingSettings()` function
  - Add `updateTranscodingSettings()` function
- [x] Create `src/lib/transcoding/types.ts` with all TypeScript interfaces
- [x] Write unit tests for ffmpeg detection and settings
- [x] Add ffmpeg detection to `src/instrumentation-node.ts` startup

**Test Command**: `npm test src/lib/transcoding/ffmpeg.test.ts`
**Commit**: cf86060

### Phase 3: Session Manager (Est: 4-5 hours) ✅ COMPLETE

- [x] Create `src/lib/transcoding/session-manager.ts`
  - Implement `TranscodingSessionManager` class as singleton
  - Add session registry with Map
  - Implement `getOrCreateSession()` with locking
  - Implement viewer counting (increment/decrement)
  - Add cleanup timer for inactive sessions (30s threshold)
- [x] Create `src/lib/transcoding/transcode.ts`
  - Implement `startTranscode()` with ffmpeg spawn
  - Build command based on settings
  - Handle process stdout/stderr logging
  - Implement `stopTranscode()` gracefully (SIGTERM → SIGKILL)
  - Add `waitForPlaylist()` with timeout
- [x] Write comprehensive unit tests with mocked child_process
- [x] Add process cleanup on app shutdown

**Test Command**: `npm test src/lib/transcoding/session-manager.test.ts`
**Commit**: ab02b89

### Phase 4: HLS File Serving (Est: 3-4 hours)

- [ ] Create `src/lib/transcoding/hls-server.ts`
  - Implement `servePlaylist()` reading .m3u8 file
  - Implement `serveSegment()` reading .ts files
  - Add proper content-type headers
  - Handle file not found gracefully (wait for next segment)
- [ ] Create API route: `src/app/api/transcode/[tunerId]/[channelId]/playlist.m3u8/route.ts`
  - Validate stream token
  - Get or create transcoding session
  - Increment viewer count
  - Serve playlist via `servePlaylist()`
- [ ] Create API route: `src/app/api/transcode/[tunerId]/[channelId]/segment[N].ts/route.ts`
  - Validate stream token
  - Locate segment file
  - Serve segment via `serveSegment()`
- [ ] Test with manual curl requests

**Test Command**:
```bash
# Generate test token
npm run dev
curl "http://localhost:3000/api/transcode/1/42/playlist.m3u8?token=..."
```

### Phase 5: Video Player Component (Est: 3-4 hours)

- [ ] Add `hls.js` to package.json: `npm install hls.js`
- [ ] Add TypeScript types: `npm install -D @types/hls.js`
- [ ] Create `src/components/video-player.tsx` (client component)
  - Initialize HLS.js with playlist URL
  - Attach to HTML5 video element
  - Handle HLS.js events (manifest loaded, error, etc.)
  - Add error recovery logic (retry failed segments)
  - Show loading state while buffering
  - Handle native HLS support (Safari)
- [ ] Style video player with new.css (semantic HTML)
- [ ] Test on multiple browsers (Chrome, Firefox, Safari, Edge)

**Test Command**: Manual browser testing

### Phase 6: Watch Page (Est: 2-3 hours)

- [ ] Create `src/app/(protected)/tuners/[id]/channel/[channel_id]/watch/page.tsx`
  - Server component: fetch channel details
  - Generate stream token for current user
  - Build HLS playlist URL with token
  - Render `<VideoPlayer>` with playlist URL
  - Add back link to channel page
  - Add channel info display (name, number)
- [ ] Update channel detail page to add "Watch in Browser" button
- [ ] Add link from channel list to watch page
- [ ] Test full user flow: browse → channel → watch

**Test Command**: Manual E2E testing in browser

### Phase 7: Admin Settings UI (Est: 3-4 hours)

- [ ] Modify `src/app/(protected)/settings/page.tsx`
  - Add transcoding settings section
  - Preset selector (Low/Medium/High/Custom)
  - Custom settings form (bitrate, resolution, etc.)
  - Show ffmpeg status (available, version)
  - Performance recommendations based on CPU cores
- [ ] Create `src/app/(protected)/settings/actions.ts`
  - Add `updateTranscodingSettings()` server action
  - Validate settings with TypeBox
  - Save to database
  - Revalidate settings page
- [ ] Add settings validation
  - Check bitrate ranges (500-10000 kbps)
  - Validate max_sessions (1-20)
  - Ensure hardware accel is available if selected
- [ ] Style form with semantic HTML

**Test Command**: Manual form testing

### Phase 8: Status Dashboard (Est: 2-3 hours)

- [ ] Create `src/app/api/transcode/status/route.ts`
  - Admin-only endpoint
  - Return active sessions from SessionManager
  - Include viewer counts, uptime, channel info
- [ ] Create `src/components/transcoding-status.tsx`
  - Fetch and display active sessions
  - Show viewer counts per channel
  - Add manual stop button (admin only)
  - Auto-refresh every 5 seconds
- [ ] Add status widget to admin dashboard/settings page
- [ ] Test with multiple concurrent sessions

**Test Command**: Manual testing with concurrent streams

### Phase 9: Integration & Testing (Est: 4-5 hours)

- [ ] Test complete user flow: login → browse → watch
- [ ] Test shared sessions: 2 users watch same channel
- [ ] Test session cleanup: verify cleanup after 30s idle
- [ ] Test graceful degradation: disable ffmpeg, verify fallback
- [ ] Test settings: change quality preset, verify ffmpeg command
- [ ] Test authentication: verify token validation works
- [ ] Test error handling: kill ffmpeg process, verify recovery
- [ ] Run full test suite: `npm test`
- [ ] Run linter: `npm run lint`
- [ ] Check for memory leaks (long-running tests)

**Test Command**:
```bash
npm test
npm run lint
npm run build
```

### Phase 10: Documentation & Polish (Est: 2-3 hours)

- [ ] Update `README.md` with transcoding requirements
- [ ] Document ffmpeg installation for development
- [ ] Add inline code comments for complex session management
- [ ] Create troubleshooting guide for transcoding issues
- [ ] Add logging for debugging (session creation, cleanup)
- [ ] Update `CHANGELOG.md` with new feature
- [ ] Create example `.env` entries for transcoding settings
- [ ] Update `AGENTS.md` if needed

**Deliverables**:
- Updated README with ffmpeg requirements
- Transcoding troubleshooting guide
- Code comments for complex logic

## Testing Strategy

### Unit Tests

**Files to test**:
- `src/lib/transcoding/ffmpeg.ts`
  - Test ffmpeg detection with mocked `exec`
  - Test command building with various settings
  - Test settings validation

- `src/lib/transcoding/session-manager.ts`
  - Test session creation and reuse
  - Test viewer counting
  - Test cleanup timer
  - Mock child_process for ffmpeg spawn

- `src/lib/transcoding/transcode.ts`
  - Test process spawning (mocked)
  - Test graceful shutdown
  - Test error handling

**Coverage Target**: 80%+ for transcoding library

### Integration Tests

**API Routes**:
- Test playlist endpoint with valid/invalid tokens
- Test segment endpoint with various files
- Test status endpoint (admin auth)

**Server Actions**:
- Test settings update with valid/invalid data
- Test settings retrieval

### Manual Testing Checklist

- [ ] **Happy path**: Browse channels → click watch → video plays within 5s
- [ ] **Shared sessions**: Two browser tabs watch same channel, verify single ffmpeg process
- [ ] **Session cleanup**: Close all viewers, verify cleanup after 30s (check logs)
- [ ] **Settings**: Change quality preset, start new stream, verify ffmpeg parameters
- [ ] **No ffmpeg**: Rename ffmpeg binary, verify fallback to direct URL
- [ ] **Token expiry**: Use expired token, verify 401 error
- [ ] **Process crash**: Kill ffmpeg manually, verify error handling and recovery
- [ ] **Mobile responsive**: Test video player on phone/tablet
- [ ] **Browser compatibility**: Test on Chrome, Firefox, Safari, Edge
- [ ] **Performance**: Monitor CPU usage with 3 concurrent 1080p streams
- [ ] **Memory**: Check for memory leaks after 1 hour of continuous streaming

### Performance Benchmarks

Test on reference hardware (4-core CPU, 8GB RAM):

- [ ] Single 1080p stream: < 20% CPU, < 200MB RAM
- [ ] Three concurrent 1080p streams: < 60% CPU, < 500MB RAM
- [ ] Startup latency: < 5 seconds from request to playback
- [ ] Page load: < 2 seconds for watch page

## Rollback Plan

If issues arise after deployment:

1. **Immediate**: Set `transcoding.enabled=false` in settings UI
2. **Docker**: Revert to previous Docker image without ffmpeg
3. **Database**: No schema changes, so no migration rollback needed
4. **Config**: Remove transcoding settings from database (optional)
5. **Code**: Revert Git commit and rebuild
6. **Monitor**: Check logs for ffmpeg errors, session leaks, or crashes

**Rollback triggers**:
- Application crashes due to transcoding
- Memory leaks from session management
- ffmpeg zombie processes
- >50% increase in server resource usage

## Security Considerations

- [x] All transcode API routes use stream token authentication
- [x] Token validation prevents unauthorized HLS access
- [x] Session manager prevents directory traversal (validates paths)
- [x] Settings changes require admin role
- [x] ffmpeg commands use parameterized arrays (no shell injection)
- [x] Temporary files isolated per session (no cross-session access)
- [x] Process cleanup prevents resource exhaustion
- [x] Rate limiting considerations: max_sessions setting

**Security review checklist**:
- [ ] Verify no user input passes directly to shell
- [ ] Audit file path construction for traversal vulnerabilities
- [ ] Test token expiration handling
- [ ] Verify admin-only endpoints enforce authorization
- [ ] Check for resource exhaustion DoS vectors

## Performance Considerations

- [x] **Session sharing**: Multiple viewers share single transcode process
- [x] **Cleanup timer**: Auto-terminate unused sessions after 30s
- [x] **Hardware acceleration**: Support QSV/VA-API when available
- [x] **Efficient encoding**: Use `preset ultrafast` and `tune zerolatency` for low CPU
- [x] **Segment caching**: Browser caches HLS segments
- [x] **Lazy loading**: Only spawn ffmpeg when first viewer arrives
- [x] **Memory management**: Clean up temporary files after session ends
- [x] **Max sessions**: Configurable limit prevents overload

**Performance optimizations**:
- Use `preset ultrafast` for CPU-constrained systems
- Enable hardware acceleration (QSV/NVENC) if available
- Consider lowering resolution/bitrate for better scalability
- Implement session queueing if max_sessions reached

## Open Questions

- [x] **Q1**: Should we pre-transcode popular channels?
  **A**: No - adds complexity. On-demand transcoding sufficient for v1.

- [ ] **Q2**: How to handle HDR content?
  **A**: Defer to later - most live TV is SDR. May need tone-mapping in future.

- [ ] **Q3**: Should we support multiple quality levels (ABR)?
  **A**: Not in v1 - single quality sufficient. Consider for v2 if bandwidth issues arise.

- [ ] **Q4**: How to monitor CPU temperature / thermal throttling?
  **A**: Out of scope for v1 - admin should monitor via system tools.

- [ ] **Q5**: Should we persist transcoding statistics?
  **A**: Not in v1 - ephemeral stats sufficient. Consider metrics DB for v2.

## FFmpeg Command Reference

### Basic Low-Latency HLS Transcode

```bash
ffmpeg -i http://tuner:5004/auto/v10.1 \
  -c:v libx264 -preset ultrafast -tune zerolatency \
  -b:v 2000k -maxrate 2000k -bufsize 4000k \
  -profile:v baseline -level 3.1 \
  -c:a aac -b:a 128k -ar 48000 \
  -f hls -hls_time 2 -hls_list_size 10 \
  -hls_flags delete_segments+append_list \
  -hls_segment_filename "/output/segment%03d.ts" \
  /output/playlist.m3u8
```

### With Intel Quick Sync (QSV)

```bash
ffmpeg -hwaccel qsv -hwaccel_output_format qsv \
  -i http://tuner:5004/auto/v10.1 \
  -c:v h264_qsv -preset ultrafast \
  -b:v 2000k -maxrate 2000k -bufsize 4000k \
  -c:a aac -b:a 128k -ar 48000 \
  -f hls -hls_time 2 -hls_list_size 10 \
  -hls_flags delete_segments+append_list \
  -hls_segment_filename "/output/segment%03d.ts" \
  /output/playlist.m3u8
```

### Quality Presets

**Low (720p, 1000 kbps)**:
```
-s 1280x720 -b:v 1000k -maxrate 1000k -bufsize 2000k
```

**Medium (1080p, 2000 kbps)**:
```
-s 1920x1080 -b:v 2000k -maxrate 2000k -bufsize 4000k
```

**High (1080p, 4000 kbps)**:
```
-s 1920x1080 -b:v 4000k -maxrate 4000k -bufsize 8000k
```

## References

- Feature Spec: [spec.md](./spec.md)
- Constitution: `../../CONSTITUTION.md`
- HLS RFC: https://datatracker.ietf.org/doc/html/rfc8216
- HLS.js Docs: https://github.com/video-dev/hls.js/
- FFmpeg HLS Streaming: https://trac.ffmpeg.org/wiki/StreamingGuide
- Next.js Dynamic Routes: https://nextjs.org/docs/app/building-your-application/routing/dynamic-routes
- React Video Player: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/video

## Dependencies to Add

```json
{
  "dependencies": {
    "hls.js": "^1.5.0"
  },
  "devDependencies": {
    "@types/hls.js": "^1.0.0"
  }
}
```

## Environment Variables

Add to `.env-example` and documentation:

```bash
# Transcoding
HD_HOMEY_TRANSCODE_DIR=${HD_HOMEY_DB_PATH}/transcoding  # Temporary HLS files
FFMPEG_PATH=/usr/bin/ffmpeg                              # Override ffmpeg location
```

---

**Estimated Total Time**: 28-35 hours

**Priority Phases** (MVP):
1. Phase 1: Docker & FFmpeg (must have)
2. Phase 2: FFmpeg Detection (must have)
3. Phase 3: Session Manager (must have)
4. Phase 4: HLS Serving (must have)
5. Phase 5: Video Player (must have)
6. Phase 6: Watch Page (must have)

**Secondary Phases** (Nice to have):
7. Phase 7: Admin Settings
8. Phase 8: Status Dashboard
9. Phase 9: Integration Testing
10. Phase 10: Documentation

*This plan should be reviewed before implementation begins. Update as needed during development.*
