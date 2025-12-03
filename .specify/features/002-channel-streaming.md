# Feature Specification: Channel Streaming

**Feature ID**: `002-channel-streaming`  
**Created**: 2025-11-15  
**Status**: Complete (Existing Feature)  
**Owner**: HD Homey Core Team

## Overview

Channel Streaming enables users to watch live TV channels from HD HomeRun tuners through the HD Homey proxy. The system intercepts stream requests, connects to the appropriate tuner, and proxies the video stream to the user's browser with proper headers and URL rewriting.

## User Stories

### Story 1: View Channel Details (Priority: P1)

**As a** user  
**I want** to view details about a specific channel  
**So that** I can see how to watch it

**Why this priority**: Essential entry point to streaming experience

**Acceptance Criteria**:
- **Given** I navigate to `/tuners/[id]/channel/[channel_id]`, **When** the page loads, **Then** I see channel name, number, and codecs
- **Given** I'm on the channel page, **When** I view the content, **Then** I see instructions for how to watch the stream
- **Given** I click the stream link, **When** navigating, **Then** I'm taken to the streaming route

---

### Story 2: Stream Channel Video (Priority: P1)

**As a** user  
**I want** to stream a channel's video directly in my browser or video player  
**So that** I can watch live TV

**Why this priority**: Core value proposition of the application

**Acceptance Criteria**:
- **Given** I request `/tuners/[id]/channel/[channel_id]/stream`, **When** the route processes the request, **Then** video data starts streaming immediately
- **Given** the stream is active, **When** I open the URL in a video player, **Then** the video plays without buffering issues
- **Given** the stream URL is accessed, **When** HD Homey connects to the tuner, **Then** it uses port 5004 (standard streaming port)

---

### Story 3: Proxy Stream with Correct Headers (Priority: P1)

**As a** developer/system  
**I want** the proxy to set correct HTTP headers for video streaming  
**So that** browsers and video players can properly handle the stream

**Why this priority**: Technical requirement for reliable streaming

**Acceptance Criteria**:
- **Given** a stream is requested, **When** HD Homey proxies the content, **Then** `Content-Type: video/mpeg` header is set
- **Given** a stream is active, **When** the tuner sends data, **Then** HD Homey pipes it directly to the client
- **Given** a stream encounters an error, **When** the tuner connection fails, **Then** an appropriate error response is returned

---

### Story 4: Browse All Channels (Priority: P2)

**As a** user  
**I want** to see a unified list of all channels across all tuners  
**So that** I can easily find and watch any available channel

**Why this priority**: Improves discoverability but not required for core functionality

**Acceptance Criteria**:
- **Given** I navigate to the watch page, **When** the page loads, **Then** I see all channels from all active tuners
- **Given** channels are displayed, **When** I view the list, **Then** channels are sorted by guide number
- **Given** I click a channel link, **When** navigating, **Then** I'm taken to that channel's detail page

---

### Story 5: API Access to Streaming (Priority: P3)

**As a** developer/external system  
**I want** to access stream URLs programmatically  
**So that** I can integrate HD Homey with other applications

**Why this priority**: Nice-to-have for advanced use cases

**Acceptance Criteria**:
- **Given** I make a GET request to `/api/tuners/[id]/channels`, **When** the request completes, **Then** I receive JSON with all channels and their stream URLs
- **Given** I'm using the API, **When** I access stream URLs, **Then** they point to HD Homey proxy (not directly to tuner)

## Requirements

### Functional Requirements

- **FR-001**: System MUST proxy video streams from HD HomeRun tuners to clients
- **FR-002**: System MUST set appropriate HTTP headers for MPEG-TS video streams
- **FR-003**: System MUST construct streaming URLs using port 5004 on tuner
- **FR-004**: System MUST prefix channel numbers with 'v' if not already present (tuner requirement)
- **FR-005**: System MUST use 'auto' tuner selection (let tuner choose available tuner)
- **FR-006**: System MUST handle streaming errors gracefully (log and return error)
- **FR-007**: System MUST display channel details including guide number, name, video codec, audio codec, HD flag
- **FR-008**: System SHOULD provide a unified view of all channels across tuners
- **FR-009**: System MUST rewrite tuner URLs to point to HD Homey proxy in API responses

### Non-Functional Requirements

- **NFR-001**: Performance - Stream must start within 2 seconds of request
- **NFR-002**: Performance - Stream must maintain consistent bitrate without buffering
- **NFR-003**: Reliability - Connection errors must not crash the application
- **NFR-004**: Scalability - System should handle at least 5 concurrent streams (tuner limit)
- **NFR-005**: Security - All streaming routes require authentication
- **NFR-006**: Compatibility - Streams must work with VLC, web browsers, and mobile players

### Data Requirements

- **Channel Entity** (used):
  - Retrieved from database via tuner relationship
  - Contains: `guideNumber`, `guideName`, `videoCodec`, `audioCodec`, `hd`, `url`
  - Stream URL derived from tuner path + guide number

## Technical Constraints

- Must use HTTP streaming (not WebSockets or WebRTC)
- Must use native Node.js `http` module for tuner connection
- Must stream as MPEG-TS format (tuner output format)
- Must not buffer entire stream (pipe directly)
- Must maintain tuner connection for duration of client connection
- Route handlers must return `Response` objects (Next.js 15 app router)

## Edge Cases & Error Handling

- **Tuner unreachable**: What if tuner is offline when stream is requested?
  - Return 500 error with message
  - Log error details
  - Client should display user-friendly error

- **Invalid channel**: What if channel ID doesn't exist or is deleted?
  - Return 404 Not Found
  - Validate channel exists before attempting stream

- **Concurrent streams**: What if too many users stream from same tuner?
  - Tuner will reject new connections (tuner limit ~3 concurrent)
  - Return 503 Service Unavailable
  - Consider adding queue or load balancing in future

- **Mid-stream disconnection**: What if tuner connection drops during streaming?
  - Stream ends
  - Client video player handles gracefully (shows buffering/error)
  - Consider reconnection logic in future

- **Wrong port**: What if tuner doesn't respond on port 5004?
  - Connection times out
  - Return error after timeout
  - Log for debugging

## Success Criteria

### Measurable Outcomes

- **SC-001**: 95% of stream requests successfully connect within 2 seconds
- **SC-002**: Zero buffering for properly configured network connections
- **SC-003**: Streams maintain connection for at least 30 minutes without issues
- **SC-004**: Compatible with VLC, Safari, Chrome, Firefox video players

### User Validation

- [x] Feature tested with HD HomeRun Connect and Extend devices
- [x] Streams work on desktop browsers
- [x] Streams work on mobile devices
- [x] Streams work in VLC and other media players

## Dependencies

- **Depends On**: 
  - Tuner management (tuners must exist and be configured)
  - Channel data (channels must be scanned from tuner)
  - Authentication system (routes protected)
  - HD HomeRun device streaming capability (port 5004)

- **Blocks**: 
  - None (this is a terminal feature)

- **Related To**: 
  - Watch page (provides UI for channel browsing)
  - API routes (provide programmatic access)

## Out of Scope

Explicitly list what this feature does NOT include:

- ❌ Video transcoding or format conversion
- ❌ DVR/recording capabilities
- ❌ Stream quality selection (SD/HD)
- ❌ Adaptive bitrate streaming
- ❌ Multi-stream management or queueing
- ❌ Stream analytics or monitoring
- ❌ Stream thumbnail or preview generation
- ❌ Closed captioning support
- ❌ Parental controls or content filtering

## Implementation Notes

This feature is already implemented with the following files:

**Pages**:
- `/tuners/[id]/channel/[channel_id]` - Channel detail page (`src/app/(protected)/tuners/[id]/channel/[channel_id]/page.tsx`)
- `/` (protected home) - Watch page with all channels (`src/app/(protected)/page.tsx`)

**Route Handlers**:
- `GET /tuners/[id]/channel/[channel_id]/stream` - Stream proxy (`src/app/(protected)/tuners/[id]/channel/[channel_id]/stream/route.tsx`)

**API Routes**:
- `GET /api/tuners/[id]/channels` - List channels with proxy URLs (`src/app/api/tuners/[id]/channels/route.ts`)

**Business Logic**: `src/lib/hdhr/tuner.ts`
- `HDTuner.stream(channel)` - Connects to tuner and returns HTTP stream
  - Constructs URL: `http://[tuner]:5004/auto/v[channel]`
  - Returns Node.js `IncomingMessage` stream
  - Handles connection errors

**Components**: `src/components/channel-stream.tsx`
- Client component for displaying streaming instructions
- Shows channel metadata
- Provides stream link

**Configuration**: `src/lib/config.ts`
- `getProxyHost()` - Determines base URL for HD Homey proxy
- Used to rewrite tuner URLs to proxy URLs
- Supports `HD_HOMEY_PROXY_HOST` environment variable

**URL Rewriting Logic**:
```typescript
// In API route - rewrite tuner URL to proxy URL
const proxyHost = getProxyHost();
const proxyUrl = `${proxyHost}/tuners/${tunerId}/channel/${channel.id}/stream`;
```

**Streaming Flow**:
1. User requests `/tuners/[id]/channel/[channel_id]/stream`
2. Route handler validates channel exists
3. `HDTuner.stream()` connects to tuner on port 5004
4. Returns `Response` with:
   - `Content-Type: video/mpeg`
   - Body is tuner stream (piped)
5. Client receives MPEG-TS stream and plays

## Performance Considerations

- **No buffering**: Stream is piped directly from tuner to client
- **Connection pooling**: Each stream is independent connection to tuner
- **Memory usage**: Minimal - only pipe buffers, no full stream storage
- **Network**: Bandwidth = tuner bitrate (~3-8 Mbps per stream)

## Security Considerations

- All streaming routes require authentication (middleware)
- No direct access to tuner IPs from client
- Proxy hides internal network topology
- Stream URLs are not permanent (database IDs could change)

## References

- HD HomeRun HTTP Streaming: https://www.silicondust.com/hdhomerun/hdhomerun_http_development.pdf
- Node.js Streams: https://nodejs.org/api/stream.html
- Next.js Route Handlers: https://nextjs.org/docs/app/building-your-application/routing/route-handlers
- MPEG-TS Format: https://en.wikipedia.org/wiki/MPEG_transport_stream
