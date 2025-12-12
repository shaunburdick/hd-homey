# Feature Specification: Tuner Autodiscovery

**Feature ID**: `007-tuner-autodiscovery`  
**Created**: 2025-11-20  
**Last Updated**: 2025-12-13  
**Status**: Draft  
**Owner**: HD Homey Core Team  
**Version**: 1.1

## Overview

Tuner Autodiscovery enables administrators to automatically detect HDHomeRun devices on the local network through UDP broadcast discovery, eliminating the need to manually lookup device IP addresses or URLs. Users can initiate a network scan, view discovered devices with their details, and add them to the system with pre-populated information.

**Version 1.1 Updates**: Extended to support discovery of HDHomeRun recording devices (SCRIBE, SERVIO, DVR software) in addition to tuner-only devices. Discovery now identifies device capabilities (tuner, recording, or both) and allows adding to appropriate system tables.

## User Stories

### Story 1: Discover HDHomeRun Devices on Network (Priority: P2)

**As an** administrator  
**I want** to automatically discover HDHomeRun devices on my network  
**So that** I don't have to manually find IP addresses or device URLs

**Why this priority**: Quality-of-life improvement that simplifies initial setup and ongoing management. Manual entry is still available, so this is convenience rather than core functionality.

**Acceptance Criteria**:
- **Given** I am on the tuners page, **When** I click "Discover Devices", **Then** the system initiates a UDP broadcast discovery scan
- **Given** the discovery scan is running, **When** devices respond, **Then** I see a list of discovered devices with their details
- **Given** discovery completes, **When** no devices are found, **Then** I see a helpful message explaining why (network configuration, no devices, etc.)
- **Given** multiple devices are on the network, **When** discovery completes, **Then** all devices are listed with their unique identifiers
- **Given** a device has recording capability, **When** discovery completes, **Then** the device is marked with a "Recording" badge or indicator
- **Given** a device has both tuner and recording capability, **When** viewing discovered devices, **Then** both capabilities are clearly indicated

---

### Story 2: Add Discovered Device with Pre-filled Information (Priority: P2)

**As an** administrator  
**I want** to add a discovered device with one click  
**So that** I don't have to manually type device details

**Why this priority**: Completes the autodiscovery workflow - discovery alone isn't useful without easy addition

**Acceptance Criteria**:
- **Given** I see discovered devices, **When** I click "Add" on a device, **Then** I'm taken to the add tuner form with name and path pre-filled
- **Given** I'm on the pre-filled form, **When** I submit without changes, **Then** the tuner is created with discovered information
- **Given** I'm on the pre-filled form, **When** I modify the name or path, **Then** my changes are used instead of discovered values
- **Given** a discovered device is already added, **When** I view discovered devices, **Then** that device shows "Already Added" status
- **Given** a discovered device has recording capability, **When** I click "Add", **Then** I'm prompted to add as tuner, recording device, or both
- **Given** a device has both capabilities, **When** I choose "both", **Then** entries are created in both tuners and recording_devices tables

---

### Story 3: Re-discover Devices (Priority: P3)

**As an** administrator  
**I want** to re-run discovery without leaving the page  
**So that** I can find newly connected devices or retry if initial scan failed

**Why this priority**: Nice-to-have for troubleshooting but not critical for primary workflow

**Acceptance Criteria**:
- **Given** I've completed a discovery scan, **When** I click "Scan Again", **Then** the previous results are cleared and a new scan starts
- **Given** a device was not found in first scan, **When** I reconnect it and re-scan, **Then** it appears in the new results
- **Given** I run multiple scans, **When** viewing results, **Then** only the most recent scan results are displayed

---

### Story 4: Handle Discovery Failures Gracefully (Priority: P2)

**As an** administrator  
**I want** clear feedback when discovery fails  
**So that** I understand what went wrong and how to fix it

**Why this priority**: Error handling is essential for good UX, especially for network-related operations

**Acceptance Criteria**:
- **Given** discovery times out, **When** no responses received, **Then** I see a message explaining possible network issues
- **Given** UDP broadcast is blocked, **When** discovery fails, **Then** I see guidance to check firewall or network settings
- **Given** discovery fails, **When** I view the page, **Then** I still have the option to manually add a tuner
- **Given** discovery encounters an error, **When** the error occurs, **Then** error details are logged for debugging

---

## Requirements

### Functional Requirements

- **FR-001**: System MUST send UDP broadcast packets on port 65001 to discover HDHomeRun devices
- **FR-002**: System MUST listen for device responses for at least 1 second (configurable timeout)
- **FR-003**: System MUST parse discovery response packets according to HDHomeRun protocol
- **FR-004**: System MUST display discovered devices with: name, IP address, device ID, base URL, tuner count
- **FR-005**: System MUST allow administrators to initiate discovery from the tuners list page
- **FR-006**: System MUST indicate which discovered devices are already configured in the system
- **FR-007**: System MUST pre-fill the add tuner form with discovered device information
- **FR-008**: System SHOULD handle both IPv4 and IPv6 discovery (IPv4 required, IPv6 nice-to-have)
- **FR-009**: System SHOULD deduplicate devices that respond on multiple network interfaces
- **FR-010**: System MUST allow manual tuner addition even if discovery fails
- **FR-011**: System MUST query discovered devices on port 4999 for `/discover.json` to determine recording capability (presence of `StorageURL` field)
- **FR-012**: System MUST indicate recording capability in discovered device list (badge, icon, or label)
- **FR-013**: System MUST allow adding discovered devices as tuner-only, recording-only, or both
- **FR-014**: System MUST check if device is already added as tuner, recording device, or both before showing "Add" option
- **FR-015**: System MUST extract `StorageURL` from `/discover.json` response for recording-capable devices

### Non-Functional Requirements

- **NFR-001**: Performance - Discovery scan should complete within 2-5 seconds
- **NFR-002**: Reliability - Failed discovery must not affect existing tuner functionality
- **NFR-003**: Usability - Discovery UI must provide clear status feedback (scanning, found X devices, timeout)
- **NFR-004**: Security - Only authenticated administrators can initiate discovery
- **NFR-005**: Compatibility - Must work in Docker containers (requires host network mode or similar)
- **NFR-006**: Portability - Pure TypeScript/Node.js implementation (no native dependencies)

### Data Requirements

- **Discovered Device (transient)**:
  - `ip_address`: IPv4 or IPv6 address (string)
  - `device_id`: HDHomeRun device ID (hex string)
  - `base_url`: Base URL for device API (string)
  - `lineup_url`: Channel lineup URL (string)
  - `tuner_count`: Number of tuners (number)
  - `device_type`: Type of device (tuner, storage, etc.)
  - `is_legacy`: Whether device uses legacy protocol (boolean)
  - `has_recording`: Whether device has recording capability (boolean) - NEW
  - `storage_url`: Recording storage URL if available (string, optional) - NEW
  - `friendly_name`: Device friendly name from discover.json (string, optional) - NEW
  - `free_space`: Available storage in bytes (number, optional) - NEW

- **No persistent storage required** - discovery results are transient and only used to populate tuner/recording device form

## Technical Constraints

- Must use Node.js built-in `dgram` module for UDP operations
- Must NOT use native C library (libhdhomerun) to avoid compilation dependencies
- Must work within Next.js server action or API route context
- Must handle UDP socket lifecycle properly (create, bind, send, listen, close)
- Must parse binary packet format according to HDHomeRun specification
- Should implement timeout mechanism (default 1-2 seconds)
- Must respect network broadcast permissions (some networks block broadcasts)
- Must query port 4999 for `/discover.json` after initial UDP discovery to detect recording capability
- Must handle HTTP requests to `:4999/discover.json` with timeout (2 seconds max)
- Must parse JSON response from recording devices to extract `StorageURL` and other recording metadata

## Edge Cases & Error Handling

### Network Configuration Issues

- **What if UDP broadcast is blocked by firewall?**
  - Show error message explaining firewall/network requirements
  - Provide fallback to manual entry
  - Log error for troubleshooting

- **What if running in Docker without host network mode?**
  - Detect container environment
  - Show warning about network mode requirements
  - Provide documentation link for Docker configuration

### Multiple Network Interfaces

- **What if device responds on multiple interfaces?**
  - Deduplicate by device ID
  - Prefer IPv4 over IPv6 link-local
  - Show best/primary interface in results

### Device State

- **What if device is already configured in system?**
  - Mark as "Already Added" in discovery results
  - Allow viewing details but disable "Add" button
  - Provide link to existing tuner page
  - Check both tuners AND recording_devices tables to determine "already added" status

- **What if device responds but is unreachable for channel scan?**
  - Still allow adding to system
  - Show warning that connectivity test is recommended
  - Channel scan will fail normally with existing error handling

- **What if device has recording capability but user only wants to add as tuner?**
  - Allow user to choose which capability to add (tuner, recording, or both)
  - Show checkbox or radio options during add flow
  - Save to appropriate table(s) based on selection

- **What if port 4999 query times out but UDP discovery succeeded?**
  - Mark device as tuner-only (assume no recording capability)
  - Allow user to manually add as recording device later if needed
  - Log timeout for debugging

- **What if device has StorageURL but reports tuner_count=0?**
  - Mark as recording-only device
  - Only show option to add as recording device
  - Don't show in tuner list

### Concurrent Operations

- **What if multiple admins run discovery simultaneously?**
  - Each gets their own results (transient, not shared)
  - No database locking issues since read-only until "Add" is clicked

### Protocol Compatibility

- **What if device uses legacy discovery protocol?**
  - Parse both modern and legacy response formats
  - Mark legacy devices in results
  - All devices should be addable regardless of protocol version

## Success Criteria

### Measurable Outcomes

- **SC-001**: 90% of discovery scans complete successfully in under 3 seconds
- **SC-002**: Discovered devices can be added without manual URL entry
- **SC-003**: Error messages provide actionable guidance for users

### User Validation

- [ ] Feature tested with various HDHomeRun models (HD, Connect, Quatro, etc.)
- [ ] Tested on different network configurations (simple LAN, VLAN, Docker)
- [ ] Feedback collected from at least 3 administrators
- [ ] Works with both IPv4 and IPv6 networks (IPv4 required)

## Dependencies

- **Depends On**: 
  - SPEC-001 (Tuner Management) - Must have existing tuner add workflow
  - SPEC-014 (Recording Playback) - Must have recording device management workflow
  - Node.js `dgram` module - UDP socket support
  - Node.js `http` or `fetch` - HTTP requests to `:4999/discover.json`
  
- **Blocks**: 
  - None - This is an optional convenience feature
  
- **Related To**: 
  - SPEC-006 (Tuner Validation) - Discovery provides data that validation can verify
  - SPEC-014 (Recording Playback) - Recording device discovery enables this feature
  - Manual tuner addition workflow remains as fallback

## Out of Scope

Explicitly list what this feature does NOT include:

- ❌ Automatic addition of discovered devices (always requires explicit user action)
- ❌ Background/scheduled discovery scans (only on-demand/manual)
- ❌ Discovery of non-HDHomeRun devices
- ❌ Advanced network configuration (static routes, VPN traversal, etc.)
- ❌ Device firmware updates or configuration
- ❌ Persistent storage of discovery results
- ❌ Discovery history or logs beyond current session
- ❌ mDNS/Bonjour discovery (only UDP broadcast)
- ❌ Automatic determination of device capabilities - user chooses what to add (tuner, recording, or both)
- ❌ Recording list preview during discovery - only detect capability, not enumerate recordings

## Open Questions

- [x] Should discovery run automatically when visiting tuners page? **No** - Manual trigger only to avoid unnecessary network traffic
- [x] How long should discovery timeout be? **1-2 seconds default** - Most devices respond within 500ms
- [x] Should we support IPv6? **IPv4 required, IPv6 nice-to-have** - Most networks are IPv4
- [x] Should we show device model/hardware version? **If available in response** - Check HDHomeRun protocol
- [x] Should discovery results persist across page refreshes? **No** - Transient only, re-scan if needed
- [x] Should we detect duplicate device paths before adding? **Yes** - Check against existing tuners
- [x] How should we detect recording capability? **Query :4999/discover.json after UDP discovery, check for StorageURL field**
- [x] Should we automatically add device to both tables if it has both capabilities? **No** - User chooses (tuner, recording, or both)
- [x] Should we show recording-only devices in tuner list? **No** - Separate pages for tuners vs recordings, only show in appropriate context
- [x] What if :4999 query times out? **Mark as tuner-only, allow manual recording device add later**

## References

- HDHomeRun libhdhomerun: https://github.com/Silicondust/libhdhomerun
- HDHomeRun discovery protocol: UDP port 65001, broadcast to 255.255.255.255
- HDHomeRun API documentation: https://www.silicondust.com/hdhomerun/developers/
- HDHomeRun Record Engine API: https://github.com/Silicondust/documentation/wiki/Old-Record-Engine-Status
- Record Engine discover endpoint: `http://<device-ip>:4999/discover.json`
- Related specs:
  - `.specify/features/001-tuner-management.md` - Core tuner CRUD
  - `.specify/features/006-tuner-validation.md` - Connectivity testing
  - `.specify/features/014-recording-playback.md` - Recording device management
- Node.js dgram module: https://nodejs.org/api/dgram.html

---

*This specification should be reviewed and approved before creating an implementation plan.*

**Version History**:
- v1.0 (2025-11-20): Initial specification for tuner discovery only
- v1.1 (2025-12-13): Extended to support recording device discovery (SCRIBE, SERVIO, DVR software)
