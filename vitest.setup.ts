import { vi } from 'vitest';

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
