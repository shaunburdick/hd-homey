import { describe, it, expect, vi, beforeEach } from 'vitest';
import { toggleFavoriteAction, toggleHiddenAction } from './channel-preferences';
import type { PreferenceActionResult } from './channel-preferences';
import { setupTestDatabase } from '@/test-utils/setup-test-db';
import type { DB } from '@/lib/database/db';
import { auth } from '@/lib/auth/auth';
import { createMockSession } from '@/test-utils/mock-auth';
import { AuthRoles } from '@/lib/auth-roles';
import { user, tuners, channels } from '@/lib/database/schema';

let testDb: DB;

vi.mock('@/lib/database/db', () => ({
    getDb: vi.fn(() => Promise.resolve(testDb)),
}));

vi.mock('@/lib/auth/auth', () => ({
    auth: {
        api: {
            getSession: vi.fn(),
        }
    },
}));

const { refreshDb } = setupTestDatabase();

describe('Channel Preferences Actions', () => {
    let testUserId: string;
    let testChannelId: number;

    beforeEach(async () => {
        testDb = await refreshDb();
        vi.clearAllMocks();

        // Create test user
        const testUsers = testDb
            .insert(user)
            .values({
                name: 'Test User',
                username: 'testuser',
                email: 'test@example.com',
                role: AuthRoles.Viewer,
            })
            .returning()
            .all();

        testUserId = testUsers[0].id;

        // Create test tuner
        const testTuners = testDb
            .insert(tuners)
            .values({
                name: 'Test Tuner',
                path: 'http://test-tuner:80',
            })
            .returning()
            .all();

        // Create test channel
        const testChannels = testDb
            .insert(channels)
            .values({
                guideNumber: '2.1',
                guideName: 'Test Channel',
                url: 'http://test-tuner:80/auto/v2.1',
                hd: 1,
                videoCodec: 'h264',
                audioCodec: 'aac',
                fk_tuner: testTuners[0].id,
            })
            .returning()
            .all();

        testChannelId = testChannels[0].id;
    });

    describe('toggleFavoriteAction', () => {
        it('should successfully favorite a channel', async () => {
            // Mock authenticated session
            const mockSession = createMockSession({
                id: testUserId,
                role: AuthRoles.Viewer,
            });
            vi.mocked(auth.api.getSession).mockResolvedValue(mockSession);

            const result: PreferenceActionResult = await toggleFavoriteAction(testChannelId);

            expect(result.success).toBe(true);
            expect(result.preference?.isFavorite).toBe(true);
            expect(result.preference?.isHidden).toBe(false);
            expect(result.error).toBeUndefined();
        });

        it('should successfully unfavorite a favorited channel', async () => {
            // Mock authenticated session
            const mockSession = createMockSession({
                id: testUserId,
                role: AuthRoles.Viewer,
            });
            vi.mocked(auth.api.getSession).mockResolvedValue(mockSession);

            // First, favorite the channel
            await toggleFavoriteAction(testChannelId);

            // Then unfavorite it
            const result: PreferenceActionResult = await toggleFavoriteAction(testChannelId);

            expect(result.success).toBe(true);
            expect(result.preference?.isFavorite).toBe(false);
            expect(result.preference?.isHidden).toBe(false);
        });

        it('should auto-unhide when favoriting a hidden channel', async () => {
            // Mock authenticated session
            const mockSession = createMockSession({
                id: testUserId,
                role: AuthRoles.Viewer,
            });
            vi.mocked(auth.api.getSession).mockResolvedValue(mockSession);

            // First, hide the channel
            await toggleHiddenAction(testChannelId);

            // Then favorite it (should auto-unhide)
            const result: PreferenceActionResult = await toggleFavoriteAction(testChannelId);

            expect(result.success).toBe(true);
            expect(result.preference?.isFavorite).toBe(true);
            expect(result.preference?.isHidden).toBe(false);
        });

        it('should fail when user is not authenticated', async () => {
            // Mock unauthenticated session
            vi.mocked(auth.api.getSession).mockResolvedValue(null);

            const result: PreferenceActionResult = await toggleFavoriteAction(testChannelId);

            expect(result.success).toBe(false);
            expect(result.error).toBe('You must be logged in to favorite channels');
            expect(result.preference).toBeUndefined();
        });
    });

    describe('toggleHiddenAction', () => {
        it('should successfully hide a channel', async () => {
            // Mock authenticated session
            const mockSession = createMockSession({
                id: testUserId,
                role: AuthRoles.Viewer,
            });
            vi.mocked(auth.api.getSession).mockResolvedValue(mockSession);

            const result: PreferenceActionResult = await toggleHiddenAction(testChannelId);

            expect(result.success).toBe(true);
            expect(result.preference?.isHidden).toBe(true);
            expect(result.preference?.isFavorite).toBe(false);
            expect(result.error).toBeUndefined();
        });

        it('should successfully unhide a hidden channel', async () => {
            // Mock authenticated session
            const mockSession = createMockSession({
                id: testUserId,
                role: AuthRoles.Viewer,
            });
            vi.mocked(auth.api.getSession).mockResolvedValue(mockSession);

            // First, hide the channel
            await toggleHiddenAction(testChannelId);

            // Then unhide it
            const result: PreferenceActionResult = await toggleHiddenAction(testChannelId);

            expect(result.success).toBe(true);
            expect(result.preference?.isHidden).toBe(false);
            expect(result.preference?.isFavorite).toBe(false);
        });

        it('should auto-unfavorite when hiding a favorited channel', async () => {
            // Mock authenticated session
            const mockSession = createMockSession({
                id: testUserId,
                role: AuthRoles.Viewer,
            });
            vi.mocked(auth.api.getSession).mockResolvedValue(mockSession);

            // First, favorite the channel
            await toggleFavoriteAction(testChannelId);

            // Then hide it (should auto-unfavorite)
            const result: PreferenceActionResult = await toggleHiddenAction(testChannelId);

            expect(result.success).toBe(true);
            expect(result.preference?.isHidden).toBe(true);
            expect(result.preference?.isFavorite).toBe(false);
        });

        it('should fail when user is not authenticated', async () => {
            // Mock unauthenticated session
            vi.mocked(auth.api.getSession).mockResolvedValue(null);

            const result: PreferenceActionResult = await toggleHiddenAction(testChannelId);

            expect(result.success).toBe(false);
            expect(result.error).toBe('You must be logged in to hide channels');
            expect(result.preference).toBeUndefined();
        });
    });
});
