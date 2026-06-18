/**
 * Transcoding session manager - handles shared sessions across multiple viewers
 */

import { join } from 'node:path';
import type { ChildProcess } from 'node:child_process';
import type { TranscodeSettings, SessionStats, ViewerSession } from './types';
import type { TranscodeProcess } from './transcode';
import {
    startTranscode,
    stopTranscode,
    waitForPlaylist,
    cleanupTranscodeFiles,
} from './transcode';
import Logger from '@/lib/logger';

/** Interval between cleanup checks in milliseconds */
const CLEANUP_INTERVAL_MS = 10000;
/** How long a viewer can be inactive before being removed (milliseconds) */
const INACTIVE_TIMEOUT_MS = 30000;
/** Timeout for waiting on the HLS playlist during session startup (milliseconds) */
const PLAYLIST_WAIT_TIMEOUT_MS = 30000;
/** Number of characters to show for viewer ID display */
const VIEWER_ID_DISPLAY_LENGTH = 8;
/** Number of characters to include from the end of stderr for error messages */
const STDERR_TAIL_LENGTH = 500;
/** Number of characters to include from the end of stderr for exit error messages */
const STDERR_EXIT_TAIL_LENGTH = 200;
/** Divisor to convert milliseconds to seconds */
const MS_PER_SECOND = 1000;

interface TranscodingSession {
    sessionId: string;
    tunerId: number;
    channelId: number;
    channelName: string;
    viewers: Map<string, ViewerSession>;
    transcodeProcess: TranscodeProcess;
    process: ChildProcess;
    pid: number;
    outputDir: string;
    playlistPath: string;
    startTime: number;
    settings: TranscodeSettings;
    status: 'starting' | 'running' | 'stopping' | 'error';
    error?: string;
}

interface CreateSessionOptions {
    tunerId: number;
    channelId: number;
    channelName: string;
    sourceUrl: string;
    settings: TranscodeSettings;
    codecs?: { videoCodec: string; audioCodec: string };
}

interface AddViewerOptions {
    sessionId: string;
    viewerId: string;
    metadata?: { userAgent?: string };
}

/**
 * Determine the transcoding output directory
 */
function resolveTranscodeDir(sessionId: string): string {
    const transcodeDirEnv = process.env.HD_HOMEY_TRANSCODE_DIR;
    const transcodeDir = (transcodeDirEnv !== undefined && transcodeDirEnv !== '')
        ? transcodeDirEnv
        : join('./data', 'transcoding');
    return join(transcodeDir, sessionId.replace(':', '-'));
}

/**
 * Build the initial session object before the transcode process is started
 */
function buildInitialSession(
    { sessionId, tunerId, channelId, channelName, settings }: CreateSessionOptions & { sessionId: string }
): TranscodingSession {
    const outputDir = resolveTranscodeDir(sessionId);
    const playlistPath = join(outputDir, 'playlist.m3u8');

    return {
        sessionId,
        tunerId,
        channelId,
        channelName,
        viewers: new Map<string, ViewerSession>(),
        transcodeProcess: null as unknown as TranscodeProcess, // Set after process starts
        process: null as unknown as ChildProcess, // Set after process starts
        pid: 0,
        outputDir,
        playlistPath,
        startTime: Date.now(),
        settings,
        status: 'starting',
    };
}

/**
 * Attach the transcode process to a session and set its PID
 */
function attachProcessToSession(session: TranscodingSession, transcodeProcess: TranscodeProcess): void {
    session.transcodeProcess = transcodeProcess;
    const { process } = transcodeProcess;
    session.process = process;
    const { pid } = process;
    session.pid = (pid !== undefined && !isNaN(pid) && pid !== 0) ? pid : 0;
}

/**
 * Register an exit handler on the transcode process
 */
function registerExitHandler(session: TranscodingSession, transcodeProcess: TranscodeProcess): void {
    transcodeProcess.process.on('exit', (code: number | null) => {
        Logger.info({ sessionId: session.sessionId, code }, 'Transcode process exited');
        session.status = code === 0 ? 'stopping' : 'error';
        if (code !== 0) {
            const stderr = transcodeProcess.getStderr();
            session.error = `Process exited with code ${code}. Last error: ${stderr.slice(-STDERR_EXIT_TAIL_LENGTH)}`;
        }
    });
}

interface StartTranscodeForSessionOptions {
    session: TranscodingSession;
    sourceUrl: string;
    settings: TranscodeSettings;
    codecs?: { videoCodec: string; audioCodec: string };
}

/**
 * Start and configure the transcode process for a session
 */
async function startTranscodeForSession(
    { session, sourceUrl, settings, codecs }: StartTranscodeForSessionOptions
): Promise<void> {
    const transcodeProcess = await startTranscode({
        sourceUrl,
        outputDir: session.outputDir,
        settings,
        codecs,
    });

    attachProcessToSession(session, transcodeProcess);

    // Wait for playlist to be created (longer timeout for HEVC+AC4)
    const playlistReady = await waitForPlaylist(session.playlistPath, PLAYLIST_WAIT_TIMEOUT_MS);
    if (!playlistReady) {
        const stderr = transcodeProcess.getStderr();
        const errorMsg = stderr.length > 0
            ? stderr.slice(-STDERR_TAIL_LENGTH)
            : 'Unknown error - check FFmpeg logs';
        throw new Error(`Playlist not created within timeout. FFmpeg: ${errorMsg}`);
    }

    registerExitHandler(session, transcodeProcess);
}

/**
 * Singleton session manager
 */
class TranscodingSessionManager {
    private readonly sessions = new Map<string, TranscodingSession>();
    private cleanupTimer: NodeJS.Timeout | null = null;
    private readonly CLEANUP_INTERVAL = CLEANUP_INTERVAL_MS;
    private readonly INACTIVE_TIMEOUT = INACTIVE_TIMEOUT_MS;

    public constructor() {
        this.startCleanupTimer();
    }

    /**
     * Get or create a transcoding session
     */
    public async getOrCreateSession(options: CreateSessionOptions): Promise<TranscodingSession> {
        const { tunerId, channelId, sourceUrl, settings, codecs } = options;
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

        Logger.info(
            { sessionId, sourceUrl, settings },
            'Creating new transcoding session'
        );

        const session = buildInitialSession({ ...options, sessionId });

        try {
            await startTranscodeForSession({ session, sourceUrl, settings, codecs });
            session.status = 'running';
            this.sessions.set(sessionId, session);

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
    public addViewer({ sessionId, viewerId, metadata }: AddViewerOptions): void {
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
            uptime: Math.floor((now - session.startTime) / MS_PER_SECOND),
            status: session.status,
            viewers: Array.from(session.viewers.values()).map((viewer) => ({
                id: viewer.viewerId.substring(0, VIEWER_ID_DISPLAY_LENGTH),
                watching: Math.floor((now - viewer.startTime) / MS_PER_SECOND),
                lastActivity: Math.floor((now - viewer.lastAccess) / MS_PER_SECOND),
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
        if (this.cleanupTimer === null) {
            return;
        }

        clearInterval(this.cleanupTimer);
        this.cleanupTimer = null;
        Logger.debug('Session cleanup timer stopped');
    }

    /**
     * Start the cleanup timer
     */
    private startCleanupTimer(): void {
        if (this.cleanupTimer !== null) {
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
        if (sessionManagerInstance !== null) {
            void sessionManagerInstance.stopAllSessions();
        }
    });

    process.on('SIGINT', () => {
        Logger.info('SIGINT received, cleaning up transcoding sessions');
        if (sessionManagerInstance !== null) {
            void sessionManagerInstance.stopAllSessions();
        }
    });
}
