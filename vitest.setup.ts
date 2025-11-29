import { vi } from 'vitest';

// Set up environment variables for tests
process.env.HD_HOMEY_DB_PATH = ':memory:';
process.env.AUTH_SECRET = 'test-secret-key-for-testing-only';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        refresh: vi.fn(),
    }),
    useSearchParams: () => ({
        get: vi.fn(),
    }),
    redirect: vi.fn(),
}));

vi.mock('next/headers', () => ({
    headers: vi.fn(() => Promise.resolve(new Map([
        ['user-agent', 'test-agent'],
        ['cookie', 'test-cookie'],
    ]))),
    cookies: vi.fn(() => Promise.resolve({
        get: vi.fn(),
        set: vi.fn(),
        delete: vi.fn(),
    })),
}));

vi.mock('@/auth', () => ({
    auth: () => Promise.resolve({
        user: {
            name: 'Test User'
        }
    }),
}));
