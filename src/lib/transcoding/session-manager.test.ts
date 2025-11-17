import { EventEmitter } from 'events';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSessionManager } from './session-manager';
import * as transcode from './transcode';
import { DEFAULT_SETTINGS } from './types';

// Mock child process
class MockChildProcess extends EventEmitter {
    public pid = 12345;
    public stdout = new EventEmitter();
    public stderr = new EventEmitter();
    public kill = vi.fn();
}

// Mock transcode module
vi.mock('./transcode', () => ({
    startTranscode: vi.fn(),
    stopTranscode: vi.fn(),
    waitForPlaylist: vi.fn(),
    cleanupTranscodeFiles: vi.fn(),
}));

describe('TranscodingSessionManager', () => {
    let mockProcess: MockChildProcess;

    beforeEach(() => {
        vi.clearAllMocks();
        mockProcess = new MockChildProcess();

        // Setup default mocks
        vi.mocked(transcode.startTranscode).mockResolvedValue(mockProcess as never);
        vi.mocked(transcode.waitForPlaylist).mockResolvedValue(true);
        vi.mocked(transcode.stopTranscode).mockResolvedValue(undefined);
        vi.mocked(transcode.cleanupTranscodeFiles).mockResolvedValue(undefined);
    });

    afterEach(async () => {
        // Clean up any sessions after each test
        const manager = getSessionManager();
        await manager.stopAllSessions();
        manager.stopCleanupTimer();
    });

    describe('getOrCreateSession', () => {
        it('should create a new session', async () => {
            const manager = getSessionManager();

            const session = await manager.getOrCreateSession(
                1,
                42,
                'Test Channel',
                'http://tuner:5004/auto/v10.1',
                DEFAULT_SETTINGS
            );

            expect(session).toBeDefined();
            expect(session.sessionId).toBe('1:42');
            expect(session.tunerId).toBe(1);
            expect(session.channelId).toBe(42);
            expect(session.channelName).toBe('Test Channel');
            expect(session.viewerCount).toBe(0);
            expect(session.status).toBe('running');
            expect(transcode.startTranscode).toHaveBeenCalled();
        });

        it('should reuse existing session', async () => {
            const manager = getSessionManager();

            const session1 = await manager.getOrCreateSession(
                1,
                42,
                'Test Channel',
                'http://tuner:5004/auto/v10.1',
                DEFAULT_SETTINGS
            );

            const session2 = await manager.getOrCreateSession(
                1,
                42,
                'Test Channel',
                'http://tuner:5004/auto/v10.1',
                DEFAULT_SETTINGS
            );

            expect(session1.sessionId).toBe(session2.sessionId);
            expect(transcode.startTranscode).toHaveBeenCalledTimes(1);
        });

        it('should reject when max sessions reached', async () => {
            const manager = getSessionManager();
            const settings = { ...DEFAULT_SETTINGS, maxSessions: 1 };

            await manager.getOrCreateSession(
                1,
                42,
                'Channel 1',
                'http://tuner:5004/auto/v10.1',
                settings
            );

            await expect(
                manager.getOrCreateSession(
                    1,
                    43,
                    'Channel 2',
                    'http://tuner:5004/auto/v11.1',
                    settings
                )
            ).rejects.toThrow('Maximum concurrent sessions');
        });

        it('should handle playlist timeout error', async () => {
            const manager = getSessionManager();
            vi.mocked(transcode.waitForPlaylist).mockResolvedValue(false);

            await expect(
                manager.getOrCreateSession(
                    1,
                    42,
                    'Test Channel',
                    'http://tuner:5004/auto/v10.1',
                    DEFAULT_SETTINGS
                )
            ).rejects.toThrow('Playlist file not created');
        });
    });

    describe('viewer management', () => {
        it('should increment viewer count', async () => {
            const manager = getSessionManager();

            const session = await manager.getOrCreateSession(
                1,
                42,
                'Test Channel',
                'http://tuner:5004/auto/v10.1',
                DEFAULT_SETTINGS
            );

            expect(session.viewerCount).toBe(0);

            manager.incrementViewers('1:42');
            const updated = manager.getSession('1:42');
            expect(updated?.viewerCount).toBe(1);

            manager.incrementViewers('1:42');
            const updated2 = manager.getSession('1:42');
            expect(updated2?.viewerCount).toBe(2);
        });

        it('should decrement viewer count', async () => {
            const manager = getSessionManager();

            await manager.getOrCreateSession(
                1,
                42,
                'Test Channel',
                'http://tuner:5004/auto/v10.1',
                DEFAULT_SETTINGS
            );

            manager.incrementViewers('1:42');
            manager.incrementViewers('1:42');

            let session = manager.getSession('1:42');
            expect(session?.viewerCount).toBe(2);

            manager.decrementViewers('1:42');
            session = manager.getSession('1:42');
            expect(session?.viewerCount).toBe(1);

            manager.decrementViewers('1:42');
            session = manager.getSession('1:42');
            expect(session?.viewerCount).toBe(0);
        });

        it('should not decrement below zero', async () => {
            const manager = getSessionManager();

            await manager.getOrCreateSession(
                1,
                42,
                'Test Channel',
                'http://tuner:5004/auto/v10.1',
                DEFAULT_SETTINGS
            );

            manager.decrementViewers('1:42');
            const session = manager.getSession('1:42');
            expect(session?.viewerCount).toBe(0);
        });
    });

    describe('stopSession', () => {
        it('should stop a session', async () => {
            const manager = getSessionManager();

            await manager.getOrCreateSession(
                1,
                42,
                'Test Channel',
                'http://tuner:5004/auto/v10.1',
                DEFAULT_SETTINGS
            );

            await manager.stopSession('1:42');

            expect(transcode.stopTranscode).toHaveBeenCalled();
            expect(transcode.cleanupTranscodeFiles).toHaveBeenCalled();
            expect(manager.getSession('1:42')).toBeUndefined();
        });

        it('should handle stopping non-existent session', async () => {
            const manager = getSessionManager();

            await expect(manager.stopSession('9:99')).resolves.not.toThrow();
        });
    });

    describe('getActiveSessions', () => {
        it('should return stats for active sessions', async () => {
            const manager = getSessionManager();

            await manager.getOrCreateSession(
                1,
                42,
                'Channel 1',
                'http://tuner:5004/auto/v10.1',
                DEFAULT_SETTINGS
            );

            await manager.getOrCreateSession(
                1,
                43,
                'Channel 2',
                'http://tuner:5004/auto/v11.1',
                DEFAULT_SETTINGS
            );

            manager.incrementViewers('1:42');

            const stats = manager.getActiveSessions();
            expect(stats).toHaveLength(2);
            expect(stats[0]).toMatchObject({
                sessionId: '1:42',
                tunerId: 1,
                channelId: 42,
                channelName: 'Channel 1',
                viewerCount: 1,
                status: 'running',
            });
            expect(stats[0].uptime).toBeGreaterThanOrEqual(0);
        });

        it('should return empty array when no sessions', () => {
            const manager = getSessionManager();
            const stats = manager.getActiveSessions();
            expect(stats).toEqual([]);
        });
    });

    describe('cleanupInactiveSessions', () => {
        it('should not cleanup sessions with viewers', async () => {
            const manager = getSessionManager();

            await manager.getOrCreateSession(
                1,
                42,
                'Test Channel',
                'http://tuner:5004/auto/v10.1',
                DEFAULT_SETTINGS
            );

            manager.incrementViewers('1:42');

            await manager.cleanupInactiveSessions();

            expect(manager.getSession('1:42')).toBeDefined();
            expect(transcode.stopTranscode).not.toHaveBeenCalled();
        });

        it('should cleanup sessions with no viewers after timeout', async () => {
            const manager = getSessionManager();

            const session = await manager.getOrCreateSession(
                1,
                42,
                'Test Channel',
                'http://tuner:5004/auto/v10.1',
                DEFAULT_SETTINGS
            );

            // Simulate 31 seconds passing
            session.lastAccessTime = Date.now() - 31000;

            await manager.cleanupInactiveSessions();

            expect(manager.getSession('1:42')).toBeUndefined();
            expect(transcode.stopTranscode).toHaveBeenCalled();
        });
    });
});
