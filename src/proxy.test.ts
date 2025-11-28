/**
 * Proxy Tests
 *
 * Tests route protection logic for various scenarios.
 * Note: These tests verify the proxy logic, not the auth() implementation.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { proxy } from './proxy';
import { mockViewerSession } from './test-utils/mock-auth';

// Mock the auth module
vi.mock('@/lib/auth/auth', () => ({
    auth: {
        api: {
            getSession: vi.fn(),
        }
    },
}));

import { auth } from '@/lib/auth/auth';

describe('Proxy Route Protection', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Public Routes', () => {
        it('should allow access to signin page without auth', async () => {
            const request = new NextRequest(new URL('http://localhost:3000/users/signin'));
            const response = await proxy(request);

            expect(response.status).toBe(200);
            expect(auth.api.getSession).not.toHaveBeenCalled();
        });

        it('should allow access to get-started page without auth', async () => {
            const request = new NextRequest(new URL('http://localhost:3000/get-started'));
            const response = await proxy(request);

            expect(response.status).toBe(200);
            expect(auth.api.getSession).not.toHaveBeenCalled();
        });

        it('should allow access to Better-Auth API routes without auth', async () => {
            const request = new NextRequest(new URL('http://localhost:3000/api/auth/signin'));
            const response = await proxy(request);

            expect(response.status).toBe(200);
            expect(auth.api.getSession).not.toHaveBeenCalled();
        });
    });

    describe('Token-Authenticated Routes', () => {
        it('should allow transcode routes through (validated in handler)', async () => {
            const request = new NextRequest(
                new URL('http://localhost:3000/api/transcode/1/2/playlist.m3u8?token=abc123')
            );
            const response = await proxy(request);

            // Middleware lets it through, handler validates token
            expect(response.status).toBe(200);
            expect(auth.api.getSession).not.toHaveBeenCalled();
        });

        it('should allow stream routes through (validated in handler)', async () => {
            const request = new NextRequest(
                new URL('http://localhost:3000/tuners/1/channel/2/stream?token=abc123')
            );
            const response = await proxy(request);

            // Middleware lets it through, handler validates token
            expect(response.status).toBe(200);
            expect(auth.api.getSession).not.toHaveBeenCalled();
        });
    });

    describe('Static Assets', () => {
        it('should allow _next/static without auth', async () => {
            const request = new NextRequest(new URL('http://localhost:3000/_next/static/chunk.js'));
            const response = await proxy(request);

            expect(response.status).toBe(200);
            expect(auth.api.getSession).not.toHaveBeenCalled();
        });

        it('should allow icon files without auth', async () => {
            const request = new NextRequest(new URL('http://localhost:3000/icons/logo.png'));
            const response = await proxy(request);

            expect(response.status).toBe(200);
            expect(auth.api.getSession).not.toHaveBeenCalled();
        });

        it('should allow image files without auth', async () => {
            const request = new NextRequest(new URL('http://localhost:3000/hd-homey.webp'));
            const response = await proxy(request);

            expect(response.status).toBe(200);
            expect(auth.api.getSession).not.toHaveBeenCalled();
        });
    });

    describe('Session-Authenticated Routes - API', () => {
        it('should block API routes without session', async () => {
            vi.mocked(auth.api.getSession).mockResolvedValue(null);

            const request = new NextRequest(new URL('http://localhost:3000/api/tuners'));
            const response = await proxy(request);

            expect(response.status).toBe(401);
            const json = await response.json();
            expect(json).toHaveProperty('error', 'Unauthorized');
            expect(auth.api.getSession).toHaveBeenCalled();
        });

        it('should allow API routes with valid session', async () => {
            vi.mocked(auth.api.getSession).mockResolvedValue(mockViewerSession);

            const request = new NextRequest(new URL('http://localhost:3000/api/tuners'));
            const response = await proxy(request);

            expect(response.status).toBe(200);
            expect(auth.api.getSession).toHaveBeenCalled();
        });

        it('should protect tuner modification endpoints', async () => {
            vi.mocked(auth.api.getSession).mockResolvedValue(null);

            const request = new NextRequest(new URL('http://localhost:3000/api/tuners/1/poll'));
            const response = await proxy(request);

            expect(response.status).toBe(401);
            expect(auth.api.getSession).toHaveBeenCalled();
        });
    });

    describe('Session-Authenticated Routes - Pages', () => {
        it('should redirect page routes without session to signin', async () => {
            vi.mocked(auth.api.getSession).mockResolvedValue(null);

            const request = new NextRequest(new URL('http://localhost:3000/tuners'));
            const response = await proxy(request);

            expect(response.status).toBe(307); // Temporary redirect
            expect(response.headers.get('location')).toContain('/users/signin');
            expect(response.headers.get('location')).toContain('callbackUrl=%2Ftuners');
            expect(auth.api.getSession).toHaveBeenCalled();
        });

        it('should allow page routes with valid session', async () => {
            vi.mocked(auth.api.getSession).mockResolvedValue(mockViewerSession);

            const request = new NextRequest(new URL('http://localhost:3000/tuners'));
            const response = await proxy(request);

            expect(response.status).toBe(200);
            expect(auth.api.getSession).toHaveBeenCalled();
        });

        it('should include callback URL when redirecting to signin', async () => {
            vi.mocked(auth.api.getSession).mockResolvedValue(null);

            const request = new NextRequest(new URL('http://localhost:3000/settings'));
            const response = await proxy(request);

            const location = response.headers.get('location');
            expect(location).toContain('callbackUrl=%2Fsettings');
            expect(auth.api.getSession).toHaveBeenCalled();
        });
    });

    describe('Protected Routes Coverage', () => {
        beforeEach(() => {
            vi.mocked(auth.api.getSession).mockResolvedValue(null);
        });

        it('should protect /tuners routes', async () => {
            const request = new NextRequest(new URL('http://localhost:3000/tuners/1'));
            const response = await proxy(request);

            expect(response.status).toBe(307);
            expect(auth.api.getSession).toHaveBeenCalled();
        });

        it('should protect /settings route', async () => {
            const request = new NextRequest(new URL('http://localhost:3000/settings'));
            const response = await proxy(request);

            expect(response.status).toBe(307);
            expect(auth.api.getSession).toHaveBeenCalled();
        });

        it('should protect /users management routes', async () => {
            const request = new NextRequest(new URL('http://localhost:3000/users'));
            const response = await proxy(request);

            expect(response.status).toBe(307);
            expect(auth.api.getSession).toHaveBeenCalled();
        });

        it('should protect /profile route', async () => {
            const request = new NextRequest(new URL('http://localhost:3000/profile'));
            const response = await proxy(request);

            expect(response.status).toBe(307);
            expect(auth.api.getSession).toHaveBeenCalled();
        });

        it('should protect /about route', async () => {
            const request = new NextRequest(new URL('http://localhost:3000/about'));
            const response = await proxy(request);

            expect(response.status).toBe(307);
            expect(auth.api.getSession).toHaveBeenCalled();
        });
    });
});
