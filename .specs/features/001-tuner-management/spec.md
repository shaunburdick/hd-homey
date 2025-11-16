# Feature Specification: Tuner Management

**Feature ID**: `001-tuner-management`  
**Created**: 2025-11-15  
**Status**: Complete (Existing Feature)  
**Owner**: HD Homey Core Team

## Overview

Tuner Management allows administrators to configure, monitor, and manage HD HomeRun tuner devices. Users can add new tuners by providing a name and network address, view tuner details including channel lineups, and manually trigger channel scans to update available channels.

## User Stories

### Story 1: Add New Tuner (Priority: P1)

**As an** administrator  
**I want** to add a new HD HomeRun tuner to the system  
**So that** I can make its channels available for streaming

**Why this priority**: Core functionality - without tuners, the application has no content to serve

**Acceptance Criteria**:
- **Given** I am logged in as an admin, **When** I navigate to `/tuners/new`, **Then** I see a form to add a tuner
- **Given** I fill in tuner name and path, **When** I submit the form, **Then** the tuner is created and I'm redirected to its detail page
- **Given** I submit invalid data, **When** validation fails, **Then** I see error messages indicating what's wrong

---

### Story 2: View Tuner List (Priority: P1)

**As a** user  
**I want** to see all configured tuners  
**So that** I can select which tuner to manage or view

**Why this priority**: Primary navigation for the application

**Acceptance Criteria**:
- **Given** I am logged in, **When** I navigate to `/tuners`, **Then** I see a list of all active tuners
- **Given** there are tuners in the system, **When** I view the list, **Then** deleted tuners are not shown
- **Given** I click a tuner name, **When** the link is followed, **Then** I navigate to that tuner's detail page

---

### Story 3: View Tuner Details & Channels (Priority: P1)

**As a** user  
**I want** to view a tuner's details and channel lineup  
**So that** I can see what channels are available and access them

**Why this priority**: Core viewing experience

**Acceptance Criteria**:
- **Given** I navigate to `/tuners/[id]`, **When** the page loads, **Then** I see the tuner name and channel list
- **Given** the tuner has channels, **When** I view the page, **Then** channels are sorted by guide number
- **Given** I click a channel, **When** the link is followed, **Then** I navigate to the channel detail page

---

### Story 4: Refresh Channel Lineup (Priority: P2)

**As an** administrator  
**I want** to manually refresh a tuner's channel lineup  
**So that** new channels or changes are reflected immediately

**Why this priority**: Important for maintenance but not required for initial use

**Acceptance Criteria**:
- **Given** I am on a tuner detail page, **When** I click "Refresh Channels", **Then** the system polls the tuner for updated channels
- **Given** new channels are found, **When** the refresh completes, **Then** they appear in the channel list
- **Given** channels are removed from the tuner, **When** the refresh completes, **Then** they are marked inactive (soft deleted)

---

### Story 5: Edit Tuner Settings (Priority: P2)

**As an** administrator  
**I want** to edit a tuner's name or network path  
**So that** I can fix configuration errors or update network locations

**Why this priority**: Necessary for maintenance but not frequent operation

**Acceptance Criteria**:
- **Given** I am on a tuner detail page, **When** I click "Edit Tuner", **Then** I see a form with current values
- **Given** I update the values, **When** I submit the form, **Then** the tuner is updated
- **Given** I provide invalid data, **When** validation fails, **Then** I see appropriate error messages

---

### Story 6: Automatic Channel Scanning (Priority: P3)

**As a** user  
**I want** the system to automatically scan for channels when a tuner is first added  
**So that** I don't have to manually trigger the initial scan

**Why this priority**: Nice-to-have quality of life improvement

**Acceptance Criteria**:
- **Given** I add a new tuner, **When** the tuner is created, **Then** an initial channel scan is automatically triggered
- **Given** the scan completes, **When** I navigate to the tuner page, **Then** channels are already populated

## Requirements

### Functional Requirements

- **FR-001**: System MUST allow administrators to create new tuner records with name and network path
- **FR-002**: System MUST validate that tuner name is not empty and path is a valid URL
- **FR-003**: System MUST display a list of all active (non-deleted) tuners
- **FR-004**: System MUST display tuner details including name, path, and channel lineup
- **FR-005**: System MUST allow manual refresh of channel lineups from HD HomeRun device
- **FR-006**: System MUST soft-delete channels that no longer appear in lineup
- **FR-007**: System MUST update or create channels when refreshing lineup
- **FR-008**: System MUST allow administrators to edit tuner name and path
- **FR-009**: System MUST sort channels by guide number for display

### Non-Functional Requirements

- **NFR-001**: Performance - Tuner list page must load in under 500ms
- **NFR-002**: Performance - Channel refresh should complete within 5 seconds
- **NFR-003**: Usability - Forms must have clear validation error messages
- **NFR-004**: Reliability - Failed channel scans must not leave database in inconsistent state
- **NFR-005**: Security - Only authenticated users can view tuners, only admins can modify

### Data Requirements

- **Tuner Entity**:
  - `id`: Auto-incrementing primary key
  - `name`: Display name (required, max 255 chars)
  - `path`: Network address/URL to HD HomeRun device (required)
  - `last_scanned`: Timestamp of last successful channel scan
  - `is_active`: Boolean flag (default true)
  - `created_at`: Creation timestamp
  - `modified_at`: Last modification timestamp
  - `deleted_at`: Soft delete timestamp (null if active)

- **Channel Entity** (related):
  - Channels belong to a tuner (foreign key)
  - Channels store guide number, name, codecs, HD flag, and stream URL

## Technical Constraints

- Must use Drizzle ORM for all database operations
- Must use Next.js server components for pages
- Must use server actions for form submissions
- Must follow soft-delete pattern (set `deleted_at`, never hard delete)
- Must use TypeBox validation for form data
- Channel data must match HD HomeRun `/lineup.json` format

## Edge Cases & Error Handling

- **Unreachable tuner**: What if the tuner path is invalid or network is down during channel refresh?
  - Show error message to user
  - Keep existing channel data
  - Log error for debugging

- **Duplicate tuner names**: Should we allow multiple tuners with same name?
  - Yes, name is just display - path is what matters
  - Encourage unique names but don't enforce

- **Concurrent refreshes**: What if two users refresh channels simultaneously?
  - Database transaction handles concurrency
  - Last write wins

- **Invalid channel data**: What if HD HomeRun returns malformed JSON?
  - Catch parsing errors
  - Show error message
  - Don't modify database

## Success Criteria

### Measurable Outcomes

- **SC-001**: 100% of users can successfully add a tuner on first attempt
- **SC-002**: Channel refresh completes in under 5 seconds for typical lineup (50-100 channels)
- **SC-003**: Zero data loss during channel updates (soft deletes only)

### User Validation

- [x] Feature tested with multiple HD HomeRun device models
- [x] Supports HDHomeRun Connect and Extend devices
- [x] Interface is mobile-responsive

## Dependencies

- **Depends On**: 
  - User authentication system (must be logged in)
  - Database schema with `tuners` and `channels` tables
  - HD HomeRun device API (`/lineup.json` endpoint)

- **Blocks**: 
  - Channel streaming feature (needs tuners to exist)
  - Watch page (needs channels to display)

- **Related To**: 
  - Channel streaming (uses tuner/channel data)

## Out of Scope

Explicitly list what this feature does NOT include:

- ❌ Automatic discovery of HD HomeRun devices on network
- ❌ Scheduled/automatic channel scans
- ❌ Channel grouping or custom organization
- ❌ Channel favorites or hide/show toggles
- ❌ Tuner health monitoring or alerts
- ❌ Batch operations (delete multiple tuners at once)

## Implementation Notes

This feature is already implemented with the following files:

**Database Schema**: `src/lib/database/schema.ts`
```typescript
- tuners table with all required fields
- channels table with foreign key to tuners
- relations defined between tuners and channels
```

**Pages**:
- `/tuners` - List all tuners (`src/app/(protected)/tuners/page.tsx`)
- `/tuners/new` - Create tuner form (`src/app/(protected)/tuners/new/page.tsx`)
- `/tuners/[id]` - Tuner detail with channels (`src/app/(protected)/tuners/[id]/page.tsx`)
- `/tuners/[id]/edit` - Edit tuner form (`src/app/(protected)/tuners/[id]/edit/page.tsx`)

**Server Actions**: `src/app/(protected)/tuners/actions.ts`
- `createTuner()` - Handles tuner creation with validation

**API Routes**:
- `POST /api/tuners/[id]/poll` - Triggers channel refresh
- `GET /api/tuners` - List tuners (API access)
- `GET/PUT/DELETE /api/tuners/[id]` - Individual tuner operations

**Business Logic**: `src/lib/hdhr/tuner.ts`
- `HDTuner` class handles communication with HD HomeRun devices
- `lineup()` - Fetches channel list from device
- `updateLineup()` - Updates database with current channels
- `stream()` - Gets video stream from tuner (used by streaming feature)

**Validation**: `src/lib/database/validate.ts`
- `isTunerValid()` - Validates tuner data
- `getTunerErrors()` - Returns validation errors

## References

- HD HomeRun API Documentation: https://www.silicondust.com/hdhomerun/hdhomerun_http_development.pdf
- Drizzle ORM Docs: https://orm.drizzle.team/
- Next.js App Router: https://nextjs.org/docs/app
