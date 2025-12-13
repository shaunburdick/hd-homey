import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from './route';
import { setupTestDatabase } from '@/test-utils/setup-test-db';
import { AuthRoles } from '@/lib/auth-roles';
import type { DB } from '@/lib/database/db';

let testDb: DB;

vi.mock('@/lib/database/db', () => ({
    getDb: vi.fn(() => Promise.resolve(testDb)),
    connection: vi.fn(() => ({})),
}));

vi.mock('@/lib/logger', () => ({
    default: {
        error: vi.fn(),
        info: vi.fn(),
        warn: vi.fn(),
        debug: vi.fn(),
    },
}));

// Mock Better-Auth
const mockGetSessionImpl = vi.fn();
vi.mock('@/lib/auth/auth', () => ({
    auth: {
        api: {
            getSession: (...args: unknown[]) => mockGetSessionImpl(...args),
        },
    },
}));

// Mock next/headers
vi.mock('next/headers', () => ({
    headers: vi.fn(() => new Headers()),
}));

const { refreshDb } = setupTestDatabase();

function createMockSession(overrides?: Record<string, unknown>) {
    return {
        user: {
            id: 'test-admin-uuid',
            username: 'admin',
            name: 'Admin User',
            email: 'admin@local.hdhomey.app',
            emailVerified: false,
            role: AuthRoles.Admin,
            isActive: true,
            createdAt: new Date(),
            updatedAt: new Date(),
            ...((overrides?.user as Record<string, unknown> | undefined) ?? {}),
        },
        session: {
            id: 'session-1',
            userId: 'test-admin-uuid',
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            token: 'test-token',
            createdAt: new Date(),
            updatedAt: new Date(),
            ...((overrides?.session as Record<string, unknown> | undefined) ?? {}),
        },
    };
}

describe('POST /api/auth/device/authorize', () => {
    beforeEach(async () => {
        testDb = await refreshDb({ seed: true });
        vi.clearAllMocks();
        mockGetSessionImpl.mockResolvedValue(createMockSession());
    });

    async function createDeviceCode(overrides: Record<string, unknown> = {}) {
        const { deviceCodes } = await import('@/lib/database/schema');
        const [code] = await testDb.insert(deviceCodes).values({
            code: 'AUTH01',
            deviceName: 'Test TV',
            deviceType: 'tv',
            status: 'pending',
            expiresAt: new Date(Date.now() + 5 * 60 * 1000),
            ipAddress: '192.168.1.100',
            userAgent: 'TestAgent/1.0',
            ...overrides,
        }).returning();
        return code;
    }

    it('should authorize a valid pending code', async () => {
        await createDeviceCode();

        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/authorize', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ code: 'AUTH01' }),
        });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.success).toBe(true);
    });

    it('should update device code status to authorized', async () => {
        const { deviceCodes } = await import('@/lib/database/schema');
        const { eq } = await import('drizzle-orm');

        await createDeviceCode();

        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/authorize', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ code: 'AUTH01' }),
        });

        await POST(request);

        const updated = await testDb.query.deviceCodes.findFirst({
            where: eq(deviceCodes.code, 'AUTH01'),
        });

        expect(updated?.status).toBe('authorized');
        expect(updated?.authorizedBy).toBe('test-admin-uuid');
        expect(updated?.authorizedAt).toBeDefined();
        expect(updated?.authorizedAt).toBeInstanceOf(Date);
    });

    it('should return 401 when not authenticated', async () => {
        mockGetSessionImpl.mockResolvedValue(null);

        await createDeviceCode();

        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/authorize', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ code: 'AUTH01' }),
        });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(401);
        expect(json.error).toBe('Unauthorized');
    });

    it('should return 401 when session has no user', async () => {
        mockGetSessionImpl.mockResolvedValue({ session: { id: 'test' } });

        await createDeviceCode();

        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/authorize', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ code: 'AUTH01' }),
        });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(401);
        expect(json.error).toBe('Unauthorized');
    });

    it('should allow viewer role to authorize devices', async () => {
        mockGetSessionImpl.mockResolvedValue(
            createMockSession({
                user: {
                    id: 'test-viewer-uuid',
                    username: 'viewer',
                    role: AuthRoles.Viewer,
                },
            })
        );

        await createDeviceCode();

        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/authorize', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ code: 'AUTH01' }),
        });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.success).toBe(true);
    });

    it('should return 404 for non-existent code', async () => {
        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/authorize', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ code: 'NOTA01' }), // Valid format, doesn't exist
        });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(404);
        expect(json.error).toBe('Invalid code');
    });

    it('should return 410 for expired code', async () => {
        await createDeviceCode({
            expiresAt: new Date(Date.now() - 1000),
        });

        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/authorize', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ code: 'AUTH01' }),
        });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(410);
        expect(json.error).toBe('Code has expired');
    });

    it('should return 409 for already authorized code', async () => {
        await createDeviceCode({
            status: 'authorized',
            authorizedBy: 'test-viewer-uuid', // Valid user
            authorizedAt: new Date(),
        });

        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/authorize', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ code: 'AUTH01' }),
        });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(409);
        expect(json.error).toContain('already been authorized');
    });

    it('should return 409 for denied code', async () => {
        await createDeviceCode({
            status: 'denied',
        });

        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/authorize', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ code: 'AUTH01' }),
        });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(409);
        expect(json.error).toContain('already been denied');
    });

    it('should return 400 for missing code', async () => {
        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/authorize', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({}),
        });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toBe('Invalid request');
        expect(json.details).toBeDefined();
    });

    it('should return 400 for invalid code length', async () => {
        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/authorize', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ code: 'ABC' }), // Too short
        });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toBe('Invalid request');
    });

    it('should convert lowercase codes to uppercase', async () => {
        await createDeviceCode({ code: 'LOWER1' });

        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/authorize', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ code: 'lower1' }),
        });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.success).toBe(true);
    });

    it('should set authorizedAt to current time', async () => {
        const { deviceCodes } = await import('@/lib/database/schema');
        const { eq } = await import('drizzle-orm');

        await createDeviceCode();

        const beforeAuth = Date.now();

        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/authorize', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ code: 'AUTH01' }),
        });

        await POST(request);

        const afterAuth = Date.now();

        const updated = await testDb.query.deviceCodes.findFirst({
            where: eq(deviceCodes.code, 'AUTH01'),
        });

        const authorizedAt = updated?.authorizedAt?.getTime() ?? 0;
        expect(authorizedAt).toBeGreaterThanOrEqual(beforeAuth - 1000);
        expect(authorizedAt).toBeLessThanOrEqual(afterAuth + 1000);
    });

    it('should not authorize code twice', async () => {
        const { deviceCodes } = await import('@/lib/database/schema');
        const { eq } = await import('drizzle-orm');

        await createDeviceCode();

        const { NextRequest } = await import('next/server');

        // First authorization
        const request1 = new NextRequest('http://localhost:3000/api/auth/device/authorize', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ code: 'AUTH01' }),
        });
        await POST(request1);

        const firstAuth = await testDb.query.deviceCodes.findFirst({
            where: eq(deviceCodes.code, 'AUTH01'),
        });

        // Second authorization attempt
        const request2 = new NextRequest('http://localhost:3000/api/auth/device/authorize', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ code: 'AUTH01' }),
        });
        const response2 = await POST(request2);
        const json2 = await response2.json();

        expect(response2.status).toBe(409);
        expect(json2.error).toContain('already been authorized');

        const secondAuth = await testDb.query.deviceCodes.findFirst({
            where: eq(deviceCodes.code, 'AUTH01'),
        });

        // Verify authorizationAt didn't change
        expect(secondAuth?.authorizedAt).toEqual(firstAuth?.authorizedAt);
    });
});
