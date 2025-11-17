/**
 * Transcoding session manager - handles shared sessions across multiple viewers
 */

import { join } from 'path';
import type { ChildProcess } from 'child_process';
import type { TranscodeSettings, SessionStats } from './types';
import { startTranscode, stopTranscode, waitForPlaylist, cleanupTranscodeFiles } from './transcode';
import Logger from '@/lib/logger';

interface TranscodingSession {
    sessionId: string;
    tunerId: number;
    channelId: number;
    channelName: string;
    viewerCount: number;
    process: ChildProcess;
    pid: number;
    outputDir: string;
    playlistPath: string;
    startTime: number;
    lastAccessTime: number;
    settings: TranscodeSettings;
    status: 'starting' | 'running' | 'stopping' | 'error';
    error?: string;
}

/**
 * Singleton session manager
 */
class TranscodingSessionManager {
    private sessions = new Map<string, TranscodingSession>();
    private cleanupTimer: NodeJS.Timeout | null = null;
    private readonly CLEANUP_INTERVAL = 10000; // Check every 10 seconds
    private readonly INACTIVE_TIMEOUT = 30000; // 30 seconds of inactivity

    public constructor() {
        this.startCleanupTimer();
    }

    /**
     * Get or create a transcoding session
     */
    public async getOrCreateSession(
        tunerId: number,
        channelId: number,
        channelName: string,
        sourceUrl: string,
        settings: TranscodeSettings
    ): Promise<TranscodingSession> {
        const sessionId = `${tunerId}:${channelId}`;

        // Check if session already exists
        const existing = this.sessions.get(sessionId);
        if (existing) {
            Logger.info({ sessionId, viewerCount: existing.viewerCount }, 'Reusing existing session');
            existing.lastAccessTime = Date.now();
            return existing;
        }

        // Check if we've reached max sessions
        if (this.sessions.size >= settings.maxSessions) {
            throw new Error(
                `Maximum concurrent sessions (${settings.maxSessions}) reached`
            );
        }

        // Create new session
        const transcodeDir = process.env.HD_HOMEY_TRANSCODE_DIR
            || join('./data', 'transcoding');
        const outputDir = join(transcodeDir, sessionId.replace(':', '-'));
        const playlistPath = join(outputDir, 'playlist.m3u8');

        Logger.info(
            { sessionId, sourceUrl, outputDir, settings },
            'Creating new transcoding session'
        );

        const session: TranscodingSession = {
            sessionId,
            tunerId,
            channelId,
            channelName,
            viewerCount: 0,
            process: null as unknown as ChildProcess, // Will be set below
            pid: 0,
            outputDir,
            playlistPath,
            startTime: Date.now(),
            lastAccessTime: Date.now(),
            settings,
            status: 'starting',
        };

        try {
            // Start the transcode process
            const process = await startTranscode(sourceUrl, outputDir, settings);
            session.process = process;
            session.pid = process.pid || 0;

            // Wait for playlist to be created
            const playlistReady = await waitForPlaylist(playlistPath, 10000);
            if (!playlistReady) {
                throw new Error('Playlist file not created within timeout');
            }

            session.status = 'running';
            this.sessions.set(sessionId, session);

            // Handle process exit
            process.on('exit', (code) => {
                Logger.info({ sessionId, code }, 'Transcode process exited');
                session.status = code === 0 ? 'stopping' : 'error';
                if (code !== 0) {
                    session.error = `Process exited with code ${code}`;
                }
            });

            Logger.info({ sessionId, pid: session.pid }, 'Transcoding session started');
            return session;
        } catch (error) {
            session.status = 'error';
            session.error = error instanceof Error ? error.message : 'Unknown error';
            Logger.error({ error, sessionId }, 'Failed to start transcoding session');
            throw error;
        }
    }

    /**
     * Increment viewer count for a session
     */
    public incrementViewers(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.viewerCount++;
            session.lastAccessTime = Date.now();
            Logger.debug({ sessionId, viewerCount: session.viewerCount }, 'Viewer joined');
        }
    }

    /**
     * Decrement viewer count for a session
     */
    public decrementViewers(sessionId: string): void {
        const session = this.sessions.get(sessionId);
        if (session) {
            session.viewerCount = Math.max(0, session.viewerCount - 1);
            session.lastAccessTime = Date.now();
            Logger.debug(
                { sessionId, viewerCount: session.viewerCount },
                'Viewer left'
            );
        }
    }

    /**
     * Get a session by ID
     */
    public getSession(sessionId: string): TranscodingSession | undefined {
        return this.sessions.get(sessionId);
    }

    /**
     * Stop a specific session
     */
    public async stopSession(sessionId: string): Promise<void> {
        const session = this.sessions.get(sessionId);
        if (!session) {
            Logger.warn({ sessionId }, 'Attempted to stop non-existent session');
            return;
        }

        Logger.info({ sessionId, viewerCount: session.viewerCount }, 'Stopping session');

        session.status = 'stopping';

        try {
            await stopTranscode(session.process);
            await cleanupTranscodeFiles(session.outputDir);
        } catch (error) {
            Logger.error({ error, sessionId }, 'Error stopping session');
        } finally {
            this.sessions.delete(sessionId);
            Logger.info({ sessionId }, 'Session stopped and cleaned up');
        }
    }

    /**
     * Clean up inactive sessions (no viewers for > 30 seconds)
     */
    public async cleanupInactiveSessions(): Promise<void> {
        const now = Date.now();
        const inactiveSessions: string[] = [];

        for (const [sessionId, session] of this.sessions.entries()) {
            if (
                session.viewerCount === 0 &&
                now - session.lastAccessTime > this.INACTIVE_TIMEOUT
            ) {
                inactiveSessions.push(sessionId);
            }
        }

        if (inactiveSessions.length > 0) {
            Logger.info(
                { count: inactiveSessions.length, sessions: inactiveSessions },
                'Cleaning up inactive sessions'
            );

            for (const sessionId of inactiveSessions) {
                await this.stopSession(sessionId);
            }
        }
    }

    /**
     * Get stats for all active sessions
     */
    public getActiveSessions(): SessionStats[] {
        const now = Date.now();
        return Array.from(this.sessions.values()).map((session) => ({
            sessionId: session.sessionId,
            tunerId: session.tunerId,
            channelId: session.channelId,
            channelName: session.channelName,
            viewerCount: session.viewerCount,
            uptime: Math.floor((now - session.startTime) / 1000),
            status: session.status,
        }));
    }

    /**
     * Stop all sessions (cleanup on shutdown)
     */
    public async stopAllSessions(): Promise<void> {
        Logger.info({ count: this.sessions.size }, 'Stopping all transcoding sessions');

        const promises = Array.from(this.sessions.keys()).map((sessionId) =>
            this.stopSession(sessionId));

        await Promise.all(promises);
    }

    /**
     * Stop the cleanup timer
     */
    public stopCleanupTimer(): void {
        if (this.cleanupTimer) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
            Logger.debug('Session cleanup timer stopped');
        }
    }

    /**
     * Start the cleanup timer
     */
    private startCleanupTimer(): void {
        if (this.cleanupTimer) {
            return;
        }

        this.cleanupTimer = setInterval(() => {
            void this.cleanupInactiveSessions();
        }, this.CLEANUP_INTERVAL);

        Logger.debug('Session cleanup timer started');
    }
}

// Singleton instance
let sessionManagerInstance: TranscodingSessionManager | null = null;

/**
 * Get the singleton session manager instance
 */
export function getSessionManager(): TranscodingSessionManager {
    if (!sessionManagerInstance) {
        sessionManagerInstance = new TranscodingSessionManager();
    }
    return sessionManagerInstance;
}

/**
 * Cleanup on app shutdown
 */
if (typeof process !== 'undefined') {
    process.on('SIGTERM', () => {
        Logger.info('SIGTERM received, cleaning up transcoding sessions');
        if (sessionManagerInstance) {
            void sessionManagerInstance.stopAllSessions();
        }
    });

    process.on('SIGINT', () => {
        Logger.info('SIGINT received, cleaning up transcoding sessions');
        if (sessionManagerInstance) {
            void sessionManagerInstance.stopAllSessions();
        }
    });
}
