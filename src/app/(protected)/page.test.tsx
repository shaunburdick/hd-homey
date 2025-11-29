import { expect, test, beforeAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { setupTestDatabase } from '@/test-utils/setup-test-db';
import type { DB } from '@/lib/database/db';
import type { Session } from '@/lib/auth/types';
import { AuthRoles } from '@/lib/auth-roles';

let testDb: DB;

vi.mock('@/lib/database/db', () => ({
    getDb: vi.fn(() => Promise.resolve(testDb)),
    connection: vi.fn(() => ({})), // Required for auth.ts
}));

// Mock Better-Auth
vi.mock('@/lib/auth/auth', () => ({
    auth: {
        api: {
            getSession: vi.fn(() => Promise.resolve({
                session: {
                    id: 'test-session-id',
                    userId: 'test-viewer-uuid',
                    expiresAt: new Date(Date.now() + 86400000),
                    token: 'test-token',
                    ipAddress: '127.0.0.1',
                    userAgent: 'test-agent',
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
                user: {
                    id: 'test-viewer-uuid',
                    email: 'viewer@test.com',
                    username: 'viewer',
                    name: 'Test User',
                    role: AuthRoles.Viewer,
                    emailVerified: false,
                    image: null,
                    isActive: true,
                    createdAt: new Date(),
                    updatedAt: new Date(),
                },
            } as Session)),
        },
    },
}));

// Mock next/headers
vi.mock('next/headers', () => ({
    headers: vi.fn(() => Promise.resolve(new Headers())),
}));

const { refreshDb } = setupTestDatabase();

// Set up test database
beforeAll(async () => {
    testDb = await refreshDb({ seed: true });
});

test('Page', async () => {
    const Page = (await import('./page')).default;
    render(await Page());
    expect(screen.getByRole('heading', { level: 1, name: /Welcome back, Test User/i })).toBeDefined();
});
