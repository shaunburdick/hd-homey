# Implementation Plan: Tuner Autodiscovery

**Feature ID**: `007-tuner-autodiscovery`  
**Spec**: [spec.md](./spec.md)  
**Date**: 2025-11-20  
**Branch**: `007-tuner-autodiscovery`

## Summary

Implement UDP broadcast-based discovery of HDHomeRun devices on the local network using Node.js dgram module. Discovery results are transient (no database storage) and used to pre-populate the existing tuner add form. Implementation is pure TypeScript with no native dependencies.

## Technical Context

**Framework**: Next.js 16 + React 19 + TypeScript 5  
**Database**: SQLite with Drizzle ORM (no schema changes needed)  
**Authentication**: NextAuth.js v5  
**Styling**: new.css (classless)  
**Testing**: Vitest + React Testing Library  
**Validation**: TypeBox  
**Network**: Node.js built-in `dgram` UDP module

## Constitution Check

Review against HD Homey Constitution:

- [x] ✅ Follows Next.js app router conventions
- [x] ✅ Uses server components by default
- [x] ✅ Server actions for mutations (discovery action)
- [x] ✅ TypeScript strict mode compliance
- [x] ✅ Drizzle ORM for database access (only to check existing tuners)
- [x] ✅ TypeBox validation at API boundaries
- [x] ✅ Unit tests for business logic
- [x] ✅ Soft deletes for data (N/A - no data storage)
- [x] ✅ Authentication required (admin only)
- [x] ✅ Mobile responsive

**Violations/Justifications**: None - Pure enhancement with no breaking changes

## Architecture

### Directory Structure

```
src/
├── app/
│   ├── (protected)/
│   │   └── tuners/
│   │       ├── discover/
│   │       │   ├── page.tsx                # Discovery UI page
│   │       │   └── DiscoveryResults.tsx    # Client component for results
│   │       └── actions.ts                  # Add discoverDevices action
├── lib/
│   └── hdhr/
│       ├── discovery.ts                    # Core discovery logic
│       ├── discovery.test.ts               # Unit tests
│       └── protocol.ts                     # Packet parsing/building
└── components/
    └── discovery-card.tsx                  # Discovered device card

No migrations needed - discovery data is transient
```

### Data Model

#### No Database Changes Required

Discovery results are transient and never stored. Data structure:

```typescript
export interface DiscoveredDevice {
  ip_address: string;           // e.g., "192.168.1.100"
  device_id: string;            // e.g., "12345678"
  base_url: string;             // e.g., "http://192.168.1.100"
  lineup_url: string;           // e.g., "http://192.168.1.100/lineup.json"
  tuner_count: number;          // e.g., 4
  device_type: number;          // HDHOMERUN_DEVICE_TYPE_TUNER = 0x00000001
  is_legacy: boolean;           // false for modern devices
  device_auth?: string;         // Optional auth string
  storage_url?: string;         // For DVR devices
}

export interface DiscoveryResult {
  devices: DiscoveredDevice[];
  duration_ms: number;
  error?: string;
}
```

#### HDHomeRun Protocol Constants

```typescript
// From libhdhomerun
export const HDHOMERUN_DISCOVER_UDP_PORT = 65001;
export const HDHOMERUN_DEVICE_TYPE_WILDCARD = 0xFFFFFFFF;
export const HDHOMERUN_DEVICE_TYPE_TUNER = 0x00000001;
export const HDHOMERUN_DEVICE_TYPE_STORAGE = 0x00000005;
export const HDHOMERUN_DEVICE_ID_WILDCARD = 0xFFFFFFFF;

// Packet format (binary)
export const HDHOMERUN_TAG_DEVICE_TYPE = 0x01;
export const HDHOMERUN_TAG_DEVICE_ID = 0x02;
export const HDHOMERUN_TAG_GETSET_NAME = 0x03;
export const HDHOMERUN_TAG_BASE_URL = 0x2A;
export const HDHOMERUN_TAG_DEVICE_AUTH_STR = 0x2B;
export const HDHOMERUN_TAG_TUNER_COUNT = 0x10;
```

### Server Actions

```typescript
// src/app/(protected)/tuners/actions.ts

'use server';

import { discoverDevices as discoverDevicesImpl } from '@/lib/hdhr/discovery';
import { requireAdmin } from '@/lib/auth';
import type { DiscoveryResult } from '@/lib/hdhr/discovery';

/**
 * Discover HDHomeRun devices on the local network
 * Admin only, no database changes
 */
export async function discoverDevices(): Promise<DiscoveryResult> {
  await requireAdmin();
  
  try {
    const result = await discoverDevicesImpl({
      timeout: 2000,  // 2 second timeout
      device_type: HDHOMERUN_DEVICE_TYPE_TUNER
    });
    
    return result;
  } catch (error) {
    return {
      devices: [],
      duration_ms: 0,
      error: error instanceof Error ? error.message : 'Discovery failed'
    };
  }
}
```

### Core Discovery Logic

```typescript
// src/lib/hdhr/discovery.ts

import dgram from 'dgram';
import { buildDiscoveryPacket, parseDiscoveryResponse } from './protocol';

export interface DiscoveryOptions {
  timeout?: number;           // milliseconds, default 2000
  device_type?: number;       // HDHOMERUN_DEVICE_TYPE_*, default TUNER
  device_id?: number;         // specific device or WILDCARD
  broadcast_address?: string; // default '255.255.255.255'
}

export async function discoverDevices(
  options: DiscoveryOptions = {}
): Promise<DiscoveryResult> {
  const {
    timeout = 2000,
    device_type = HDHOMERUN_DEVICE_TYPE_TUNER,
    device_id = HDHOMERUN_DEVICE_ID_WILDCARD,
    broadcast_address = '255.255.255.255'
  } = options;

  const devices: DiscoveredDevice[] = [];
  const startTime = Date.now();
  
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    let timeoutHandle: NodeJS.Timeout;
    
    // Collect responses
    socket.on('message', (msg: Buffer, rinfo: dgram.RemoteInfo) => {
      try {
        const device = parseDiscoveryResponse(msg, rinfo);
        if (device && !devices.find(d => d.device_id === device.device_id)) {
          devices.push(device);
        }
      } catch (error) {
        // Ignore malformed responses
        console.warn('Failed to parse discovery response:', error);
      }
    });
    
    socket.on('error', (error) => {
      clearTimeout(timeoutHandle);
      socket.close();
      reject(error);
    });
    
    // Send discovery packet
    socket.bind(() => {
      socket.setBroadcast(true);
      
      const packet = buildDiscoveryPacket(device_type, device_id);
      socket.send(packet, HDHOMERUN_DISCOVER_UDP_PORT, broadcast_address, (error) => {
        if (error) {
          clearTimeout(timeoutHandle);
          socket.close();
          reject(error);
        }
      });
      
      // Set timeout to collect responses
      timeoutHandle = setTimeout(() => {
        socket.close();
        resolve({
          devices,
          duration_ms: Date.now() - startTime
        });
      }, timeout);
    });
  });
}
```

### Protocol Implementation

```typescript
// src/lib/hdhr/protocol.ts

/**
 * Build HDHomeRun discovery packet
 * Format: [type:u8, length:u8, payload:bytes, type:u8, length:u8, payload:bytes, ...]
 */
export function buildDiscoveryPacket(
  device_type: number,
  device_id: number
): Buffer {
  const buffer = Buffer.alloc(16);
  let offset = 0;
  
  // Add device type tag
  buffer.writeUInt8(HDHOMERUN_TAG_DEVICE_TYPE, offset++);
  buffer.writeUInt8(4, offset++); // 4 bytes
  buffer.writeUInt32BE(device_type, offset);
  offset += 4;
  
  // Add device ID tag
  buffer.writeUInt8(HDHOMERUN_TAG_DEVICE_ID, offset++);
  buffer.writeUInt8(4, offset++); // 4 bytes
  buffer.writeUInt32BE(device_id, offset);
  offset += 4;
  
  return buffer.subarray(0, offset);
}

/**
 * Parse HDHomeRun discovery response packet
 */
export function parseDiscoveryResponse(
  buffer: Buffer,
  rinfo: dgram.RemoteInfo
): DiscoveredDevice | null {
  const device: Partial<DiscoveredDevice> = {
    ip_address: rinfo.address,
    is_legacy: false
  };
  
  let offset = 0;
  
  while (offset < buffer.length - 1) {
    const tag = buffer.readUInt8(offset++);
    const length = buffer.readUInt8(offset++);
    
    if (offset + length > buffer.length) break;
    
    switch (tag) {
      case HDHOMERUN_TAG_DEVICE_TYPE:
        device.device_type = buffer.readUInt32BE(offset);
        break;
        
      case HDHOMERUN_TAG_DEVICE_ID:
        const deviceId = buffer.readUInt32BE(offset);
        device.device_id = deviceId.toString(16).toUpperCase().padStart(8, '0');
        break;
        
      case HDHOMERUN_TAG_BASE_URL:
        device.base_url = buffer.toString('utf8', offset, offset + length);
        break;
        
      case HDHOMERUN_TAG_LINEUP_URL:
        device.lineup_url = buffer.toString('utf8', offset, offset + length);
        break;
        
      case HDHOMERUN_TAG_TUNER_COUNT:
        device.tuner_count = buffer.readUInt8(offset);
        break;
        
      case HDHOMERUN_TAG_DEVICE_AUTH_STR:
        device.device_auth = buffer.toString('utf8', offset, offset + length);
        break;
    }
    
    offset += length;
  }
  
  // Validate required fields
  if (!device.device_id || !device.base_url) {
    return null;
  }
  
  // Generate lineup URL if not provided
  if (!device.lineup_url && device.base_url) {
    device.lineup_url = `${device.base_url}/lineup.json`;
  }
  
  return device as DiscoveredDevice;
}
```

### UI Components

#### Discovery Page

```typescript
// src/app/(protected)/tuners/discover/page.tsx
import { RoleGuard } from '@/components/role-guard';
import DiscoveryInterface from './DiscoveryInterface';

export default async function DiscoverPage() {
  return (
    <RoleGuard requiredRole="admin">
      <PageContainer>
        <h1>Discover HDHomeRun Devices</h1>
        <p>Scan your local network for HDHomeRun tuners.</p>
        <DiscoveryInterface />
      </PageContainer>
    </RoleGuard>
  );
}
```

#### Discovery Interface (Client Component)

```typescript
// src/app/(protected)/tuners/discover/DiscoveryInterface.tsx
'use client';

import { useState } from 'react';
import { discoverDevices } from '../actions';
import DiscoveryCard from '@/components/discovery-card';

export default function DiscoveryInterface() {
  const [state, setState] = useState<'idle' | 'scanning' | 'complete'>('idle');
  const [result, setResult] = useState<DiscoveryResult | null>(null);
  
  async function handleDiscover() {
    setState('scanning');
    const discoveryResult = await discoverDevices();
    setResult(discoveryResult);
    setState('complete');
  }
  
  return (
    <div>
      <button onClick={handleDiscover} disabled={state === 'scanning'}>
        {state === 'scanning' ? 'Scanning...' : 'Discover Devices'}
      </button>
      
      {state === 'scanning' && <p>Scanning network...</p>}
      
      {result?.error && (
        <div className="error">
          <p>Discovery failed: {result.error}</p>
          <p>Possible causes: firewall blocking UDP, no devices on network, Docker network mode</p>
        </div>
      )}
      
      {result?.devices && result.devices.length === 0 && !result.error && (
        <p>No devices found. Try again or add manually.</p>
      )}
      
      {result?.devices && result.devices.length > 0 && (
        <div>
          <h2>Found {result.devices.length} device(s)</h2>
          {result.devices.map(device => (
            <DiscoveryCard key={device.device_id} device={device} />
          ))}
        </div>
      )}
    </div>
  );
}
```

## Implementation Steps

### Phase 1: Core Discovery Logic (Est: 4 hours)

- [x] Create `src/lib/hdhr/protocol.ts` with packet building/parsing
- [x] Create `src/lib/hdhr/discovery.ts` with UDP discovery
- [x] Add TypeScript types for discovery data
- [x] Write unit tests for protocol functions
- [x] Write unit tests for discovery (mocked UDP)

**Test Command**: `npm test src/lib/hdhr`

### Phase 2: Server Action (Est: 1 hour)

- [ ] Add `discoverDevices()` action to `src/app/(protected)/tuners/actions.ts`
- [ ] Add authentication check (admin only)
- [ ] Add error handling
- [ ] Test action from React component

### Phase 3: UI - Discovery Page (Est: 3 hours)

- [ ] Create `src/app/(protected)/tuners/discover/page.tsx`
- [ ] Create `src/app/(protected)/tuners/discover/DiscoveryInterface.tsx` client component
- [ ] Add "Discover Devices" link to tuners list page
- [ ] Add loading state during scan
- [ ] Add error state display
- [ ] Style with semantic HTML

**Test Command**: Manual browser testing

### Phase 4: UI - Results Display (Est: 2 hours)

- [ ] Create `src/components/discovery-card.tsx` for device cards
- [ ] Display device info (name, IP, ID, tuner count)
- [ ] Add "Add This Device" button
- [ ] Check if device already exists in DB
- [ ] Link to add tuner form with pre-filled data
- [ ] Make cards mobile responsive

### Phase 5: Integration with Add Form (Est: 2 hours)

- [ ] Update `/tuners/new` to accept query params
- [ ] Pre-fill name from device ID
- [ ] Pre-fill path from base_url
- [ ] Add source indicator ("from discovery")
- [ ] Test end-to-end flow

### Phase 6: Testing & Polish (Est: 2 hours)

- [ ] Test with real HDHomeRun devices
- [ ] Test error scenarios (no devices, timeout, firewall)
- [ ] Test Docker deployment
- [ ] Add helpful error messages
- [ ] Update documentation
- [ ] Run full test suite

**Test Command**: `npm test && npm run lint`

### Phase 7: Documentation (Est: 1 hour)

- [ ] Update README with discovery feature
- [ ] Add troubleshooting section for network issues
- [ ] Document Docker network requirements
- [ ] Add inline code comments

**Total Estimate**: ~15 hours

## Testing Strategy

### Unit Tests

- Protocol packet building/parsing
- Discovery result parsing
- Device deduplication logic
- Error handling

### Integration Tests

- Discovery action with auth
- Form pre-fill from query params
- Device already exists check

### Manual Testing Checklist

- [ ] Discover devices on local network
- [ ] Discover shows correct device info
- [ ] Add device from discovery results
- [ ] Discovery timeout works
- [ ] Error messages are helpful
- [ ] Works in Docker container
- [ ] Mobile responsive
- [ ] Admin-only access enforced

## Rollback Plan

If issues arise after deployment:

1. **Immediate**: Feature is additive - simply don't use discovery, manual add still works
2. **Disable**: Remove "Discover" link from UI if critical bug found
3. **Revert**: Revert commits if necessary
4. **No database changes**: No migration rollback needed

## Security Considerations

- [x] Discovery action requires admin authentication
- [x] No persistent storage of discovery data
- [x] UDP responses parsed safely (no eval/injection)
- [x] Device info sanitized before display
- [x] No external API calls (local network only)
- [ ] Consider rate limiting discovery requests

## Performance Considerations

- [x] Discovery timeout configurable (default 2s)
- [x] Non-blocking - doesn't affect existing functionality
- [x] No database queries during scan
- [x] Results only queried once to check "already added"
- [x] UDP broadcast efficient for local network

## Docker Considerations

Discovery requires UDP broadcast which may not work in default Docker networking:

**Options**:
1. Use `network_mode: host` in docker-compose.yml
2. Document network requirement in README
3. Provide fallback to manual entry
4. Show helpful error if discovery fails

## Open Questions

- [ ] Should we cache discovery results for a short time? **No** - always fresh scan
- [ ] Should we auto-discover on tuners page load? **No** - manual trigger only
- [ ] Should we support IPv6? **Future enhancement** - IPv4 first
- [ ] Should we discover storage devices too? **Not initially** - tuners only

## References

- Feature Spec: [spec.md](./spec.md)
- HDHomeRun libhdhomerun: https://github.com/Silicondust/libhdhomerun
- Node.js dgram: https://nodejs.org/api/dgram.html
- HDHomeRun Protocol: UDP port 65001, TLV format
- Related: SPEC-001 (Tuner Management), SPEC-006 (Tuner Validation)

---

*This plan should be reviewed before implementation begins. Update as needed during development.*
