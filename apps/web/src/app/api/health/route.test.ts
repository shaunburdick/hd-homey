/**
 * Health endpoint tests
 */

import { describe, it, expect } from 'vitest';
import { GET } from './route';

describe('Health API', () => {
    describe('GET /api/health', () => {
        it('should return 200 OK with status', async () => {
            const response = await GET();
            expect(response.status).toBe(200);

            const data = await response.json();
            expect(data).toHaveProperty('status', 'ok');
            expect(data).toHaveProperty('timestamp');
            expect(typeof data.timestamp).toBe('string');
        });

        it('should return valid ISO timestamp', async () => {
            const response = await GET();
            const data = await response.json();

            // Verify timestamp is valid ISO 8601 format
            const timestamp = new Date(data.timestamp);
            expect(timestamp.toISOString()).toBe(data.timestamp);
        });

        it('should have no-cache headers', async () => {
            const response = await GET();
            const cacheControl = response.headers.get('Cache-Control');
            expect(cacheControl).toBe('no-cache, no-store, must-revalidate');
        });

        it('should include version metadata', async () => {
            const response = await GET();
            const data = await response.json();

            // Verify version metadata fields exist
            expect(data).toHaveProperty('version');
            expect(data).toHaveProperty('commit');
            expect(data).toHaveProperty('branch');
            expect(data).toHaveProperty('buildDate');
            expect(data).toHaveProperty('environment');

            // Verify types
            expect(typeof data.version).toBe('string');
            expect(typeof data.commit).toBe('string');
            // branch can be null for detached HEAD
            expect(data.branch === null || typeof data.branch === 'string').toBe(true);
            expect(typeof data.buildDate).toBe('string');
            expect(['production', 'development']).toContain(data.environment);
        });

        it('should have valid buildDate in ISO 8601 format', async () => {
            const response = await GET();
            const data = await response.json();

            // Should be parseable as a date
            const date = new Date(data.buildDate);
            expect(date.toString()).not.toBe('Invalid Date');
        });
    });
});
