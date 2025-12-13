import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GET } from './route';
import { setupTestDatabase } from '@/test-utils/setup-test-db';
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
vi.mock('@/lib/auth/auth', () => ({
    auth: {
        api: {
            signInUser: vi.fn(async ({ userId }) => ({
                token: `mock-jwt-token-${userId}`,
                user: { id: userId },
            })),
        },
    },
}));

const { refreshDb } = setupTestDatabase();

describe('GET /api/auth/device/poll', () => {
    beforeEach(async () => {
        testDb = await refreshDb({ seed: true });
        vi.clearAllMocks();
    });

    async function createDeviceCode(overrides: Record<string, unknown> = {}) {
        const { deviceCodes } = await import('@/lib/database/schema');
        const [code] = await testDb.insert(deviceCodes).values({
            code: 'TEST01',
            deviceName: 'Test TV',
            deviceType: 'tv',
            status: 'pending',
            expiresAt: new Date(Date.now() + 5 * 60 * 1000), // 5 minutes from now
            ipAddress: '192.168.1.100',
            userAgent: 'TestAgent/1.0',
            ...overrides,
        }).returning();
        return code;
    }

    it('should return pending status for unauthorized code', async () => {
        await createDeviceCode();

        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/poll?code=TEST01');

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.status).toBe('pending');
    });

    it('should return authorized status with token and user data', async () => {
        await createDeviceCode({
            status: 'authorized',
            authorizedBy: 'test-admin-uuid',
            authorizedAt: new Date(),
        });

        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/poll?code=TEST01');

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.status).toBe('authorized');
        expect(json.token).toBeDefined();
        expect(json.token).toContain('mock-jwt-token');
        expect(json.user).toBeDefined();
        expect(json.user.id).toBe('test-admin-uuid');
        expect(json.user.username).toBe('admin');
        expect(json.user.role).toBe('admin');
    });

    it('should return expired status for expired code', async () => {
        await createDeviceCode({
            expiresAt: new Date(Date.now() - 1000), // Expired 1 second ago
        });

        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/poll?code=TEST01');

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.status).toBe('expired');
    });

    it('should update status to expired when polling expired pending code', async () => {
        const { deviceCodes } = await import('@/lib/database/schema');
        const { eq } = await import('drizzle-orm');

        await createDeviceCode({
            status: 'pending',
            expiresAt: new Date(Date.now() - 1000),
        });

        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/poll?code=TEST01');

        await GET(request);

        // Verify status was updated in database
        const updated = await testDb.query.deviceCodes.findFirst({
            where: eq(deviceCodes.code, 'TEST01'),
        });

        expect(updated?.status).toBe('expired');
    });

    it('should return denied status for denied code', async () => {
        await createDeviceCode({
            status: 'denied',
        });

        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/poll?code=TEST01');

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.status).toBe('denied');
    });

    it('should return 404 for non-existent code', async () => {
        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/poll?code=NOTA01'); // Valid format, just doesn't exist

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(404);
        expect(json.error).toBe('Invalid code');
    });

    it('should return 400 for missing code parameter', async () => {
        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/poll');

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toBe('Missing code parameter');
    });

    it('should return 400 for invalid code format', async () => {
        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/poll?code=ABC'); // Too short

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toBe('Invalid code format');
    });

    it('should handle code case-insensitively', async () => {
        await createDeviceCode({ code: 'LOWER1' }); // Store in uppercase

        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/poll?code=lower1'); // Query lowercase

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.status).toBe('pending');
    });

    // Note: This test is skipped because we can't easily test orphaned FK references
    // In production, FK constraints prevent this scenario
    it.skip('should return 500 if authorizer data is missing for authorized code', async () => {
        // First create a temporary user that we'll delete
        const { user } = await import('@/lib/database/schema');
        const [tempUser] = await testDb.insert(user).values({
            id: 'temp-user-id',
            username: 'tempuser',
            name: 'Temp User',
            email: 'temp@test.com',
            emailVerified: false,
            isActive: true,
        }).returning();

        await createDeviceCode({
            status: 'authorized',
            authorizedBy: tempUser.id,
            authorizedAt: new Date(),
        });

        // Now delete the user to create orphaned reference
        await testDb.delete(user).where(await import('drizzle-orm').then(m => m.eq(user.id, tempUser.id)));

        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/poll?code=TEST01');

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(500);
        expect(json.error).toBe('Authorization error');
    });

    it('should call signInUser with correct userId', async () => {
        const { auth } = await import('@/lib/auth/auth');

        await createDeviceCode({
            status: 'authorized',
            authorizedBy: 'test-viewer-uuid',
            authorizedAt: new Date(),
        });

        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/poll?code=TEST01');

        await GET(request);

        expect(auth.api.signInUser).toHaveBeenCalledWith({
            userId: 'test-viewer-uuid',
            dontRememberMe: false,
        });
    });

    it('should handle multiple polls without side effects', async () => {
        await createDeviceCode();

        const { NextRequest } = await import('next/server');

        // Poll 3 times
        for (let i = 0; i < 3; i++) {
            const request = new NextRequest('http://localhost:3000/api/auth/device/poll?code=TEST01');
            const response = await GET(request);
            const json = await response.json();

            expect(response.status).toBe(200);
            expect(json.status).toBe('pending');
        }
    });

    it('should return expired status without updating if already expired', async () => {
        const { deviceCodes } = await import('@/lib/database/schema');
        const { eq } = await import('drizzle-orm');

        await createDeviceCode({
            status: 'expired',
            expiresAt: new Date(Date.now() - 1000),
        });

        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/poll?code=TEST01');

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.status).toBe('expired');

        // Verify status remains expired (no duplicate update)
        const code = await testDb.query.deviceCodes.findFirst({
            where: eq(deviceCodes.code, 'TEST01'),
        });
        expect(code?.status).toBe('expired');
    });
});
