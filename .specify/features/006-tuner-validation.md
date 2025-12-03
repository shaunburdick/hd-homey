# Feature Specification: Tuner Connection Validation

**Feature ID**: `006-tuner-validation`  
**Created**: 2025-11-19  
**Status**: Complete  
**Owner**: HD Homey Core Team

## Overview

Tuner Connection Validation allows administrators to test HDHomeRun tuner connectivity before saving configuration. Users can click a "Test Connection" button on tuner forms to validate the path points to a valid HDHomeRun device, reducing configuration errors and improving user experience.

## User Stories

### Story 1: Test Connection on New Tuner (Priority: P1)

**As an** administrator  
**I want** to test a tuner connection before saving  
**So that** I can verify the configuration is correct without committing it to the database

**Why this priority**: Prevents invalid configurations and reduces frustration during setup

**Acceptance Criteria**:
- **Given** I am on the new tuner form, **When** I enter a tuner path and click "Test Connection", **Then** the system validates the path connects to an HDHomeRun device
- **Given** the connection test succeeds, **When** validation completes, **Then** I see a success message with device details
- **Given** the connection test fails, **When** validation completes, **Then** I see a clear error message explaining the issue

---

### Story 2: Test Connection on Edit Tuner (Priority: P1)

**As an** administrator  
**I want** to test tuner connection when editing configuration  
**So that** I can verify path changes are valid before saving

**Why this priority**: Prevents breaking existing working configurations with invalid changes

**Acceptance Criteria**:
- **Given** I am editing a tuner, **When** I modify the path and click "Test Connection", **Then** the new path is validated
- **Given** the test succeeds, **When** validation completes, **Then** I see confirmation the new path is valid
- **Given** the test fails, **When** validation completes, **Then** the original configuration remains unchanged

---

### Story 3: Non-Blocking Validation (Priority: P2)

**As an** administrator  
**I want** connection testing to not block form submission  
**So that** I can save configurations even if testing fails (for offline scenarios)

**Why this priority**: Allows advanced users to configure tuners that may be temporarily offline

**Acceptance Criteria**:
- **Given** connection test fails, **When** I submit the form, **Then** the tuner is still created/updated
- **Given** connection test succeeds, **When** I submit the form, **Then** the tuner is created/updated with validated configuration

## Requirements

### Functional Requirements

- **FR-001**: System MUST provide a "Test Connection" button on new tuner form
- **FR-002**: System MUST provide a "Test Connection" button on edit tuner form
- **FR-003**: System MUST validate tuner path connects to HDHomeRun device
- **FR-004**: System MUST check for `/lineup.json` endpoint availability
- **FR-005**: System MUST display success message on successful validation
- **FR-006**: System MUST display clear error message on validation failure
- **FR-007**: System MUST allow form submission regardless of test result

### Non-Functional Requirements

- **NFR-001**: Performance - Connection test must complete within 5 seconds
- **NFR-002**: Usability - Test button must be clearly visible and labeled
- **NFR-003**: Usability - Success/error messages must be dismissable
- **NFR-004**: Reliability - Failed tests must not prevent form submission
- **NFR-005**: Security - Connection test must run server-side, not expose internals to client

### Data Requirements

- **Validation Response**:
  - `success`: Boolean indicating test result
  - `message`: Human-readable message
  - `channelCount`: Number of channels found (on success)
  - `error`: Error details (on failure)

## Technical Constraints

- Must use server action for validation (no client-side requests to tuner)
- Must not modify database during validation
- Must reuse existing HDTuner class lineup() method
- Must handle network timeouts gracefully
- Must follow existing form patterns (useActionState)

## Edge Cases & Error Handling

- **Network timeout**: What if tuner doesn't respond within 5 seconds?
  - Abort request with timeout error
  - Show clear timeout message
  - Suggest checking network/firewall

- **Invalid URL format**: What if path isn't a valid URL?
  - Validate URL format before making request
  - Show format error message

- **Non-HDHomeRun device**: What if path points to wrong device?
  - Check response format matches HDHomeRun lineup.json
  - Show "not a valid HDHomeRun device" error

- **Empty lineup**: What if device returns no channels?
  - Consider valid (device may not be configured)
  - Show warning but allow save

- **CORS/Network restrictions**: What if browser can't reach tuner?
  - Server-side request avoids CORS
  - Handle DNS/network errors gracefully

## Success Criteria

### Measurable Outcomes

- **SC-001**: 90% of users test connection before first save
- **SC-002**: Configuration errors reduced by 50%
- **SC-003**: Connection test completes in under 3 seconds average

### User Validation

- [x] Feature tested with unreachable tuners
- [x] Feature tested with valid HDHomeRun devices
- [x] Feature tested with non-HDHomeRun devices
- [x] Error messages clear and actionable

## Dependencies

- **Depends On**: 
  - Existing HDTuner class and lineup() method
  - Tuner form components (new and edit)
  - Server actions infrastructure

- **Blocks**: 
  - None (enhancement to existing feature)

- **Related To**: 
  - SPEC-001 Tuner Management

## Out of Scope

- ❌ Auto-discovery of HDHomeRun devices
- ❌ Testing specific channel availability
- ❌ Network diagnostics or ping functionality
- ❌ Saving "last good configuration" for rollback

## Implementation Notes

### Server Action
New server action `validateTunerConnection` in `src/app/(protected)/tuners/actions.ts`:
- Validates URL format
- Creates HDTuner instance with provided path
- Calls lineup() with 5-second timeout using Promise.race
- Returns ValidationResult with success/message/channelCount/error
- Handles common errors: timeout, ENOTFOUND, ECONNREFUSED, invalid response

### Client Components
Updated `src/app/(protected)/tuners/new/page.tsx` and `src/app/(protected)/tuners/[id]/edit/EditTunerForm.tsx`:
- Added "Test Connection" button next to form submission
- Uses separate useActionState for validation (doesn't interfere with form submission)
- Displays validation results in styled alert box (green for success, red for error)
- Button disabled when path is empty or during testing
- Form submission remains enabled regardless of test result

### Timeout Handling
Uses Promise.race with 5-second timeout promise to enforce connection timeout.

## References

- Related specs: SPEC-001 Tuner Management
- HDHomeRun API: https://www.silicondust.com/hdhomerun/developers/
- Next.js Server Actions: https://nextjs.org/docs/app/building-your-application/data-fetching/server-actions-and-mutations

---

*Implementation in progress*
