import { expect, test, vi, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { createTestDatabase, seedTestDatabase } from '@/test-utils/setup-test-db';
import type { DB } from '@/lib/database/db';

let testDb: DB;

// Mock the database before importing the component
vi.mock('@/lib/database/db', () => ({
    getDb: vi.fn(() => testDb)
}));

// Set up test database
beforeAll(async () => {
    testDb = createTestDatabase();
    await seedTestDatabase(testDb);
});

test('Page', async () => {
    const Page = (await import('./page')).default;
    render(await Page());
    expect(screen.getByRole('heading', { level: 1, name: /Welcome back, Test User/i })).toBeDefined();
});
