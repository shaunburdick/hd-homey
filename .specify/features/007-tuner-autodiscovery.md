# Feature Specification: Tuner Autodiscovery

**Feature ID**: `007-tuner-autodiscovery`  
**Created**: 2025-11-20  
**Status**: Draft  
**Owner**: HD Homey Core Team

## Overview

Tuner Autodiscovery enables administrators to automatically detect HDHomeRun devices on the local network through UDP broadcast discovery, eliminating the need to manually lookup device IP addresses or URLs. Users can initiate a network scan, view discovered devices with their details, and add them to the system with pre-populated information.

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

- **No persistent storage required** - discovery results are transient and only used to populate tuner form

## Technical Constraints

- Must use Node.js built-in `dgram` module for UDP operations
- Must NOT use native C library (libhdhomerun) to avoid compilation dependencies
- Must work within Next.js server action or API route context
- Must handle UDP socket lifecycle properly (create, bind, send, listen, close)
- Must parse binary packet format according to HDHomeRun specification
- Should implement timeout mechanism (default 1-2 seconds)
- Must respect network broadcast permissions (some networks block broadcasts)

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

- **What if device responds but is unreachable for channel scan?**
  - Still allow adding to system
  - Show warning that connectivity test is recommended
  - Channel scan will fail normally with existing error handling

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
  - Node.js `dgram` module - UDP socket support
  
- **Blocks**: 
  - None - This is an optional convenience feature

- **Related To**: 
  - SPEC-006 (Tuner Validation) - Discovery provides data that validation can verify
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

## Open Questions

- [x] Should discovery run automatically when visiting tuners page? **No** - Manual trigger only to avoid unnecessary network traffic
- [x] How long should discovery timeout be? **1-2 seconds default** - Most devices respond within 500ms
- [x] Should we support IPv6? **IPv4 required, IPv6 nice-to-have** - Most networks are IPv4
- [ ] Should we show device model/hardware version? **If available in response** - Check HDHomeRun protocol
- [ ] Should discovery results persist across page refreshes? **No** - Transient only, re-scan if needed
- [ ] Should we detect duplicate device paths before adding? **Yes** - Check against existing tuners

## References

- HDHomeRun libhdhomerun: https://github.com/Silicondust/libhdhomerun
- HDHomeRun discovery protocol: UDP port 65001, broadcast to 255.255.255.255
- HDHomeRun API documentation: https://www.silicondust.com/hdhomerun/developers/
- Related specs:
  - `.specs/features/001-tuner-management/spec.md` - Core tuner CRUD
  - `.specs/features/006-tuner-validation/spec.md` - Connectivity testing
- Node.js dgram module: https://nodejs.org/api/dgram.html

---

*This specification should be reviewed and approved before creating an implementation plan.*
