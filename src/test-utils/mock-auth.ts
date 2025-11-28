import { AuthRoles } from '@/lib/auth-roles';

/**
 * Constants for mock data
 */
const MOCK_IP_ADDRESS = '127.0.0.1';
const MOCK_USER_AGENT = 'test-agent';

/**
 * Mock Better-Auth session type
 * Matches the return type of auth.api.getSession()
 */
export interface MockSession {
    session: {
        id: string;
        userId: string;
        expiresAt: Date;
        token: string;
        ipAddress?: string | null;
        userAgent?: string | null;
        createdAt: Date;
        updatedAt: Date;
    };
    user: {
        id: string;
        email: string;
        name: string;
        emailVerified: boolean;
        createdAt: Date;
        updatedAt: Date;
        role: string;
        isActive: boolean;
        deletedAt?: Date | null;
    };
}

/**
 * Mock admin user session (Better-Auth format)
 */
export const mockAdminSession: MockSession = {
    session: {
        id: 'session-1',
        userId: 'test-admin-uuid-1',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        token: 'mock-token-1',
        ipAddress: MOCK_IP_ADDRESS,
        userAgent: MOCK_USER_AGENT,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    user: {
        id: 'test-admin-uuid-1',
        email: 'admin@test.com',
        name: 'Admin User',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: AuthRoles.Admin,
        isActive: true
    }
};

/**
 * Mock viewer (non-admin) user session (Better-Auth format)
 */
export const mockViewerSession: MockSession = {
    session: {
        id: 'session-2',
        userId: 'test-viewer-uuid-2',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        token: 'mock-token-2',
        ipAddress: MOCK_IP_ADDRESS,
        userAgent: MOCK_USER_AGENT,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    user: {
        id: 'test-viewer-uuid-2',
        email: 'viewer@test.com',
        name: 'Viewer User',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: AuthRoles.Viewer,
        isActive: true
    }
};

/**
 * Mock inactive user session (Better-Auth format)
 */
export const mockInactiveSession: MockSession = {
    session: {
        id: 'session-3',
        userId: 'test-inactive-uuid-3',
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        token: 'mock-token-3',
        ipAddress: MOCK_IP_ADDRESS,
        userAgent: MOCK_USER_AGENT,
        createdAt: new Date(),
        updatedAt: new Date()
    },
    user: {
        id: 'test-inactive-uuid-3',
        email: 'inactive@test.com',
        name: 'Inactive User',
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        role: AuthRoles.Viewer,
        isActive: false
    }
};

/**
 * Create a custom mock session (Better-Auth format)
 */
export function createMockSession(overrides: Partial<MockSession['user']> = {}): MockSession {
    const userId = overrides.id ?? 'test-user-uuid-99';
    return {
        session: {
            id: 'session-99',
            userId,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            token: 'mock-token-99',
            ipAddress: MOCK_IP_ADDRESS,
            userAgent: MOCK_USER_AGENT,
            createdAt: new Date(),
            updatedAt: new Date()
        },
        user: {
            id: userId,
            email: 'test@test.com',
            name: 'Test User',
            emailVerified: false,
            createdAt: new Date(),
            updatedAt: new Date(),
            role: AuthRoles.Viewer,
            isActive: true,
            ...overrides
        }
    };
}

import type { vi as Vi } from 'vitest';

/**
 * Mock auth.api.getSession() function for server components
 * Note: Import vi from vitest in your test file before using this
 */

export function mockAuthGetSession(vi: typeof Vi, session: MockSession | null = null) {
    return vi.fn(() => Promise.resolve(session));
}
