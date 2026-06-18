import { EventEmitter } from 'node:events';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSessionManager } from './session-manager';
import * as transcode from './transcode';
import { DEFAULT_SETTINGS } from './types';

// Test constants
const TEST_SESSION_ID = '1:42';
const TEST_CHANNEL_NAME = 'Test Channel';
const TEST_SOURCE_URL = 'http://tuner:5004/auto/v10.1';
const TEST_VIEWER_1 = 'viewer-1';

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
        vi.mocked(transcode.startTranscode).mockResolvedValue({
            process: mockProcess as never,
            getStderr: () => '',
        });
        vi.mocked(transcode.waitForPlaylist).mockResolvedValue(true);
        vi.mocked(transcode.stopTranscode).mockResolvedValue();
        vi.mocked(transcode.cleanupTranscodeFiles).mockResolvedValue();
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

            const session = await manager.getOrCreateSession({
                tunerId: 1,
                channelId: 42,
                channelName: TEST_CHANNEL_NAME,
                sourceUrl: TEST_SOURCE_URL,
                settings: DEFAULT_SETTINGS,
            });

            expect(session).toBeDefined();
            expect(session.sessionId).toBe(TEST_SESSION_ID);
            expect(session.tunerId).toBe(1);
            expect(session.channelId).toBe(42);
            expect(session.channelName).toBe(TEST_CHANNEL_NAME);
            expect(session.viewers.size).toBe(0);
            expect(session.status).toBe('running');
            expect(transcode.startTranscode).toHaveBeenCalled();
        });

        it('should reuse existing session', async () => {
            const manager = getSessionManager();

            const session1 = await manager.getOrCreateSession({
                tunerId: 1,
                channelId: 42,
                channelName: TEST_CHANNEL_NAME,
                sourceUrl: TEST_SOURCE_URL,
                settings: DEFAULT_SETTINGS,
            });

            const session2 = await manager.getOrCreateSession({
                tunerId: 1,
                channelId: 42,
                channelName: TEST_CHANNEL_NAME,
                sourceUrl: TEST_SOURCE_URL,
                settings: DEFAULT_SETTINGS,
            });

            expect(session1.sessionId).toBe(session2.sessionId);
            expect(transcode.startTranscode).toHaveBeenCalledTimes(1);
        });

        it('should reject when max sessions reached', async () => {
            const manager = getSessionManager();
            const settings = { ...DEFAULT_SETTINGS, maxSessions: 1 };

            await manager.getOrCreateSession({
                tunerId: 1,
                channelId: 42,
                channelName: 'Channel 1',
                sourceUrl: TEST_SOURCE_URL,
                settings,
            });

            await expect(
                manager.getOrCreateSession({
                    tunerId: 1,
                    channelId: 43,
                    channelName: 'Channel 2',
                    sourceUrl: 'http://tuner:5004/auto/v11.1',
                    settings,
                })
            ).rejects.toThrow('Maximum concurrent sessions');
        });

        it('should handle playlist timeout error', async () => {
            const manager = getSessionManager();
            vi.mocked(transcode.waitForPlaylist).mockResolvedValue(false);

            await expect(
                manager.getOrCreateSession({
                    tunerId: 1,
                    channelId: 42,
                    channelName: TEST_CHANNEL_NAME,
                    sourceUrl: TEST_SOURCE_URL,
                    settings: DEFAULT_SETTINGS,
                })
            ).rejects.toThrow('Playlist not created within timeout');
        });
    });

    describe('viewer management', () => {
        it('should increment viewer count', async () => {
            const manager = getSessionManager();

            const session = await manager.getOrCreateSession({
                tunerId: 1,
                channelId: 42,
                channelName: TEST_CHANNEL_NAME,
                sourceUrl: TEST_SOURCE_URL,
                settings: DEFAULT_SETTINGS,
            });

            expect(session.viewers.size).toBe(0);

            manager.addViewer({ sessionId: TEST_SESSION_ID, viewerId: TEST_VIEWER_1 });
            const updated = manager.getSession(TEST_SESSION_ID);
            expect(updated?.viewers.size).toBe(1);

            manager.addViewer({ sessionId: TEST_SESSION_ID, viewerId: 'viewer-2' });
            const updated2 = manager.getSession(TEST_SESSION_ID);
            expect(updated2?.viewers.size).toBe(2);
        });

        it('should update viewer activity', async () => {
            const manager = getSessionManager();

            await manager.getOrCreateSession({
                tunerId: 1,
                channelId: 42,
                channelName: TEST_CHANNEL_NAME,
                sourceUrl: TEST_SOURCE_URL,
                settings: DEFAULT_SETTINGS,
            });

            manager.addViewer({ sessionId: TEST_SESSION_ID, viewerId: TEST_VIEWER_1 });
            manager.addViewer({ sessionId: TEST_SESSION_ID, viewerId: 'viewer-2' });

            const session = manager.getSession(TEST_SESSION_ID);
            expect(session?.viewers.size).toBe(2);

            // Update activity should succeed for existing viewer
            const updated = manager.updateViewerActivity(TEST_SESSION_ID, TEST_VIEWER_1);
            expect(updated).toBe(true);

            // Update should fail for non-existent viewer
            const notFound = manager.updateViewerActivity(TEST_SESSION_ID, 'viewer-3');
            expect(notFound).toBe(false);
        });

        it('should get session viewers', async () => {
            const manager = getSessionManager();

            await manager.getOrCreateSession({
                tunerId: 1,
                channelId: 42,
                channelName: TEST_CHANNEL_NAME,
                sourceUrl: TEST_SOURCE_URL,
                settings: DEFAULT_SETTINGS,
            });

            manager.addViewer({ sessionId: TEST_SESSION_ID, viewerId: TEST_VIEWER_1 });
            manager.addViewer({ sessionId: TEST_SESSION_ID, viewerId: 'viewer-2' });

            const viewers = manager.getSessionViewers(TEST_SESSION_ID);
            expect(viewers).toHaveLength(2);
            expect(viewers[0].viewerId).toBe(TEST_VIEWER_1);
            expect(viewers[1].viewerId).toBe('viewer-2');
        });
    });

    describe('stopSession', () => {
        it('should stop a session', async () => {
            const manager = getSessionManager();

            await manager.getOrCreateSession({
                tunerId: 1,
                channelId: 42,
                channelName: TEST_CHANNEL_NAME,
                sourceUrl: TEST_SOURCE_URL,
                settings: DEFAULT_SETTINGS,
            });

            await manager.stopSession(TEST_SESSION_ID);

            expect(transcode.stopTranscode).toHaveBeenCalled();
            expect(transcode.cleanupTranscodeFiles).toHaveBeenCalled();
            expect(manager.getSession(TEST_SESSION_ID)).toBeUndefined();
        });

        it('should handle stopping non-existent session', async () => {
            const manager = getSessionManager();

            await expect(manager.stopSession('9:99')).resolves.not.toThrow();
        });
    });

    describe('getActiveSessions', () => {
        it('should return stats for active sessions', async () => {
            const manager = getSessionManager();

            await manager.getOrCreateSession({
                tunerId: 1,
                channelId: 42,
                channelName: 'Channel 1',
                sourceUrl: TEST_SOURCE_URL,
                settings: DEFAULT_SETTINGS,
            });

            await manager.getOrCreateSession({
                tunerId: 1,
                channelId: 43,
                channelName: 'Channel 2',
                sourceUrl: 'http://tuner:5004/auto/v11.1',
                settings: DEFAULT_SETTINGS,
            });

            manager.addViewer({ sessionId: TEST_SESSION_ID, viewerId: TEST_VIEWER_1 });

            const stats = manager.getActiveSessions();
            expect(stats).toHaveLength(2);
            expect(stats[0]).toMatchObject({
                sessionId: TEST_SESSION_ID,
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

            await manager.getOrCreateSession({
                tunerId: 1,
                channelId: 42,
                channelName: TEST_CHANNEL_NAME,
                sourceUrl: TEST_SOURCE_URL,
                settings: DEFAULT_SETTINGS,
            });

            manager.addViewer({ sessionId: TEST_SESSION_ID, viewerId: TEST_VIEWER_1 });

            await manager.cleanupInactiveSessions();

            expect(manager.getSession(TEST_SESSION_ID)).toBeDefined();
            expect(transcode.stopTranscode).not.toHaveBeenCalled();
        });

        it('should cleanup inactive viewers and stop session when all gone', async () => {
            const manager = getSessionManager();

            const session = await manager.getOrCreateSession({
                tunerId: 1,
                channelId: 42,
                channelName: TEST_CHANNEL_NAME,
                sourceUrl: TEST_SOURCE_URL,
                settings: DEFAULT_SETTINGS,
            });

            // Add a viewer
            manager.addViewer({ sessionId: TEST_SESSION_ID, viewerId: TEST_VIEWER_1 });

            // Get the viewer and simulate 31 seconds passing
            const viewer = session.viewers.get(TEST_VIEWER_1);
            if (viewer !== undefined) {
                viewer.lastAccess = Date.now() - 31000;
            }

            await manager.cleanupInactiveSessions();

            expect(manager.getSession(TEST_SESSION_ID)).toBeUndefined();
            expect(transcode.stopTranscode).toHaveBeenCalled();
        });
    });
});
