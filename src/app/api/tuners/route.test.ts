import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { GET } from './route';
import { createTestDatabase, seedTestDatabase, cleanupTestDatabase } from '@/test-utils/setup-test-db';
import type { DB } from '@/lib/database/db';

// Mock the database module
let testDb: DB;
vi.mock('@/lib/database/db', () => ({
    getDb: vi.fn(() => Promise.resolve(testDb))
}));

describe('GET /api/tuners', () => {
    beforeEach(async () => {
        testDb = createTestDatabase();
        await seedTestDatabase(testDb);
        vi.clearAllMocks();
    });

    afterEach(() => {
        cleanupTestDatabase(testDb);
    });

    it('should return all active tuners', async () => {
        const response = await GET();
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.data).toBeDefined();
        expect(Array.isArray(json.data)).toBe(true);
        expect(json.data.length).toBeGreaterThan(0);
    });

    it('should not return deleted tuners', async () => {
        const { tuners } = await import('@/lib/database/schema');
        const { eq } = await import('drizzle-orm');

        // Get a tuner and soft-delete it
        const tuner = testDb.select().from(tuners).limit(1).get();
        if (!tuner) {
            throw new Error('Test setup failed: no tuner found');
        }

        testDb.update(tuners)
            .set({ is_active: false, deleted_at: new Date() })
            .where(eq(tuners.id, tuner.id))
            .run();

        const response = await GET();
        const json = await response.json();

        // Verify deleted tuner is not in results
        const deletedTunerInResults = json.data.find((t: { id: number }) => t.id === tuner.id);
        expect(deletedTunerInResults).toBeUndefined();
    });

    it('should return tuners with all expected fields', async () => {
        const response = await GET();
        const json = await response.json();

        const tuner = json.data[0];
        expect(tuner).toHaveProperty('id');
        expect(tuner).toHaveProperty('name');
        expect(tuner).toHaveProperty('path');
        expect(tuner).toHaveProperty('is_active');
        expect(tuner).toHaveProperty('created_at');
        expect(tuner).toHaveProperty('modified_at');
    });

    it('should return empty array when no tuners exist', async () => {
        const { tuners } = await import('@/lib/database/schema');

        // Soft delete all tuners
        testDb.update(tuners)
            .set({ is_active: false, deleted_at: new Date() })
            .run();

        const response = await GET();
        const json = await response.json();

        expect(response.status).toBe(200);
        expect(json.data).toEqual([]);
    });

    it('should return Response object with correct content-type', async () => {
        const response = await GET();

        expect(response).toBeInstanceOf(Response);
        expect(response.headers.get('content-type')).toContain('application/json');
    });
});
