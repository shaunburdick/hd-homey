import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST } from './route';
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

const { refreshDb } = setupTestDatabase();

// Test constants
const TEST_API_URL = 'http://localhost:3000/api/auth/device/code';
const CONTENT_TYPE = 'application/json';
const TEST_DEVICE_NAME = 'Test TV';
const TEST_DEVICE_TYPE = 'tv';
const INVALID_REQUEST_ERROR = 'Invalid request';

describe('POST /api/auth/device/code', () => {
    beforeEach(async () => {
        testDb = await refreshDb({ seed: false });
        vi.clearAllMocks();
    });

    it('should generate a device code with valid request', async () => {
        const { NextRequest } = await import('next/server');
        const request = new NextRequest(TEST_API_URL, {
            method: 'POST',
            headers: {
                'content-type': CONTENT_TYPE,
            },
            body: JSON.stringify({
                deviceName: 'Living Room TV',
                deviceType: TEST_DEVICE_TYPE,
            }),
        });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(201);
        expect(json.code).toBeDefined();
        expect(json.code).toMatch(/^[A-Z0-9]{6}$/); // 6-character alphanumeric
        expect(json.expiresAt).toBeDefined();
        expect(json.pairingUrl).toBeDefined();
        expect(json.pairingUrl).toContain('/pair?code=');
    });

    it('should generate unique codes', async () => {
        const { NextRequest } = await import('next/server');
        const requestBody = {
            deviceName: 'Test Device',
            deviceType: 'tv',
        };

        const codes = new Set<string>();

        // Generate 10 codes
        for (let i = 0; i < 10; i++) {
            const request = new NextRequest(TEST_API_URL, {
                method: 'POST',
                headers: { 'content-type': CONTENT_TYPE },
                body: JSON.stringify(requestBody),
            });

            const response = await POST(request);
            const json = await response.json();

            expect(response.status).toBe(201);
            codes.add(json.code);
        }

        // All codes should be unique
        expect(codes.size).toBe(10);
    });

    it('should store device code in database', async () => {
        const { NextRequest } = await import('next/server');
        const { deviceCodes } = await import('@/lib/database/schema');
        const { eq } = await import('drizzle-orm');

        const request = new NextRequest(TEST_API_URL, {
            method: 'POST',
            headers: { 'content-type': CONTENT_TYPE },
            body: JSON.stringify({
                deviceName: 'Kitchen TV',
                deviceType: 'tv',
            }),
        });

        const response = await POST(request);
        const json = await response.json();

        // Verify stored in database
        const stored = await testDb.query.deviceCodes.findFirst({
            where: eq(deviceCodes.code, json.code),
        });

        expect(stored).toBeDefined();
        expect(stored?.deviceName).toBe('Kitchen TV');
        expect(stored?.deviceType).toBe('tv');
        expect(stored?.status).toBe('pending');
    });

    it('should set code to expire in 5 minutes', async () => {
        const { NextRequest } = await import('next/server');

        const beforeRequest = Date.now();
        const request = new NextRequest(TEST_API_URL, {
            method: 'POST',
            headers: { 'content-type': CONTENT_TYPE },
            body: JSON.stringify({
                deviceName: TEST_DEVICE_NAME,
                deviceType: TEST_DEVICE_TYPE,
            }),
        });

        const response = await POST(request);
        const json = await response.json();
        const afterRequest = Date.now();

        const expiresAt = new Date(json.expiresAt).getTime();
        const expectedExpiry = beforeRequest + 5 * 60 * 1000; // 5 minutes

        // Should be approximately 5 minutes from now (within 1 second tolerance)
        expect(expiresAt).toBeGreaterThanOrEqual(expectedExpiry - 1000);
        expect(expiresAt).toBeLessThanOrEqual(afterRequest + 5 * 60 * 1000 + 1000);
    });

    it('should capture IP address from x-forwarded-for header', async () => {
        const { NextRequest } = await import('next/server');
        const { deviceCodes } = await import('@/lib/database/schema');
        const { eq } = await import('drizzle-orm');

        const request = new NextRequest(TEST_API_URL, {
            method: 'POST',
            headers: {
                'content-type': CONTENT_TYPE,
                'x-forwarded-for': '192.168.1.100',
            },
            body: JSON.stringify({
                deviceName: TEST_DEVICE_NAME,
                deviceType: TEST_DEVICE_TYPE,
            }),
        });

        const response = await POST(request);
        const json = await response.json();

        const stored = await testDb.query.deviceCodes.findFirst({
            where: eq(deviceCodes.code, json.code),
        });

        expect(stored?.ipAddress).toBe('192.168.1.100');
    });

    it('should capture user agent', async () => {
        const { NextRequest } = await import('next/server');
        const { deviceCodes } = await import('@/lib/database/schema');
        const { eq } = await import('drizzle-orm');

        const userAgent = 'HDHomey-Android/1.0.0';
        const request = new NextRequest(TEST_API_URL, {
            method: 'POST',
            headers: {
                'content-type': CONTENT_TYPE,
                'user-agent': userAgent,
            },
            body: JSON.stringify({
                deviceName: TEST_DEVICE_NAME,
                deviceType: TEST_DEVICE_TYPE,
            }),
        });

        const response = await POST(request);
        const json = await response.json();

        const stored = await testDb.query.deviceCodes.findFirst({
            where: eq(deviceCodes.code, json.code),
        });

        expect(stored?.userAgent).toBe(userAgent);
    });

    it('should return 400 for missing deviceName', async () => {
        const { NextRequest } = await import('next/server');

        const request = new NextRequest(TEST_API_URL, {
            method: 'POST',
            headers: { 'content-type': CONTENT_TYPE },
            body: JSON.stringify({
                deviceType: 'tv',
            }),
        });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toBe(INVALID_REQUEST_ERROR);
        expect(json.details).toBeDefined();
    });

    it('should return 400 for missing deviceType', async () => {
        const { NextRequest } = await import('next/server');

        const request = new NextRequest(TEST_API_URL, {
            method: 'POST',
            headers: { 'content-type': CONTENT_TYPE },
            body: JSON.stringify({
                deviceName: TEST_DEVICE_NAME,
            }),
        });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toBe(INVALID_REQUEST_ERROR);
    });

    it('should return 400 for invalid deviceType', async () => {
        const { NextRequest } = await import('next/server');

        const request = new NextRequest(TEST_API_URL, {
            method: 'POST',
            headers: { 'content-type': CONTENT_TYPE },
            body: JSON.stringify({
                deviceName: TEST_DEVICE_NAME,
                deviceType: 'invalid-type',
            }),
        });

        const response = await POST(request);
        const json = await response.json();

        expect(response.status).toBe(400);
        expect(json.error).toBe(INVALID_REQUEST_ERROR);
    });

    it('should accept all valid device types', async () => {
        const { NextRequest } = await import('next/server');
        const validTypes = ['tv', 'tablet', 'phone'];

        for (const deviceType of validTypes) {
            const request = new NextRequest(TEST_API_URL, {
                method: 'POST',
                headers: { 'content-type': CONTENT_TYPE },
                body: JSON.stringify({
                    deviceName: `Test ${deviceType}`,
                    deviceType,
                }),
            });

            const response = await POST(request);
            expect(response.status).toBe(201);
        }
    });

    it('should use x-real-ip if x-forwarded-for is not present', async () => {
        const { NextRequest } = await import('next/server');
        const { deviceCodes } = await import('@/lib/database/schema');
        const { eq } = await import('drizzle-orm');

        const request = new NextRequest(TEST_API_URL, {
            method: 'POST',
            headers: {
                'content-type': CONTENT_TYPE,
                'x-real-ip': '10.0.0.5',
            },
            body: JSON.stringify({
                deviceName: TEST_DEVICE_NAME,
                deviceType: TEST_DEVICE_TYPE,
            }),
        });

        const response = await POST(request);
        const json = await response.json();

        const stored = await testDb.query.deviceCodes.findFirst({
            where: eq(deviceCodes.code, json.code),
        });

        expect(stored?.ipAddress).toBe('10.0.0.5');
    });

    it('should use unknown for IP if no headers present', async () => {
        const { NextRequest } = await import('next/server');
        const { deviceCodes } = await import('@/lib/database/schema');
        const { eq } = await import('drizzle-orm');

        const request = new NextRequest(TEST_API_URL, {
            method: 'POST',
            headers: { 'content-type': CONTENT_TYPE },
            body: JSON.stringify({
                deviceName: TEST_DEVICE_NAME,
                deviceType: TEST_DEVICE_TYPE,
            }),
        });

        const response = await POST(request);
        const json = await response.json();

        const stored = await testDb.query.deviceCodes.findFirst({
            where: eq(deviceCodes.code, json.code),
        });

        expect(stored?.ipAddress).toBe('unknown');
    });
});
