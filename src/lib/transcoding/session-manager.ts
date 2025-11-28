/**
 * Transcoding session manager - handles shared sessions across multiple viewers
 */

import { join } from 'node:path';
import type { ChildProcess } from 'node:child_process';
import type { TranscodeSettings, SessionStats, ViewerSession } from './types';
import { startTranscode, stopTranscode, waitForPlaylist, cleanupTranscodeFiles } from './transcode';
import Logger from '@/lib/logger';

interface TranscodingSession {
    sessionId: string;
    tunerId: number;
    channelId: number;
    channelName: string;
    viewers: Map<string, ViewerSession>;
    process: ChildProcess;
    pid: number;
    outputDir: string;
    playlistPath: string;
    startTime: number;
    settings: TranscodeSettings;
    status: 'starting' | 'running' | 'stopping' | 'error';
    error?: string;
}

/**
 * Singleton session manager
 */
class TranscodingSessionManager {
    private readonly sessions = new Map<string, TranscodingSession>();
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
        if (existing !== undefined) {
            Logger.info({ sessionId, viewerCount: existing.viewers.size }, 'Reusing existing session');
            return existing;
        }

        // Check if we've reached max sessions
        if (this.sessions.size >= settings.maxSessions) {
            throw new Error(
                `Maximum concurrent sessions (${settings.maxSessions}) reached`
            );
        }

        // Create new session
        const transcodeDirEnv = process.env.HD_HOMEY_TRANSCODE_DIR;
        const transcodeDir = (transcodeDirEnv !== undefined && transcodeDirEnv !== '')
            ? transcodeDirEnv
            : join('./data', 'transcoding');
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
            viewers: new Map<string, ViewerSession>(),
            process: null as unknown as ChildProcess, // Will be set below
            pid: 0,
            outputDir,
            playlistPath,
            startTime: Date.now(),
            settings,
            status: 'starting',
        };

        try {
            // Start the transcode process
            const process = await startTranscode(sourceUrl, outputDir, settings);
            session.process = process;
            session.pid = (process.pid !== undefined && !isNaN(process.pid) && process.pid !== 0) ? process.pid : 0;

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
     * Add a viewer to a session
     */
    public addViewer(
        sessionId: string,
        viewerId: string,
        metadata?: { userAgent?: string }
    ): void {
        const session = this.sessions.get(sessionId);
        if (session === undefined) {
            throw new Error(`Session ${sessionId} not found`);
        }

        session.viewers.set(viewerId, {
            viewerId,
            lastAccess: Date.now(),
            startTime: Date.now(),
            userAgent: metadata?.userAgent,
        });

        Logger.info(
            { sessionId, viewerId, viewerCount: session.viewers.size },
            'Viewer added to session'
        );
    }

    /**
     * Update viewer activity timestamp
     */
    public updateViewerActivity(sessionId: string, viewerId: string): boolean {
        const session = this.sessions.get(sessionId);
        if (session === undefined) {
            return false;
        }

        const viewer = session.viewers.get(viewerId);
        if (viewer === undefined) {
            return false;
        }

        viewer.lastAccess = Date.now();
        Logger.debug({ sessionId, viewerId }, 'Viewer activity updated');
        return true;
    }

    /**
     * Get active viewers for a session
     */
    public getSessionViewers(sessionId: string): ViewerSession[] {
        const session = this.sessions.get(sessionId);
        if (session === undefined) {
            return [];
        }

        return Array.from(session.viewers.values());
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
        if (session === undefined) {
            Logger.warn({ sessionId }, 'Attempted to stop non-existent session');
            return;
        }

        Logger.info({ sessionId, viewerCount: session.viewers.size }, 'Stopping session');

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
     * Clean up inactive viewers and sessions with no viewers
     */
    public async cleanupInactiveSessions(): Promise<void> {
        const now = Date.now();

        for (const [sessionId, session] of this.sessions.entries()) {
            // Remove inactive viewers
            const inactiveViewers: string[] = [];

            for (const [viewerId, viewer] of session.viewers.entries()) {
                if (now - viewer.lastAccess > this.INACTIVE_TIMEOUT) {
                    inactiveViewers.push(viewerId);
                }
            }

            // Remove inactive viewers
            if (inactiveViewers.length > 0) {
                for (const viewerId of inactiveViewers) {
                    session.viewers.delete(viewerId);
                    Logger.debug(
                        { sessionId, viewerId, remainingViewers: session.viewers.size },
                        'Removed inactive viewer'
                    );
                }
            }

            // If no viewers remain, stop the transcoding session
            if (session.viewers.size === 0) {
                Logger.info(
                    { sessionId },
                    'No viewers remaining - stopping transcoding session'
                );
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
            viewerCount: session.viewers.size,
            uptime: Math.floor((now - session.startTime) / 1000),
            status: session.status,
            viewers: Array.from(session.viewers.values()).map((viewer) => ({
                id: viewer.viewerId.substring(0, 8),
                watching: Math.floor((now - viewer.startTime) / 1000),
                lastActivity: Math.floor((now - viewer.lastAccess) / 1000),
            })),
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
        if (this.cleanupTimer !=== null) {
            clearInterval(this.cleanupTimer);
            this.cleanupTimer = null;
            Logger.debug('Session cleanup timer stopped');
        }
    }

    /**
     * Start the cleanup timer
     */
    private startCleanupTimer(): void {
        if (this.cleanupTimer !=== null) {
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
    sessionManagerInstance ??= new TranscodingSessionManager();
    return sessionManagerInstance;
}

/**
 * Cleanup on app shutdown
 */
if (typeof process !== 'undefined') {
    process.on('SIGTERM', () => {
        Logger.info('SIGTERM received, cleaning up transcoding sessions');
        if (sessionManagerInstance !=== null) {
            void sessionManagerInstance.stopAllSessions();
        }
    });

    process.on('SIGINT', () => {
        Logger.info('SIGINT received, cleaning up transcoding sessions');
        if (sessionManagerInstance !=== null) {
            void sessionManagerInstance.stopAllSessions();
        }
    });
}
