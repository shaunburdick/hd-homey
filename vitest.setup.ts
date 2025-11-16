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

vi.mock('@/auth', () => ({
    auth: () => Promise.resolve({
        user: {
            name: 'Test User'
        }
    }),
}));
