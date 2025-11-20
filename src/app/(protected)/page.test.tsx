import { expect, test, beforeAll, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { setupTestDatabase } from '@/test-utils/setup-test-db';
import type { DB } from '@/lib/database/db';

let testDb: DB;

vi.mock('@/lib/database/db', () => ({
    getDb: vi.fn(() => Promise.resolve(testDb)),
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
