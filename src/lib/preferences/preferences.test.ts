/**
 * Unit tests for User Channel Preferences (SPEC-012)
 * Tests business logic for favorites and hidden channels
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
    getUserChannelPreferences,
    getPreference,
    upsertPreference,
    toggleFavorite,
    toggleHidden,
} from './preferences';
import type { DB } from '@/lib/database/db';
import { user, tuners, channels, userChannelPreferences } from '@/lib/database/schema';
import { createTestDatabase } from '@/test-utils/setup-test-db';

describe('User Channel Preferences', () => {
    let db: DB;
    let testUserId: string;
    let testChannelId: number;

    beforeEach(() => {
        db = createTestDatabase();

        // Create test user
        const [testUser] = db
            .insert(user)
            .values({
                id: 'test-user-1',
                name: 'Test User',
                email: 'test@example.com',
                username: 'testuser',
                role: 'viewer',
            })
            .returning()
            .all();
        testUserId = testUser.id;

        // Create test tuner
        const [testTuner] = db
            .insert(tuners)
            .values({
                name: 'Test Tuner',
                path: 'http://192.168.1.100',
            })
            .returning()
            .all();

        // Create test channel
        const [testChannel] = db
            .insert(channels)
            .values({
                fk_tuner: testTuner.id,
                guideNumber: '4.1',
                guideName: 'TEST Channel',
                videoCodec: 'h264',
                audioCodec: 'aac',
                hd: 1,
                url: 'http://192.168.1.100:5004/auto/v4.1',
            })
            .returning()
            .all();
        testChannelId = testChannel.id;
    });

    describe('getUserChannelPreferences', () => {
        it('should return empty array when user has no preferences', () => {
            const prefs = getUserChannelPreferences(db, testUserId);
            expect(prefs).toEqual([]);
        });

        it('should return user preferences with channel details', () => {
            // Create a preference
            db.insert(userChannelPreferences).values({
                userId: testUserId,
                channelId: testChannelId,
                isFavorite: true,
                isHidden: false,
            }).run();

            const prefs = getUserChannelPreferences(db, testUserId);
            expect(prefs).toHaveLength(1);
            expect(prefs[0]).toMatchObject({
                channelId: testChannelId,
                isFavorite: true,
                isHidden: false,
            });
        });

        it('should return multiple preferences for a user', () => {
            // Create another channel
            const [channel2] = db
                .insert(channels)
                .values({
                    fk_tuner: testChannelId,
                    guideNumber: '4.2',
                    guideName: 'TEST Channel 2',
                    videoCodec: 'h264',
                    audioCodec: 'aac',
                    hd: 1,
                    url: 'http://192.168.1.100:5004/auto/v4.2',
                })
                .returning()
                .all();

            // Create two preferences
            db.insert(userChannelPreferences).values([
                {
                    userId: testUserId,
                    channelId: testChannelId,
                    isFavorite: true,
                    isHidden: false,
                },
                {
                    userId: testUserId,
                    channelId: channel2.id,
                    isFavorite: false,
                    isHidden: true,
                },
            ]).run();

            const prefs = getUserChannelPreferences(db, testUserId);
            expect(prefs).toHaveLength(2);
        });
    });

    describe('getPreference', () => {
        it('should return null when preference does not exist', () => {
            const pref = getPreference(db, testUserId, testChannelId);
            expect(pref).toBeNull();
        });

        it('should return preference when it exists', () => {
            db.insert(userChannelPreferences).values({
                userId: testUserId,
                channelId: testChannelId,
                isFavorite: true,
                isHidden: false,
            }).run();

            const pref = getPreference(db, testUserId, testChannelId);
            expect(pref).not.toBeNull();
            expect(pref?.isFavorite).toBe(true);
            expect(pref?.isHidden).toBe(false);
        });
    });

    describe('upsertPreference', () => {
        it('should create new preference when none exists', () => {
            const result = upsertPreference(db, testUserId, testChannelId, {
                isFavorite: true,
                isHidden: false,
            });

            expect(result).toBeDefined();
            expect(result.isFavorite).toBe(true);
            expect(result.isHidden).toBe(false);

            // Verify it was saved
            const pref = getPreference(db, testUserId, testChannelId);
            expect(pref?.isFavorite).toBe(true);
        });

        it('should update existing preference', () => {
            // Create initial preference
            db.insert(userChannelPreferences).values({
                userId: testUserId,
                channelId: testChannelId,
                isFavorite: false,
                isHidden: false,
            }).run();

            // Update it
            const result = upsertPreference(db, testUserId, testChannelId, {
                isFavorite: true,
                isHidden: false,
            });

            expect(result.isFavorite).toBe(true);
        });

        it('should reject favorite+hidden combination', () => {
            expect(() => upsertPreference(db, testUserId, testChannelId, {
                isFavorite: true,
                isHidden: true,
            })).toThrow();
        });
    });

    describe('toggleFavorite', () => {
        it('should create favorite preference when none exists', () => {
            const result = toggleFavorite(db, testUserId, testChannelId);

            expect(result.isFavorite).toBe(true);
            expect(result.isHidden).toBe(false);
        });

        it('should unfavorite when already favorite', () => {
            // Create favorite
            db.insert(userChannelPreferences).values({
                userId: testUserId,
                channelId: testChannelId,
                isFavorite: true,
                isHidden: false,
            }).run();

            // Toggle it
            const result = toggleFavorite(db, testUserId, testChannelId);
            expect(result.isFavorite).toBe(false);
        });

        it('should favorite when not favorite', () => {
            // Create non-favorite
            db.insert(userChannelPreferences).values({
                userId: testUserId,
                channelId: testChannelId,
                isFavorite: false,
                isHidden: false,
            }).run();

            // Toggle it
            const result = toggleFavorite(db, testUserId, testChannelId);
            expect(result.isFavorite).toBe(true);
        });

        it('should auto-unhide when favoriting a hidden channel', () => {
            // Create hidden channel
            db.insert(userChannelPreferences).values({
                userId: testUserId,
                channelId: testChannelId,
                isFavorite: false,
                isHidden: true,
            }).run();

            // Favorite it (should auto-unhide)
            const result = toggleFavorite(db, testUserId, testChannelId);
            expect(result.isFavorite).toBe(true);
            expect(result.isHidden).toBe(false);
        });
    });

    describe('toggleHidden', () => {
        it('should create hidden preference when none exists', () => {
            const result = toggleHidden(db, testUserId, testChannelId);

            expect(result.isFavorite).toBe(false);
            expect(result.isHidden).toBe(true);
        });

        it('should unhide when already hidden', () => {
            // Create hidden
            db.insert(userChannelPreferences).values({
                userId: testUserId,
                channelId: testChannelId,
                isFavorite: false,
                isHidden: true,
            }).run();

            // Toggle it
            const result = toggleHidden(db, testUserId, testChannelId);
            expect(result.isHidden).toBe(false);
        });

        it('should hide when not hidden', () => {
            // Create non-hidden
            db.insert(userChannelPreferences).values({
                userId: testUserId,
                channelId: testChannelId,
                isFavorite: false,
                isHidden: false,
            }).run();

            // Toggle it
            const result = toggleHidden(db, testUserId, testChannelId);
            expect(result.isHidden).toBe(true);
        });

        it('should auto-unfavorite when hiding a favorited channel', () => {
            // Create favorite channel
            db.insert(userChannelPreferences).values({
                userId: testUserId,
                channelId: testChannelId,
                isFavorite: true,
                isHidden: false,
            }).run();

            // Hide it (should auto-unfavorite)
            const result = toggleHidden(db, testUserId, testChannelId);
            expect(result.isFavorite).toBe(false);
            expect(result.isHidden).toBe(true);
        });
    });
});
