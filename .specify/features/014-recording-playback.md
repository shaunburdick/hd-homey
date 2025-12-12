# Feature Specification: Recording Playback

**Feature ID**: `014-recording-playback`  
**Created**: 2025-12-13  
**Status**: Draft  
**Owner**: HD Homey Core Team  
**Version**: 1.0

## Overview

Recording Playback enables users to browse and watch recorded TV shows stored on HDHomeRun recording devices (SCRIBE, SERVIO, or DVR software). Users can view recordings from all configured recording devices in a unified interface, stream recordings through HD Homey's secure proxy, and delete recordings they no longer need. This feature focuses exclusively on playback of existing recordings - not scheduling, guide integration, or recording rule management.

## User Stories

### Story 1: View Available Recordings (Priority: P1)

**As a** user (admin or viewer)  
**I want** to see a list of all available recordings from my HDHomeRun recording devices  
**So that** I can browse and select shows to watch

**Why this priority**: Core functionality - without being able to see recordings, the feature is useless.

**Acceptance Criteria**:
- **Given** I am authenticated, **When** I navigate to the recordings page, **Then** I see all recordings from all configured recording devices
- **Given** recordings exist, **When** I view the list, **Then** each recording shows: title, episode title (if applicable), thumbnail, channel name, recorded date, duration, and which device it's on
- **Given** no recording devices are configured, **When** I view the recordings page, **Then** I see a message explaining that recording devices need to be discovered/added
- **Given** recording devices exist but have no recordings, **When** I view the page, **Then** I see a message that no recordings are available
- **Given** multiple recording devices exist, **When** I view recordings, **Then** recordings from all devices are shown together with clear indication of which device each recording is stored on

---

### Story 2: Toggle Between Grid and Table View (Priority: P2)

**As a** user  
**I want** to switch between grid view (with posters) and table view (with columns)  
**So that** I can browse recordings in my preferred format

**Why this priority**: Improves browsing experience but not essential for basic functionality.

**Acceptance Criteria**:
- **Given** I'm viewing recordings, **When** I click the view toggle button, **Then** the display switches between grid and table view
- **Given** I'm in grid view, **When** viewing recordings, **Then** I see poster images, titles, and basic metadata in a card layout
- **Given** I'm in table view, **When** viewing recordings, **Then** I see recordings in a sortable table with columns: thumbnail, title, episode, channel, date, duration, device
- **Given** I switch view type, **When** I refresh the page, **Then** my preferred view persists (saved in local storage or user preferences)
- **Given** I'm on mobile, **When** viewing recordings, **Then** grid view is responsive and cards stack appropriately

---

### Story 3: Sort and Filter Recordings (Priority: P2)

**As a** user  
**I want** to sort recordings by different criteria  
**So that** I can find specific shows more easily

**Why this priority**: Improves usability, especially for users with many recordings.

**Acceptance Criteria**:
- **Given** I'm in table view, **When** I click a column header, **Then** recordings are sorted by that column (ascending/descending toggle)
- **Given** recordings are displayed, **When** I use the sort dropdown, **Then** I can sort by: date recorded (newest/oldest), title (A-Z), channel name, duration, device name
- **Given** I sort recordings, **When** I refresh the page, **Then** my sort preference persists
- **Given** I have recordings from multiple devices, **When** I use the filter, **Then** I can filter to show recordings from specific devices only
- **Given** I apply filters, **When** viewing results, **Then** the filter state is clearly indicated with option to clear

---

### Story 4: Play Recording (Priority: P1)

**As a** user  
**I want** to click on a recording and watch it  
**So that** I can view my recorded content

**Why this priority**: Core functionality - the entire purpose of the feature.

**Acceptance Criteria**:
- **Given** I'm viewing recordings, **When** I click a recording, **Then** I'm taken to a playback page with the video player
- **Given** I'm on the playback page, **When** the page loads, **Then** the recording starts playing automatically
- **Given** I'm watching a recording, **When** playback starts, **Then** I see standard video controls (play/pause, seek, volume, fullscreen)
- **Given** I'm watching a recording, **When** I seek to a different position, **Then** playback resumes from that position without buffering issues
- **Given** a recording fails to load, **When** an error occurs, **Then** I see a clear error message explaining the issue (device offline, file not found, etc.)
- **Given** I'm watching a recording, **When** I navigate away and return, **Then** playback resumes from where I left off (optional: track position in database)

---

### Story 5: View Recording Details (Priority: P3)

**As a** user  
**I want** to see detailed information about a recording  
**So that** I can decide if I want to watch it

**Why this priority**: Nice-to-have but not critical for basic playback functionality.

**Acceptance Criteria**:
- **Given** I'm viewing recordings, **When** I click "Details" or expand a recording, **Then** I see full metadata: title, episode title, episode number, season, synopsis, original air date, recorded date/time, channel, category (series/movie/sport), image
- **Given** I'm viewing details, **When** the synopsis is long, **Then** it's truncated with "Read more" option
- **Given** I'm viewing details, **When** I click "Play", **Then** playback starts immediately
- **Given** I'm viewing details, **When** I click "Delete", **Then** I see a confirmation dialog before deletion

---

### Story 6: Delete Recording (Priority: P2)

**As a** user  
**I want** to delete recordings I no longer need  
**So that** I can free up storage space on my recording device

**Why this priority**: Important for storage management but not required for playback functionality.

**Acceptance Criteria**:
- **Given** I'm viewing recordings, **When** I click "Delete" on a recording, **Then** I see a confirmation dialog asking if I'm sure
- **Given** I confirm deletion, **When** the request succeeds, **Then** the recording is removed from the list and a success message is shown
- **Given** I confirm deletion, **When** the request fails, **Then** I see an error message explaining why (device offline, permission denied, etc.)
- **Given** I delete a recording, **When** viewing the device's free space (if shown), **Then** the available space increases appropriately
- **Given** I attempt to delete a recording, **When** the recording is currently being played by another user, **Then** I see a warning but can proceed with deletion
- **Given** deletion is in progress, **When** the operation is happening, **Then** I see a loading indicator and cannot trigger multiple deletions

---

### Story 7: Handle Recording Device Offline (Priority: P2)

**As a** user  
**I want** clear feedback when a recording device is offline  
**So that** I understand why recordings aren't loading

**Why this priority**: Error handling is essential for good UX.

**Acceptance Criteria**:
- **Given** a recording device is offline, **When** I view the recordings page, **Then** I see a warning indicator next to that device's name
- **Given** a recording device is offline, **When** I try to play a recording from it, **Then** I see an error message explaining the device is unreachable
- **Given** a recording device is offline, **When** viewing the list, **Then** recordings from that device are still shown but marked as unavailable
- **Given** all recording devices are offline, **When** I view the recordings page, **Then** I see a helpful message suggesting I check network connectivity

---

## Requirements

### Functional Requirements

#### Discovery & Management

- **FR-001**: System MUST discover HDHomeRun recording devices (SCRIBE, SERVIO, DVR software) via UDP broadcast on port 65001 (same discovery as tuners, looking for devices with recording capability)
- **FR-002**: System MUST query discovered devices on port 4999 for `/discover.json` endpoint to identify recording capability (presence of `StorageURL` field)
- **FR-003**: System MUST store recording devices in a separate `recording_devices` database table with fields: id, name, ip_address, base_url, storage_url, friendly_name, created_at, updated_at
- **FR-004**: System MUST allow administrators to manually add recording devices by IP address (fallback for discovery failures)
- **FR-005**: System MUST periodically validate recording device connectivity (same as tuner validation)

#### Recording Listing

- **FR-006**: System MUST fetch recording list from each device's `StorageURL` endpoint (e.g., `http://device-ip:4999/recorded_files.json`)
- **FR-007**: System MUST display recordings from all configured devices in a unified list
- **FR-008**: System MUST show for each recording: Title, EpisodeTitle, EpisodeNumber, Synopsis (truncated), ImageURL (thumbnail), ChannelName, ChannelNumber, Category, StartTime, EndTime, Duration (computed), DeviceName (which device it's stored on)
- **FR-009**: System MUST indicate which device each recording is stored on (device name badge/label)
- **FR-010**: System MUST handle missing metadata gracefully (show "Unknown" or hide field if not provided by device)
- **FR-011**: System MUST support pagination for large recording lists (100+ recordings)

#### View Modes

- **FR-012**: System MUST provide grid view displaying recordings as cards with poster images
- **FR-013**: System MUST provide table view displaying recordings in sortable columns
- **FR-014**: System MUST allow toggling between grid and table view via UI control
- **FR-015**: System MUST persist user's view preference (localStorage or user preferences table)
- **FR-016**: System MUST make grid view responsive on mobile devices (cards stack vertically)

#### Sorting & Filtering

- **FR-017**: System MUST allow sorting recordings by: recorded date (newest first default), title (alphabetical), channel name, duration, device name
- **FR-018**: System MUST support ascending/descending sort order toggle
- **FR-019**: System MUST allow filtering recordings by device (show recordings from specific device only)
- **FR-020**: System MUST clearly indicate active filters/sort with option to reset to defaults
- **FR-021**: System SHOULD persist sort/filter preferences across sessions

#### Playback

- **FR-022**: System MUST generate secure, token-based URLs for recording playback (HMAC-SHA256 tokens, similar to transcoding endpoints)
- **FR-023**: System MUST proxy recording streams through HD Homey (do not expose device IP to clients)
- **FR-024**: System MUST validate playback tokens before serving streams (check signature, expiration)
- **FR-025**: System MUST use the `PlayURL` field from recording metadata as the source stream
- **FR-026**: System MUST support seeking within recordings (pass through HTTP range requests)
- **FR-027**: System MUST use HTML5 video player for recording playback (same player as live TV)
- **FR-028**: System MUST show video controls: play/pause, seek bar, volume, fullscreen
- **FR-029**: System SHOULD support autoplay when navigating to recording playback page
- **FR-030**: System SHOULD track playback position per recording per user (optional, for "resume watching" feature)

#### Deletion

- **FR-031**: System MUST allow users with appropriate permissions to delete recordings
- **FR-032**: System MUST show confirmation dialog before deletion ("Are you sure you want to delete [Title]?")
- **FR-033**: System MUST send DELETE request to recording's `CmdURL` with `cmd=delete` parameter (per HDHomeRun API)
- **FR-034**: System MUST remove deleted recording from UI immediately upon successful deletion
- **FR-035**: System MUST show success message after deletion completes
- **FR-036**: System MUST handle deletion failures gracefully (device offline, file locked, etc.) with clear error messages
- **FR-037**: System MUST NOT allow deletion to occur multiple times while operation is in progress (disable button, show loading)

#### Error Handling

- **FR-038**: System MUST detect when recording device is offline/unreachable
- **FR-039**: System MUST show visual indicator for offline devices in device list
- **FR-040**: System MUST mark recordings from offline devices as unavailable in the list
- **FR-041**: System MUST show helpful error messages when playback fails (device offline, file not found, network error)
- **FR-042**: System MUST log all recording-related errors for debugging

### Non-Functional Requirements

- **NFR-001**: Performance - Recording list should load within 2 seconds (for up to 500 recordings)
- **NFR-002**: Performance - Playback should start within 2-3 seconds of clicking play
- **NFR-003**: Reliability - Playback proxy should handle 99%+ of streams without errors
- **NFR-004**: Security - All playback URLs must use signed tokens (30-minute expiration)
- **NFR-005**: Security - Only authenticated users can view/play recordings (same permissions as live TV)
- **NFR-006**: Security - Recording deletion requires same permissions as live TV access (no special admin-only restriction initially)
- **NFR-007**: Usability - UI must be accessible (WCAG 2.2 Level AA) with keyboard navigation
- **NFR-008**: Usability - Error messages must be clear and actionable (no technical jargon)
- **NFR-009**: Compatibility - Must work in Docker containers (host network mode or proper port mapping for discovery)
- **NFR-010**: Scalability - Must handle multiple recording devices (5+) without performance degradation

### Data Requirements

#### recording_devices Table

```typescript
{
  id: number (primary key, auto-increment)
  name: string (user-friendly name, e.g., "Living Room SCRIBE")
  ip_address: string (IPv4/IPv6 address)
  base_url: string (e.g., "http://192.168.1.100:4999")
  storage_url: string (e.g., "http://192.168.1.100:4999/recorded_files.json")
  friendly_name: string (from device's discover.json)
  version: string (firmware version, optional)
  free_space: bigint (bytes, updated periodically, optional)
  last_seen: datetime (last successful connection)
  created_at: datetime
  updated_at: datetime
}
```

#### user_preferences Table (optional, for view/sort persistence)

```typescript
{
  user_id: number (foreign key to user table)
  preference_key: string (e.g., "recordings_view_mode", "recordings_sort_by")
  preference_value: string (e.g., "grid", "date_desc")
  updated_at: datetime
}
```

#### Recording Metadata (NOT stored, fetched from device)

Data returned from `StorageURL` endpoint:

```typescript
{
  ProgramID: string
  SeriesID: string
  Title: string
  EpisodeTitle: string
  EpisodeNumber: string (e.g., "S03E05")
  Synopsis: string
  ImageURL: string (poster/thumbnail)
  Category: string ("series", "movie", "sport")
  ChannelNumber: string
  ChannelName: string
  ChannelImageURL: string
  StartTime: number (Unix timestamp)
  EndTime: number (Unix timestamp)
  RecordStartTime: number (Unix timestamp)
  RecordEndTime: number (Unix timestamp)
  PlayURL: string (direct stream URL on device)
  CmdURL: string (URL for deletion/commands)
  FileName: string (file path on device)
  DisplayGroupTitle: string (series name for grouping)
}
```

## Technical Constraints

- Must use existing HDTuner discovery mechanism for UDP broadcast (extend to detect recording devices)
- Must NOT use Guide API (`api.hdhomerun.com`) or require `DeviceAuth` tokens (local network only)
- Must work within Next.js server action or API route context (no long-running background processes)
- Must reuse existing stream proxy logic where possible (`src/proxy.ts` patterns)
- Must use Better-Auth for authentication (same permissions model as live TV)
- Must use Drizzle ORM for database operations (recording_devices table)
- Must follow existing token generation pattern for secure playback URLs (HMAC-SHA256)
- Must NOT transcode recordings (proxy as-is, recordings are already in MPEG-TS or MP4 format)
- Must handle HTTP range requests for seeking support
- Should cache recording lists briefly (30-60 seconds) to reduce API calls to devices

## Edge Cases & Error Handling

### Recording Device Discovery

- **What if recording device doesn't respond to UDP discovery?**
  - Provide manual "Add Recording Device" form (IP address input)
  - Check device on port 4999 for `/discover.json` endpoint
  - Verify presence of `StorageURL` field to confirm recording capability
  
- **What if device responds but doesn't have StorageURL?**
  - Skip device (it's a tuner-only device, not a recorder)
  - Log for debugging but don't show error to user

- **What if recording device is a tuner + recorder combo?**
  - Store in both `tuners` and `recording_devices` tables
  - Show in both live TV and recordings sections
  - Link entities via shared device_id or base_url

### Recording List Fetching

- **What if StorageURL endpoint times out?**
  - Show error badge on that device in recordings page
  - Mark recordings from that device as unavailable
  - Log error for debugging
  - Allow retry button

- **What if StorageURL returns malformed JSON?**
  - Log error with response body
  - Show "Unable to load recordings from [device]" message
  - Don't crash entire page (show recordings from working devices)

- **What if recording has missing metadata fields?**
  - Title: Use "Unknown Recording" if missing
  - Episode: Hide episode info if missing
  - Synopsis: Hide or show "No description available"
  - ImageURL: Use placeholder/fallback image
  - Never crash on missing fields

### Playback

- **What if PlayURL is unreachable during playback?**
  - Show video player error: "Unable to load recording. Device may be offline."
  - Provide "Retry" button
  - Log full error details

- **What if user tries to play recording while device is offline?**
  - Check device connectivity before generating playback token
  - Return 503 error with clear message: "Recording device is currently offline"
  - Suggest checking network connection

- **What if recording is deleted while user is watching?**
  - Video player will show error when stream ends/disconnects
  - Show error: "This recording is no longer available"
  - Offer button to return to recordings list

- **What if token expires during playback?**
  - Video player will fail to seek or resume
  - Generate new token automatically on seek attempts (seamless token refresh)
  - Log token expiration events

### Deletion

- **What if recording is deleted while another user is watching?**
  - Allow deletion to proceed (device will terminate active stream)
  - Watching user will see playback error
  - Optionally: check for active streams before deletion (future enhancement)

- **What if deletion fails due to device offline?**
  - Show error: "Unable to delete recording. Device is offline."
  - Keep recording in list (deletion failed)
  - Don't show success message

- **What if CmdURL is missing from recording metadata?**
  - Hide "Delete" button for that recording
  - Log warning for debugging
  - Recordings without CmdURL are read-only

### Multiple Devices

- **What if same recording exists on multiple devices?**
  - Show as separate entries (they ARE different files)
  - Indicate device name clearly on each
  - User can choose which copy to play/delete

- **What if one device is fast and another is slow to respond?**
  - Load recordings incrementally (show results as they arrive)
  - Don't wait for all devices before showing any results
  - Show loading indicator for pending devices

### Permissions

- **What if user's permissions change while viewing recordings?**
  - Next page load will enforce new permissions
  - Middleware already validates session on every request
  - Playback tokens include user ID validation

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can browse recordings from all configured devices in under 2 seconds
- **SC-002**: Playback starts within 3 seconds of clicking a recording
- **SC-003**: 95%+ of recording playback requests succeed without errors (device online)
- **SC-004**: Recording deletion completes in under 1 second
- **SC-005**: Error messages are clear and actionable (user testing validation)

### User Validation

- [ ] Feature tested with HDHomeRun SCRIBE device
- [ ] Feature tested with HDHomeRun SERVIO device  
- [ ] Feature tested with HDHomeRun DVR software (if available)
- [ ] Tested with multiple recording devices (2+)
- [ ] Tested with large recording libraries (100+ recordings)
- [ ] Feedback collected from at least 3 users (admins and viewers)
- [ ] Accessibility tested with keyboard navigation and screen reader

## Dependencies

- **Depends On**: 
  - SPEC-001 (Tuner Management) - Device management patterns
  - SPEC-002 (Channel Streaming) - Stream proxy patterns
  - SPEC-003 (User Authentication) - Permission model
  - SPEC-005 (Video Transcoding) - Token generation patterns (HMAC-SHA256)
  - SPEC-007 (Tuner Autodiscovery) - UDP discovery mechanism (to be extended)
  - Node.js `dgram` module - UDP broadcast for device discovery
  - HDHomeRun Record Engine API - Port 4999 endpoints
  
- **Blocks**: 
  - None - This is a standalone feature
  
- **Related To**: 
  - SPEC-007 (Tuner Autodiscovery) - Will be updated to discover recording devices
  - Live TV streaming - Similar playback and proxy patterns

## Out of Scope

Explicitly list what this feature does NOT include:

- ❌ **Recording scheduling or rule management** - Use HDHomeRun app for this
- ❌ **Guide/EPG integration** - No TV guide data or "api.hdhomerun.com" usage
- ❌ **Recording from live TV** - Not building DVR functionality
- ❌ **Series management** - No grouping by series or "record all episodes" rules
- ❌ **Transcoding of recordings** - Proxy as-is (recordings are already in compatible formats)
- ❌ **Resume watching from last position** - Possible future enhancement, not v1
- ❌ **Cloud storage of recordings** - Only local network devices supported
- ❌ **Recording analytics** - No "most watched" or viewing history tracking
- ❌ **Closed captions/subtitles** - If present in recording, will pass through, but no subtitle management
- ❌ **Recording import/export** - No moving recordings between devices
- ❌ **Storage quota management** - No warnings about low disk space (devices handle this)
- ❌ **Recording quality selection** - Play what was recorded, no quality options

## Open Questions

- [ ] Should we group recordings by series/show name? **Future enhancement** - Start with flat list, add grouping later if users request it
- [ ] Should we support "rerecord" option when deleting? **Yes** - HDHomeRun API supports `rerecord=1` parameter, should expose in confirmation dialog
- [ ] How long should playback tokens be valid? **30 minutes** - Same as transcoding tokens, renewable on seek
- [ ] Should admins have different permissions than viewers for recordings? **No initially** - Same as live TV (if you can watch, you can delete), revisit if users request granular control
- [ ] Should we cache recording lists? **Yes, 60 seconds** - Reduce API calls, configurable cache TTL
- [ ] Should we show storage capacity/free space? **No** - Out of scope per user request, not managing new recordings
- [ ] Should we support search within recordings? **Future enhancement** - Start with sort/filter, add search if library size demands it
- [ ] Should we auto-refresh recording list periodically? **No** - Manual refresh button only, avoid unnecessary API calls
- [ ] Should we validate recording file still exists before playback? **No** - Let playback fail naturally with error message, checking adds latency
- [ ] Should we support downloading recordings? **No** - Only streaming, no download option (bandwidth concerns)

## References

- HDHomeRun Record Engine API: https://github.com/Silicondust/documentation/wiki/Old-Record-Engine-Status
- Recording List API: `<StorageURL>` endpoint (e.g., `http://device-ip:4999/recorded_files.json`)
- Recording Deletion API: https://github.com/Silicondust/documentation/wiki/Old-Deleting-Recordings
- HDHomeRun Device Discovery: https://www.silicondust.com/hdhomerun/developers/
- Related specs:
  - `.specify/features/001-tuner-management.md` - Device management patterns
  - `.specify/features/002-channel-streaming.md` - Stream proxy patterns
  - `.specify/features/005-video-transcoding.md` - Token generation (HMAC-SHA256)
  - `.specify/features/007-tuner-autodiscovery.md` - UDP discovery (to be extended)
- HDHomeRun SCRIBE: https://www.silicondust.com/product/hdhomerun-scribe-16/
- HDHomeRun SERVIO: https://www.silicondust.com/product/hdhomerun-servio/

---

**Next Steps**:
1. Review and approve this specification
2. Update SPEC-007 (Tuner Autodiscovery) to include recording device discovery
3. Create implementation plan in `specs/014-recording-playback/`
4. Break down into tasks
5. Implement with TDD approach

---

*Version 1.0 - Draft - Awaiting review and clarification*
