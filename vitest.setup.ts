import { vi } from 'vitest';

// Set up environment variables for tests
process.env.HD_HOMEY_DB_PATH = ':memory:';
process.env.AUTH_SECRET = 'test-secret-key-for-testing-only';
process.env.NEXTAUTH_URL = 'http://localhost:3000';

// Mock localStorage for browser-dependent components
const localStorageMock = (() => {
    let store: Record<string, string> = {};
    return {
        getItem: (key: string) => store[key] ?? null,
        setItem: (key: string, value: string) => {
            store[key] = value.toString();
        },
        removeItem: (key: string) => {
            store = Object.fromEntries(
                Object.entries(store).filter(([k]) => k !== key)
            );
        },
        clear: () => {
            store = {};
        },
    };
})();

Object.defineProperty(global, 'localStorage', {
    value: localStorageMock,
});

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
