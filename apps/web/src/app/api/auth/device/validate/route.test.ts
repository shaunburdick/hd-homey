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

const testDatabase = setupTestDatabase();

// Test constants
const TEST_API_BASE_URL = 'http://localhost:3000/api/auth/device/validate';

/** Five minutes in milliseconds */
const FIVE_MINUTES_MS = 5 * 60 * 1000;

async function createDeviceCode(overrides: Record<string, unknown> = {}) {
    const { deviceCodes } = await import('@/lib/database/schema');
    const [code] = await testDb.insert(deviceCodes).values({
        code: 'VALID1',
        deviceName: 'Test TV',
        deviceType: 'tv',
        status: 'pending',
        expiresAt: new Date(Date.now() + FIVE_MINUTES_MS),
        ipAddress: '192.168.1.100',
        userAgent: 'TestAgent/1.0',
        ...overrides,
    }).returning();
    return code;
}

describe('GET /api/auth/device/validate', () => {
    beforeEach(async () => {
        testDb = await testDatabase.refreshDb({ seed: true }); // Need seed for user references
        vi.clearAllMocks();
    });

    it('should validate and return device info for valid pending code', async () => {
        await createDeviceCode({
            deviceName: 'Living Room TV',
            deviceType: 'tv',
        });

        const { NextRequest } = await import('next/server');
        const request = new NextRequest(`${TEST_API_BASE_URL}?code=VALID1`);

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.deviceName).toBe('Living Room TV');
        expect(json.deviceType).toBe('tv');
        expect(json.expiresAt).toBeDefined();
        expect(new Date(json.expiresAt).getTime()).toBeGreaterThan(Date.now());
    });

    it('should return 404 for non-existent code', async () => {
        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/validate?code=NOTA01'); // Valid format, just doesn't exist

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(404);
        expect(json.error).toBe('Invalid code');
    });

    it('should return 400 for missing code parameter', async () => {
        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/validate');

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toBe('Missing code parameter');
    });

    it('should return 400 for invalid code format', async () => {
        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/validate?code=ABC'); // Too short

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toBe('Invalid code format');
    });

    it('should return 410 for expired code', async () => {
        /** One second in milliseconds */
        const ONE_SECOND_MS = 1000;
        await createDeviceCode({
            expiresAt: new Date(Date.now() - ONE_SECOND_MS), // Expired
        });

        const { NextRequest } = await import('next/server');
        const request = new NextRequest(`${TEST_API_BASE_URL}?code=VALID1`);

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(410);
        expect(json.error).toBe('Code has expired');
    });

    it('should return 409 for already authorized code', async () => {
        await createDeviceCode({
            status: 'authorized',
            authorizedBy: 'test-admin-uuid', // Valid user from seed
            authorizedAt: new Date(),
        });

        const { NextRequest } = await import('next/server');
        const request = new NextRequest(`${TEST_API_BASE_URL}?code=VALID1`);

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(409);
        expect(json.error).toContain('already been authorized');
    });

    it('should return 409 for denied code', async () => {
        await createDeviceCode({
            status: 'denied',
        });

        const { NextRequest } = await import('next/server');
        const request = new NextRequest(`${TEST_API_BASE_URL}?code=VALID1`);

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(409);
        expect(json.error).toContain('already been denied');
    });

    it('should accept uppercase codes', async () => {
        await createDeviceCode({
            code: 'UPPER1',
        });

        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/validate?code=UPPER1');

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.deviceName).toBeDefined();
    });

    it('should convert lowercase codes to uppercase', async () => {
        await createDeviceCode({
            code: 'LOWER1',
        });

        const { NextRequest } = await import('next/server');
        const request = new NextRequest('http://localhost:3000/api/auth/device/validate?code=lower1');

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.deviceName).toBeDefined();
    });

    it('should validate different device types', async () => {
        const deviceTypes = ['tv', 'tablet', 'phone'];

        for (const deviceType of deviceTypes) {
            const code = `CODE${deviceType[0].toUpperCase()}${deviceTypes.indexOf(deviceType)}`;
            await createDeviceCode({
                code,
                deviceType,
                deviceName: `Test ${deviceType}`,
            });

            const { NextRequest } = await import('next/server');
            const request = new NextRequest(`http://localhost:3000/api/auth/device/validate?code=${code}`);

            const response = await GET(request);
            const json = await response.json();

            expect(response.status).toBe(200);
            expect(json.deviceType).toBe(deviceType);
            expect(json.deviceName).toBe(`Test ${deviceType}`);
        }
    });

    it('should return ISO8601 formatted expiresAt timestamp', async () => {
        const expiryDate = new Date(Date.now() + FIVE_MINUTES_MS);
        await createDeviceCode({
            expiresAt: expiryDate,
        });

        const { NextRequest } = await import('next/server');
        const request = new NextRequest(`${TEST_API_BASE_URL}?code=VALID1`);

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.expiresAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/);
        expect(new Date(json.expiresAt).toISOString()).toBe(json.expiresAt);
    });

    it('should not expose sensitive information', async () => {
        await createDeviceCode({
            ipAddress: '192.168.1.100',
            userAgent: 'Secret Agent/1.0',
            authorizedBy: 'test-admin-uuid', // Valid user from seed
        });

        const { NextRequest } = await import('next/server');
        const request = new NextRequest(`${TEST_API_BASE_URL}?code=VALID1`);

        const response = await GET(request);
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json).not.toHaveProperty('ipAddress');
        expect(json).not.toHaveProperty('userAgent');
        expect(json).not.toHaveProperty('authorizedBy');
        expect(json).not.toHaveProperty('id');
    });
});
