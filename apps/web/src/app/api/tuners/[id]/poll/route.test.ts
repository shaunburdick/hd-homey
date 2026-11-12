import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { NextRequest } from 'next/server';
import { GET } from './route';
import { HDTuner } from '@/lib/hdhr/tuner';

const mockGetSession = vi.fn();
vi.mock('@/lib/auth/auth', () => ({
    auth: {
        api: {
            getSession: (...args: unknown[]) => mockGetSession(...args),
        },
    },
}));

vi.mock('@/lib/logger', () => ({
    default: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

vi.mock('@/lib/database/db', () => ({
    getDb: vi.fn(() => Promise.resolve({
        query: {
            tuners: {
                findFirst: vi.fn(() => Promise.resolve({ id: 1, path: 'http://192.0.2.10' })),
            },
        },
    })),
}));

const mockUpdateLineup = vi.fn();
vi.mock('@/lib/hdhr/tuner', () => ({
    HDTuner: vi.fn().mockImplementation(() => ({ updateLineup: mockUpdateLineup })),
}));

vi.mock('next/headers', () => ({
    headers: vi.fn(() => new Headers()),
}));

describe('GET /api/tuners/[id]/poll', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockUpdateLineup.mockResolvedValue([]);
    });

    it('returns 401 when the session is missing', async () => {
        mockGetSession.mockResolvedValue(null);

        const response = await GET(
            {} as NextRequest,
            { params: Promise.resolve({ id: '1' }) }
        );

        expect(response.status).toBe(401);
        expect(HDTuner).not.toHaveBeenCalled();
    });
});
