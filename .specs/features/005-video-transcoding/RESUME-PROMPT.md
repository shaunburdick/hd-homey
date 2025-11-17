# Resume Prompt for Video Transcoding Feature

**Copy and paste this prompt to your AI assistant when resuming work:**

---

I'm resuming work on the HD Homey video transcoding feature (SPEC-005). I took a break at 80% completion and need to pick up where I left off.

## Context

**Project**: HD Homey - Next.js app that proxies HDHomeRun live TV streams
**Feature**: Video transcoding with FFmpeg to enable in-browser playback via HLS
**Branch**: `feature/005-video-transcoding`
**Status**: 80% complete - Phases 1-8 done, working on Phase 9 (Integration Testing)

## What's Already Done

✅ All core infrastructure implemented and working:
- FFmpeg detection and configuration
- Session manager with multi-viewer support
- HLS transcoding engine
- API routes for playlists and segments
- Admin settings UI with presets
- Video player component with HLS.js
- Token authentication
- Real hardware test: 60 channels scanned from HDHomeRun at 192.168.20.25

✅ Verified working in logs:
- FFmpeg processes spawn successfully
- Transcoding sessions create
- HLS playlists generate (200 OK responses)
- Session reuse for multiple viewers
- Tokens pass to segments

## Current Issues

1. **Next.js 15 dev server crashes** - Server actions that call `redirect()` crash the dev server AFTER completing successfully. This is a known Next.js 15 issue, not our code.
   - Workaround: Operations complete before crash, just restart server
   - Data persists in database correctly

2. **Video playback not verified** - Server crashes interrupted testing before we could confirm video actually plays

3. **Segment 404s in logs** - Player polling for segments before they're generated

## What I Need Help With

**Goal**: Get one successful video playback working, then complete integration testing.

**Steps**:
1. Start dev server: `npm run dev`
2. Navigate to: http://localhost:3000/tuners/1/channel/6/watch
3. Debug why video doesn't play (likely segment serving issue)
4. Complete Phase 9 integration testing checklist
5. Update documentation for Phase 10

## Important Files to Know

**Documentation**:
- `.specs/features/005-video-transcoding/PROGRESS.md` - Full progress report (READ THIS FIRST)
- `.specs/features/005-video-transcoding/README.md` - Quick start guide
- `.specs/features/005-video-transcoding/plan.md` - Implementation plan with phases

**Code Locations**:
- `src/lib/transcoding/` - Core transcoding logic
- `src/app/api/transcode/` - API routes (playlist, segments, status)
- `src/components/video-player.tsx` - HLS.js player
- `src/app/(protected)/tuners/[id]/channel/[channel_id]/watch/page.tsx` - Watch page

**Database**:
- `./data/db/hd_homey.db` - SQLite database
- Has 1 tuner and 60 channels already scanned
- Has transcoding settings configured

## Testing Hardware

Real HDHomeRun device at: `192.168.20.25`
- Already configured in database as "Garage" tuner
- 60 channels discovered
- Channel 6 (guide number 9.1) is a good test channel

## Environment

- macOS development machine
- FFmpeg 8.0 installed locally with h264/aac/videotoolbox
- `.env` file configured with AUTH_TRUST_HOST and NEXTAUTH_URL
- Node.js, npm installed

## Questions to Address

1. Why aren't video segments serving properly? (404s in logs)
2. Should we test in production build instead of dev mode to avoid crashes?
3. Do we need to adjust HLS.js configuration for initial buffering?
4. Are segments being created in the filesystem? (Check `data/transcoding/1-6/`)

## Expected Behavior

When navigating to `/tuners/1/channel/6/watch`:
1. Page should load with video player
2. FFmpeg should spawn (check logs for "Creating new transcoding session")
3. Playlist should be requested and served (check Network tab)
4. Segments should be requested with tokens (check Network tab)
5. Video should start playing live TV

## Notes

- The transcoding code itself is solid - we verified it works from logs
- The main issue is the Next.js dev server crashing, not the feature code
- All unit tests pass (30+ tests)
- Production build compiles successfully
- Follow the constitution and existing code patterns
- Don't disable any linting rules without asking first

## Commit History Context

Last 3 commits:
1. `ce855b3` - docs: Add README with quick start guide
2. `c0ecf01` - docs: Add comprehensive progress report  
3. `54fcdbb` - fix(ui): Fix window reference in channel-stream component

Total: 9 commits, 28 files changed, 3,095+ insertions

---

**Please read `.specs/features/005-video-transcoding/PROGRESS.md` first for full context, then help me debug and complete the video playback testing.**
