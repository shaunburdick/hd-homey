import type { Session } from 'next-auth';

/**
 * Mock admin user session
 */
export const mockAdminSession: Session = {
    user: {
        id: '1',
        email: 'admin@test.com',
        name: 'Admin User',
        isAdmin: true,
        isActive: true
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
};

/**
 * Mock viewer (non-admin) user session
 */
export const mockViewerSession: Session = {
    user: {
        id: '2',
        email: 'viewer@test.com',
        name: 'Viewer User',
        isAdmin: false,
        isActive: true
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
};

/**
 * Mock inactive user session
 */
export const mockInactiveSession: Session = {
    user: {
        id: '3',
        email: 'inactive@test.com',
        name: 'Inactive User',
        isAdmin: false,
        isActive: false
    },
    expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
};

/**
 * Create a custom mock session
 */
export function createMockSession(overrides: Partial<Session['user']> = {}): Session {
    return {
        user: {
            id: '99',
            email: 'test@test.com',
            name: 'Test User',
            isAdmin: false,
            isActive: true,
            ...overrides
        },
        expires: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
    };
}

/**
 * Mock auth() function for server components
 */
export function mockAuth(session: Session | null = null) {
    return vi.fn(() => Promise.resolve(session));
}
