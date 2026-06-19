/**
 * Route handler tests for signal API endpoints.
 *
 * Tests: authentication, authorization, SSE response headers, and edge cases.
 * Mocks: auth, database, signal poller, session manager.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';

// =============================================================================
// Shared mock instances (created before vi.mock factories run)
// =============================================================================

const mockPoller = {
    subscribe: vi.fn().mockReturnValue('sub-id-123'),
    subscribeAll: vi.fn().mockReturnValue('sub-id-antenna'),
    unsubscribe: vi.fn(),
};

const mockActiveSessions: object[] = [];

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

import { auth } from '@/lib/auth/auth';
import { getDb } from '@/lib/database/db';
import { getSignalPoller } from '@/lib/hdhr/signal-poller';
import { getSessionManager } from '@/lib/transcoding/session-manager';
import { GET as streamGET } from '../[tunerId]/stream/route';
import { GET as antennaGET } from '../antenna/stream/route';
import { POST as tunePOST } from '../[tunerId]/tune/route';
import { POST as clearPOST } from '../[tunerId]/clear/route';

// =============================================================================
// Helper types for mocking
// =============================================================================

type MockedFn = ReturnType<typeof vi.fn>;

function getMockGetSession(): MockedFn {
    return (auth.api.getSession as unknown) as MockedFn;
}

function getMockGetDb(): MockedFn {
    return (getDb as unknown) as MockedFn;
}

// =============================================================================
// Helper: Build mock params
// =============================================================================

function makeParams(id: string): { params: Promise<{ tunerId: string }> } {
    return { params: Promise.resolve({ tunerId: id }) };
}

/** Build a Drizzle-like query mock for the tuners table */
function makeDbMock(tuner: object | null, extraTuners: object[] = [], channel: object | null = null) {
    const tunerFindFirst = vi.fn().mockResolvedValue(tuner);
    const tunerFindMany = vi.fn().mockResolvedValue(
        tuner ? [tuner, ...extraTuners] : [],
    );
    const channelFindFirst = vi.fn().mockResolvedValue(channel);

    return {
        query: {
            tuners: {
                findFirst: tunerFindFirst,
                findMany: tunerFindMany,
            },
            channels: {
                findFirst: channelFindFirst,
            },
        },
    };
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

    it('returns 401 when not authenticated', async () => {
        getMockGetSession().mockResolvedValue(null);

        const response = await streamGET(
            new NextRequest('http://localhost/api/signal/1/stream'),
            makeParams('1'),
        );

        expect(response.status).toBe(401);
    });

    it('returns 404 for unknown tunerId', async () => {
        getMockGetSession().mockResolvedValue({ user: { id: 'u1', role: 'viewer' } });
        getMockGetDb().mockResolvedValue(makeDbMock(null));

        const response = await streamGET(
            new NextRequest('http://localhost/api/signal/999/stream'),
            makeParams('999'),
        );

        expect(response.status).toBe(404);
    });

    it('returns 400 for non-numeric tunerId', async () => {
        getMockGetSession().mockResolvedValue({ user: { id: 'u1', role: 'viewer' } });

        const response = await streamGET(
            new NextRequest('http://localhost/api/signal/abc/stream'),
            makeParams('not-a-number'),
        );

        expect(response.status).toBe(400);
    });

    it('returns 200 with SSE Content-Type for valid tuner', async () => {
        const mockTuner = { id: 1, name: 'Test Tuner', path: 'http://192.168.1.100', is_active: true };
        getMockGetSession().mockResolvedValue({ user: { id: 'u1', role: 'viewer' } });
        getMockGetDb().mockResolvedValue({
            query: {
                tuners: {
                    findFirst: vi.fn().mockResolvedValue(mockTuner),
                    findMany: vi.fn().mockResolvedValue([mockTuner]),
                },
            },
        });

        const response = await streamGET(
            new NextRequest('http://localhost/api/signal/1/stream'),
            makeParams('1'),
        );

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/event-stream');
        expect(response.headers.get('Cache-Control')).toBe('no-cache');
    });
});

// =============================================================================
// GET /api/signal/antenna/stream
// =============================================================================

describe('GET /api/signal/antenna/stream', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockPoller.subscribeAll.mockReturnValue('sub-id-antenna');
        (getSignalPoller as MockedFn).mockReturnValue(mockPoller);
    });

    it('returns 401 when not authenticated', async () => {
        getMockGetSession().mockResolvedValue(null);

        const response = await antennaGET(
            new NextRequest('http://localhost/api/signal/antenna/stream'),
        );

        expect(response.status).toBe(401);
    });

    it('returns 200 SSE stream when tuners exist', async () => {
        getMockGetSession().mockResolvedValue({ user: { id: 'u1', role: 'viewer' } });
        getMockGetDb().mockResolvedValue({
            query: {
                tuners: {
                    findMany: vi.fn().mockResolvedValue([
                        { id: 1, path: 'http://192.168.1.100', is_active: true, name: 'T1' },
                        { id: 2, path: 'http://192.168.1.100', is_active: true, name: 'T2' },
                    ]),
                },
            },
        });

        const response = await antennaGET(
            new NextRequest('http://localhost/api/signal/antenna/stream'),
        );

        expect(response.status).toBe(200);
        expect(response.headers.get('Content-Type')).toBe('text/event-stream');
    });
});

// =============================================================================
// POST /api/signal/[tunerId]/tune
// =============================================================================

describe('POST /api/signal/[tunerId]/tune', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getSignalPoller as MockedFn).mockReturnValue(mockPoller);
        (getSessionManager as MockedFn).mockReturnValue({
            getActiveSessions: vi.fn().mockReturnValue(mockActiveSessions),
        });
    });

    it('returns 401 when not authenticated', async () => {
        getMockGetSession().mockResolvedValue(null);

        const response = await tunePOST(
            new NextRequest('http://localhost/api/signal/1/tune', {
                method: 'POST',
                body: JSON.stringify({ guideNumber: '5.1' }),
                headers: { 'Content-Type': 'application/json' },
            }),
            makeParams('1'),
        );

        expect(response.status).toBe(401);
    });

    it('returns 403 for viewer role', async () => {
        getMockGetSession().mockResolvedValue({ user: { id: 'u1', role: 'viewer' } });

        const response = await tunePOST(
            new NextRequest('http://localhost/api/signal/1/tune', {
                method: 'POST',
                body: JSON.stringify({ guideNumber: '5.1' }),
                headers: { 'Content-Type': 'application/json' },
            }),
            makeParams('1'),
        );

        expect(response.status).toBe(403);
    });

    it('returns 404 when tuner not found', async () => {
        getMockGetSession().mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
        getMockGetDb().mockResolvedValue(makeDbMock(null));

        const response = await tunePOST(
            new NextRequest('http://localhost/api/signal/999/tune', {
                method: 'POST',
                body: JSON.stringify({ guideNumber: '5.1' }),
                headers: { 'Content-Type': 'application/json' },
            }),
            makeParams('999'),
        );

        expect(response.status).toBe(404);
    });

    it('returns 409 when active viewers present and force not set', async () => {
        const mockTuner = { id: 1, path: 'http://192.168.1.100', is_active: true };
        const mockChannel = { id: 5, guideNumber: '5.1', guideName: 'KPIX', fk_tuner: 1, is_active: true };

        getMockGetSession().mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
        getMockGetDb().mockResolvedValue({
            query: {
                tuners: {
                    findFirst: vi.fn().mockResolvedValue(mockTuner),
                    findMany: vi.fn().mockResolvedValue([mockTuner]),
                },
                channels: {
                    findFirst: vi.fn().mockResolvedValue(mockChannel),
                },
            },
        });
        (getSessionManager as MockedFn).mockReturnValue({
            getActiveSessions: vi.fn().mockReturnValue([
                { tunerId: 1, viewerCount: 2, sessionId: 'abc', channelId: 5, channelName: 'KPIX', uptime: 10, status: 'running', viewers: [] },
            ]),
        });

        const response = await tunePOST(
            new NextRequest('http://localhost/api/signal/1/tune', {
                method: 'POST',
                body: JSON.stringify({ guideNumber: '5.1' }),
                headers: { 'Content-Type': 'application/json' },
            }),
            makeParams('1'),
        );

        expect(response.status).toBe(409);
        const body = await response.json() as { conflict: boolean; viewers: number };
        expect(body.conflict).toBe(true);
        expect(body.viewers).toBe(2);
    });

    it('returns 404 when channel not found', async () => {
        const mockTuner = { id: 1, path: 'http://192.168.1.100', is_active: true };

        getMockGetSession().mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
        getMockGetDb().mockResolvedValue({
            query: {
                tuners: {
                    findFirst: vi.fn().mockResolvedValue(mockTuner),
                    findMany: vi.fn().mockResolvedValue([mockTuner]),
                },
                channels: {
                    findFirst: vi.fn().mockResolvedValue(null),
                },
            },
        });

        const response = await tunePOST(
            new NextRequest('http://localhost/api/signal/1/tune', {
                method: 'POST',
                body: JSON.stringify({ guideNumber: '999.1' }),
                headers: { 'Content-Type': 'application/json' },
            }),
            makeParams('1'),
        );

        expect(response.status).toBe(404);
    });
});

// =============================================================================
// POST /api/signal/[tunerId]/clear
// =============================================================================

describe('POST /api/signal/[tunerId]/clear', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (getSignalPoller as MockedFn).mockReturnValue(mockPoller);
    });

    it('returns 401 when not authenticated', async () => {
        getMockGetSession().mockResolvedValue(null);

        const response = await clearPOST(
            new NextRequest('http://localhost/api/signal/1/clear', { method: 'POST' }),
            makeParams('1'),
        );

        expect(response.status).toBe(401);
    });

    it('returns 403 for viewer role', async () => {
        getMockGetSession().mockResolvedValue({ user: { id: 'u1', role: 'viewer' } });

        const response = await clearPOST(
            new NextRequest('http://localhost/api/signal/1/clear', { method: 'POST' }),
            makeParams('1'),
        );

        expect(response.status).toBe(403);
    });

    it('returns 404 for unknown tunerId', async () => {
        getMockGetSession().mockResolvedValue({ user: { id: 'u1', role: 'admin' } });
        getMockGetDb().mockResolvedValue({
            query: {
                tuners: {
                    findFirst: vi.fn().mockResolvedValue(null),
                    findMany: vi.fn().mockResolvedValue([]),
                },
            },
        });

        const response = await clearPOST(
            new NextRequest('http://localhost/api/signal/999/clear', { method: 'POST' }),
            makeParams('999'),
        );

        expect(response.status).toBe(404);
    });
});
