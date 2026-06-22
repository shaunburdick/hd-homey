/**
 * Route handler tests for signal API endpoints.
 *
 * Tests: authentication, authorization, SSE response headers, and edge cases.
 * Mocks: auth, database, signal poller, session manager, node:net.
 */

import { EventEmitter } from 'node:events';
import { crc32 } from 'node:zlib';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// =============================================================================
// Test constants
// =============================================================================

const VIEWER_ROLE = { user: { id: 'u1', role: 'viewer' } };
const ADMIN_ROLE = { user: { id: 'u1', role: 'admin' } };
const DEVICE_URL = 'http://192.168.1.100';
const SSE_PATH = 'http://localhost/api/signal/1/stream';
const TUNE_PATH = 'http://localhost/api/signal/1/tune';
const CLEAR_PATH = 'http://localhost/api/signal/1/clear';

/** Reusable 401 description */
const NOT_AUTH = 'returns 401 when not authenticated';

/** Reusable 403 description */
const VIEWER_FORBIDDEN = 'returns 403 for viewer role';

// =============================================================================
// node:net mock — replaces createConnection for nativeSet/nativeGet calls
// =============================================================================

/** Minimal mock socket: EventEmitter + stubs for the methods nativeTcpRequest calls */
interface MockSocket extends EventEmitter {
    setTimeout: ReturnType<typeof vi.fn>;
    write: ReturnType<typeof vi.fn>;
    end: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
}

/** Shared slot — set by the mock factory, consumed by each test. Typed as possibly undefined
 * so beforeEach can reset it between tests, preventing stale socket from previous test
 * leaking into waitForSocketAndEmit's poll. */
let currentMockSocket: MockSocket | undefined;

vi.mock('node:net', () => ({
    createConnection: vi.fn((): MockSocket => {
        const socket = new EventEmitter() as MockSocket;
        socket.setTimeout = vi.fn();
        socket.write = vi.fn();
        socket.end = vi.fn();
        socket.destroy = vi.fn();
        currentMockSocket = socket;
        return socket;
    }),
}));

// =============================================================================
// Shared mock instances (created before vi.mock factories run)
// =============================================================================

const mockPoller = {
    subscribe: vi.fn().mockReturnValue('sub-id-123'),
    subscribeAll: vi.fn().mockReturnValue('sub-id-antenna'),
    unsubscribe: vi.fn(),
};

// =============================================================================
// Mocks — factories must not reference outer variables (hoisting)
// =============================================================================

vi.mock('@/lib/auth/auth', () => ({
    auth: {
        api: {
            getSession: vi.fn(),
        },
    },
}));

vi.mock('@/lib/database/db', () => ({
    getDb: vi.fn(),
}));

vi.mock('@/lib/hdhr/signal-poller', () => ({
    getSignalPoller: vi.fn(),
}));

vi.mock('@/lib/transcoding/session-manager', () => ({
    getSessionManager: vi.fn(),
}));

vi.mock('next/headers', () => ({
    headers: vi.fn(() => Promise.resolve(new Map())),
}));

// =============================================================================
// Imports (after mocks)
// =============================================================================

import { GET as streamGET } from '../[tunerId]/stream/route';
import { POST as tunePOST } from '../[tunerId]/tune/route';
import { POST as clearPOST } from '../[tunerId]/clear/route';
import { auth } from '@/lib/auth/auth';
import { getDb } from '@/lib/database/db';
import { getSignalPoller } from '@/lib/hdhr/signal-poller';
import { getSessionManager } from '@/lib/transcoding/session-manager';

// =============================================================================
// Helper types for mocking
// =============================================================================

type MockedFn = ReturnType<typeof vi.fn>;

function getMockGetSession(): MockedFn {
    return auth.api.getSession;
}

function getMockGetDb(): MockedFn {
    return (getDb as unknown) as MockedFn;
}

function makeParams(id: string): { params: Promise<{ tunerId: string }> } {
    return { params: Promise.resolve({ tunerId: id }) };
}

interface DbMockOptions {
    tuner?: object;
    extraTuners?: object[];
    channel?: object;
}

/** Build a Drizzle-like query mock */
function makeDbMock(options: DbMockOptions = {}) {
    const { tuner, extraTuners = [], channel } = options;
    return {
        query: {
            tuners: {
                findFirst: vi.fn().mockResolvedValue(tuner),
                findMany: vi.fn().mockResolvedValue(tuner !== undefined ? [tuner, ...extraTuners] : []),
            },
            channels: {
                findFirst: vi.fn().mockResolvedValue(channel),
            },
        },
    };
}

// =============================================================================
// Packet builder helper — used by tune/clear success tests
//
// Builds a minimal GETSET_RPY packet (type 0x0005) containing a TAG_GETSET_VALUE
// (0x04) TLV with a null-terminated UTF-8 value string and a valid CRC32 trailer.
// This helper is intentionally inline (not imported from native-protocol.test.ts).
// =============================================================================

/**
 * Build a valid GETSET_RPY packet carrying the given value string.
 *
 * @param value - The value string to embed (UTF-8, null-terminated in packet)
 * @returns Complete response packet: header(4) + payload + CRC(4)
 */
function makeSuccessPacket(value: string): Buffer {
    const valueBytes = Buffer.from(value, 'utf8');
    const tlvLen = valueBytes.length + 1; // +1 for null terminator
    const payloadLength = 1 + 1 + tlvLen; // tag(1) + len(1) + value+null
    const buf = Buffer.alloc(4 + payloadLength + 4);
    let offset = 0;

    buf.writeUInt16BE(0x0005, offset); offset += 2; // GETSET_RPY
    buf.writeUInt16BE(payloadLength, offset); offset += 2;
    buf.writeUInt8(0x04, offset); offset += 1; // TAG_GETSET_VALUE
    buf.writeUInt8(tlvLen, offset); offset += 1;
    valueBytes.copy(buf, offset); offset += valueBytes.length;
    buf.writeUInt8(0, offset); offset += 1; // null terminator

    const crcVal = crc32(buf.subarray(0, offset));
    buf.writeUInt32LE(crcVal, offset);

    return buf;
}

/**
 * Poll for `currentMockSocket` to be populated after the route handler's
 * async steps (auth, DB) have run and nativeSet has created its socket.
 *
 * The route handler does several async awaits before calling nativeSet, so
 * the mock socket isn't available synchronously after starting the request.
 * This helper spins on `setImmediate` until the factory has populated
 * `currentMockSocket`, then emits the supplied events on it.
 *
 * @param emitFn - Callback to run once the socket is ready
 * @param timeoutMs - Maximum wait before giving up (default 2000ms)
 */
async function waitForSocketAndEmit(
    emitFn: (socket: MockSocket) => void,
    timeoutMs = 2000,
): Promise<void> {
    const deadline = Date.now() + timeoutMs;
    return await new Promise<void>((resolve, reject) => {
        function poll(): void {
            if (currentMockSocket !== undefined) {
                emitFn(currentMockSocket);
                resolve();
                return;
            }
            if (Date.now() >= deadline) {
                reject(new Error('waitForSocketAndEmit: timed out waiting for mock socket'));
                return;
            }
            setImmediate(poll);
        }
        poll();
    });
}
// =============================================================================
// GET /api/signal/[tunerId]/stream
// =============================================================================

describe('GET /api/signal/[tunerId]/stream', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPoller.subscribe.mockReturnValue('sub-id-123');
        (getSignalPoller as MockedFn).mockReturnValue(mockPoller);
    });

    it(NOT_AUTH, async () => {
        getMockGetSession().mockResolvedValue(null);

        const response = await streamGET(new NextRequest(SSE_PATH), makeParams('1'));
        expect(response.status).toBe(401);
    });

    it('returns 404 for unknown tunerId', async () => {
        getMockGetSession().mockResolvedValue(VIEWER_ROLE);
        getMockGetDb().mockResolvedValue(makeDbMock());

        const response = await streamGET(
            new NextRequest('http://localhost/api/signal/999/stream'),
            makeParams('999'),
        );
        expect(response.status).toBe(404);
    });

    it('returns 400 for non-numeric tunerId', async () => {
        getMockGetSession().mockResolvedValue(VIEWER_ROLE);

        const response = await streamGET(
            new NextRequest('http://localhost/api/signal/abc/stream'),
            makeParams('not-a-number'),
        );
        expect(response.status).toBe(400);
    });

    it('returns 200 with SSE Content-Type for valid tuner and calls subscribeAll', async () => {
        const mockTuner = { id: 1, name: 'Test Tuner', path: DEVICE_URL, is_active: true };
        const mockTuner2 = { id: 2, name: 'Test Tuner 2', path: DEVICE_URL, is_active: true };
        getMockGetSession().mockResolvedValue(VIEWER_ROLE);
        getMockGetDb().mockResolvedValue({
            query: {
                tuners: {
                    findFirst: vi.fn().mockResolvedValue(mockTuner),
                    findMany: vi.fn().mockResolvedValue([mockTuner, mockTuner2]),
                },
            },
        });

        const response = await streamGET(new NextRequest(SSE_PATH), makeParams('1'));
        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/event-stream');
        expect(response.headers.get('Cache-Control')).toBe('no-cache');

        // Route must now call subscribeAll (not subscribe) with all device tuners
        expect(mockPoller.subscribeAll).toHaveBeenCalledOnce();
        expect(mockPoller.subscribe).not.toHaveBeenCalled();
        const callArgs = mockPoller.subscribeAll.mock.calls[0][0] as {
            deviceUrl: string;
            tunersToTrack: { tunerId: number; resource: string }[];
        };
        expect(callArgs.deviceUrl).toBe(DEVICE_URL);
        expect(callArgs.tunersToTrack).toEqual([
            { tunerId: 1, resource: 'tuner0' },
            { tunerId: 2, resource: 'tuner1' },
        ]);
    });
});

/** Shared Content-Type header for inline JSON requests */
const JSON_HEADERS = { 'Content-Type': 'application/json' } as const;

/** Build a tune POST request — resource defaults to 'tuner0' */
function makeTuneRequest(
    path = TUNE_PATH,
    body: { guideNumber?: string; resource?: string } = { guideNumber: '5.1', resource: 'tuner0' },
): NextRequest {
    return new NextRequest(path, {
        method: 'POST',
        body: JSON.stringify(body),
        headers: JSON_HEADERS,
    });
}

/** Build a clear POST request with a JSON body */
function makeClearRequest(path = CLEAR_PATH, resource = 'tuner0'): NextRequest {
    return new NextRequest(path, {
        method: 'POST',
        body: JSON.stringify({ resource }),
        headers: JSON_HEADERS,
    });
}

// =============================================================================
// POST /api/signal/[tunerId]/tune
// =============================================================================

describe('POST /api/signal/[tunerId]/tune', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        currentMockSocket = undefined;
        (getSignalPoller as MockedFn).mockReturnValue(mockPoller);
        (getSessionManager as MockedFn).mockReturnValue({ getActiveSessions: vi.fn().mockReturnValue([]) });
    });

    it(NOT_AUTH, async () => {
        getMockGetSession().mockResolvedValue(null);
        const response = await tunePOST(makeTuneRequest(), makeParams('1'));
        expect(response.status).toBe(401);
    });

    it(VIEWER_FORBIDDEN, async () => {
        getMockGetSession().mockResolvedValue(VIEWER_ROLE);
        const response = await tunePOST(makeTuneRequest(), makeParams('1'));
        expect(response.status).toBe(403);
    });

    it('returns 404 when tuner not found', async () => {
        getMockGetSession().mockResolvedValue(ADMIN_ROLE);
        getMockGetDb().mockResolvedValue(makeDbMock());

        const response = await tunePOST(
            makeTuneRequest('http://localhost/api/signal/999/tune'),
            makeParams('999'),
        );
        expect(response.status).toBe(404);
    });

    it('returns 409 when active viewers present and force not set', async () => {
        const mockTuner = { id: 1, path: DEVICE_URL, is_active: true };
        const mockChannel = { id: 5, guideNumber: '5.1', guideName: 'KPIX', fk_tuner: 1, is_active: true };

        getMockGetSession().mockResolvedValue(ADMIN_ROLE);
        getMockGetDb().mockResolvedValue(makeDbMock({ tuner: mockTuner, channel: mockChannel }));
        (getSessionManager as MockedFn).mockReturnValue({
            getActiveSessions: vi.fn().mockReturnValue([
                {
                    tunerId: 1,
                    viewerCount: 2,
                    sessionId: 'abc',
                    channelId: 5,
                    channelName: 'KPIX',
                    uptime: 10,
                    status: 'running',
                    viewers: [],
                },
            ]),
        });

        const response = await tunePOST(makeTuneRequest(), makeParams('1'));
        expect(response.status).toBe(409);
        const body = await response.json() as { conflict: boolean; viewers: number };
        expect(body.conflict).toBe(true);
        expect(body.viewers).toBe(2);
    });

    it('returns 404 when channel not found', async () => {
        const mockTuner = { id: 1, path: DEVICE_URL, is_active: true };

        getMockGetSession().mockResolvedValue(ADMIN_ROLE);
        getMockGetDb().mockResolvedValue(makeDbMock({ tuner: mockTuner }));

        const response = await tunePOST(
            makeTuneRequest(TUNE_PATH, { guideNumber: '999.1', resource: 'tuner0' }),
            makeParams('1'),
        );
        expect(response.status).toBe(404);
    });

    it('returns 400 when resource is missing', async () => {
        getMockGetSession().mockResolvedValue(ADMIN_ROLE);

        const response = await tunePOST(
            makeTuneRequest(TUNE_PATH, { guideNumber: '5.1' }),
            makeParams('1'),
        );
        expect(response.status).toBe(400);
        const body = await response.json() as { error: string; expected: string };
        expect(body.error).toBe('resource is required');
        expect(body.expected).toBe('tunerN');
    });

    it('returns 400 when resource is invalid', async () => {
        getMockGetSession().mockResolvedValue(ADMIN_ROLE);

        const response = await tunePOST(
            makeTuneRequest(TUNE_PATH, { guideNumber: '5.1', resource: 'invalid' }),
            makeParams('1'),
        );
        expect(response.status).toBe(400);
        const body = await response.json() as { error: string; expected: string };
        expect(body.error).toBe('Invalid resource');
        expect(body.expected).toBe('tunerN');
    });

    it('returns 200 and sends auto: channel format when nativeSet succeeds', async () => {
        const mockTuner = { id: 1, path: DEVICE_URL, is_active: true };
        const mockChannel = { id: 5, guideNumber: '5.1', guideName: 'KPIX', fk_tuner: 1, is_active: true };

        getMockGetSession().mockResolvedValue(ADMIN_ROLE);
        getMockGetDb().mockResolvedValue(makeDbMock({ tuner: mockTuner, channel: mockChannel }));

        // Start request — nativeSet is called after several async route awaits,
        // so we must wait for the mock socket to be created before emitting.
        const responsePromise = tunePOST(makeTuneRequest(), makeParams('1'));

        await waitForSocketAndEmit((socket) => {
            socket.emit('connect');
            socket.emit('data', makeSuccessPacket('auto:5.1'));
        });

        const response = await responsePromise;
        expect(response.status).toBe(200);
        const body = await response.json() as { success: boolean; resource: string };
        expect(body.success).toBe(true);
        expect(body.resource).toBe('tuner0');
    });

    it('returns 502 when nativeSet fails (device connection refused)', async () => {
        const mockTuner = { id: 1, path: DEVICE_URL, is_active: true };
        const mockChannel = { id: 5, guideNumber: '5.1', guideName: 'KPIX', fk_tuner: 1, is_active: true };

        getMockGetSession().mockResolvedValue(ADMIN_ROLE);
        getMockGetDb().mockResolvedValue(makeDbMock({ tuner: mockTuner, channel: mockChannel }));

        const responsePromise = tunePOST(makeTuneRequest(), makeParams('1'));

        // Simulate device refusing connection
        await waitForSocketAndEmit((socket) => {
            const connRefusedError = Object.assign(new Error('connect ECONNREFUSED 192.168.1.100:65001'), {
                code: 'ECONNREFUSED',
            });
            socket.emit('error', connRefusedError);
        });

        const response = await responsePromise;
        expect(response.status).toBe(502);
    });
});

// =============================================================================
// POST /api/signal/[tunerId]/clear
// =============================================================================

describe('POST /api/signal/[tunerId]/clear', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        currentMockSocket = undefined;
        (getSignalPoller as MockedFn).mockReturnValue(mockPoller);
    });

    it(NOT_AUTH, async () => {
        getMockGetSession().mockResolvedValue(null);
        const response = await clearPOST(makeClearRequest(), makeParams('1'));
        expect(response.status).toBe(401);
    });

    it(VIEWER_FORBIDDEN, async () => {
        getMockGetSession().mockResolvedValue(VIEWER_ROLE);
        const response = await clearPOST(makeClearRequest(), makeParams('1'));
        expect(response.status).toBe(403);
    });

    it('returns 404 for unknown tunerId', async () => {
        getMockGetSession().mockResolvedValue(ADMIN_ROLE);
        getMockGetDb().mockResolvedValue(makeDbMock());

        const response = await clearPOST(
            makeClearRequest('http://localhost/api/signal/999/clear'),
            makeParams('999'),
        );
        expect(response.status).toBe(404);
    });

    it('returns 400 when resource is missing', async () => {
        getMockGetSession().mockResolvedValue(ADMIN_ROLE);

        const response = await clearPOST(
            new NextRequest(CLEAR_PATH, { method: 'POST', body: '{}', headers: JSON_HEADERS }),
            makeParams('1'),
        );
        expect(response.status).toBe(400);
        const body = await response.json() as { error: string; expected: string };
        expect(body.error).toBe('resource is required');
        expect(body.expected).toBe('tunerN');
    });

    it('returns 400 when resource is invalid', async () => {
        getMockGetSession().mockResolvedValue(ADMIN_ROLE);

        const response = await clearPOST(
            new NextRequest(CLEAR_PATH, {
                method: 'POST',
                body: JSON.stringify({ resource: 'invalid-slot' }),
                headers: JSON_HEADERS,
            }),
            makeParams('1'),
        );
        expect(response.status).toBe(400);
        const body = await response.json() as { error: string; expected: string };
        expect(body.error).toBe('Invalid resource');
        expect(body.expected).toBe('tunerN');
    });

    it('returns 200 and clears the tuner when nativeSet succeeds', async () => {
        const mockTuner = { id: 1, path: DEVICE_URL, is_active: true };

        getMockGetSession().mockResolvedValue(ADMIN_ROLE);
        getMockGetDb().mockResolvedValue(makeDbMock({ tuner: mockTuner }));

        const responsePromise = clearPOST(makeClearRequest(), makeParams('1'));

        // Wait for nativeSet's socket to be created, then emit success
        await waitForSocketAndEmit((socket) => {
            socket.emit('connect');
            socket.emit('data', makeSuccessPacket('none'));
        });

        const response = await responsePromise;
        expect(response.status).toBe(200);
        const body = await response.json() as { success: boolean; resource: string };
        expect(body.success).toBe(true);
        expect(body.resource).toBe('tuner0');
    });

    it('returns 502 when nativeSet fails (device connection refused)', async () => {
        const mockTuner = { id: 1, path: DEVICE_URL, is_active: true };

        getMockGetSession().mockResolvedValue(ADMIN_ROLE);
        getMockGetDb().mockResolvedValue(makeDbMock({ tuner: mockTuner }));

        const responsePromise = clearPOST(makeClearRequest(), makeParams('1'));

        // Simulate device refusing connection
        await waitForSocketAndEmit((socket) => {
            const connRefusedError = Object.assign(new Error('connect ECONNREFUSED 192.168.1.100:65001'), {
                code: 'ECONNREFUSED',
            });
            socket.emit('error', connRefusedError);
        });

        const response = await responsePromise;
        expect(response.status).toBe(502);
    });
});
