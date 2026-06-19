'use client';

/**
 * Transcoding Status Dashboard Component
 * Shows active transcoding sessions with real-time updates
 */

import { useEffect, useState } from 'react';
import Link from 'next/link';
import styles from './transcoding-status.module.css';
import type { SessionStats } from '@/lib/transcoding/types';
import { BASE_PATH } from '@/lib/client-config';

/** Auto-refresh interval for the session list in milliseconds. */
const REFRESH_INTERVAL_MS = 5000;

/** Number of seconds in one minute (used for uptime formatting). */
const SECONDS_PER_MINUTE = 60;

interface StatusResponse {
    sessions: SessionStats[];
    count: number;
}

/**
 * Formats a raw uptime value in seconds into a human-readable string.
 * Examples: "45s", "3m 12s".
 * Extracted to module scope to satisfy consistent-function-scoping.
 */
function formatUptime(seconds: number): string {
    const mins = Math.floor(seconds / SECONDS_PER_MINUTE);
    const secs = seconds % SECONDS_PER_MINUTE;

    if (mins === 0) {
        return `${secs}s`;
    }
    return `${mins}m ${secs}s`;
}

/**
 * Returns a styled status badge element for the given session status value.
 * Extracted to module scope to satisfy consistent-function-scoping.
 */
function getStatusBadge(sessionStatus: SessionStats['status']): React.ReactElement {
    const badgeStyles: Record<string, React.CSSProperties> = {
        starting: { backgroundColor: 'var(--color-warning-bg)', color: 'var(--color-warning)' },
        running:  { backgroundColor: 'var(--color-success-bg)', color: 'var(--color-success)' },
        stopping: { backgroundColor: 'var(--color-error-bg)',   color: 'var(--color-error)'   },
        error:    { backgroundColor: 'var(--color-error-bg)',   color: 'var(--color-error)'   },
    };

    return (
        <span
            style={{
                padding: '0.25rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.875rem',
                fontWeight: 'bold',
                ...badgeStyles[sessionStatus],
            }}
        >
            {sessionStatus.toUpperCase()}
        </span>
    );
}

/** Confirmation dialog rendered when stopping a session has been requested. */
function StopSessionConfirmation({
    sessionId,
    onConfirm,
    onCancel,
}: {
    sessionId: string;
    onConfirm: () => void;
    onCancel: () => void;
}) {
    const space4Style = { padding: 'var(--space-4)', marginBottom: 'var(--space-4)' };

    return (
        <div className="bg-warning" style={space4Style}>
            <p><strong>Stop session {sessionId}?</strong></p>
            <p>
                <button type="button" onClick={onConfirm} className="danger">
                    Yes, Stop Session
                </button>
                {' '}
                <button type="button" onClick={onCancel} className="secondary">
                    Cancel
                </button>
            </p>
        </div>
    );
}

/** Individual session card row. */
function SessionCard({
    session,
    onStop,
}: {
    session: SessionStats;
    onStop: (sessionId: string) => void;
}) {
    return (
        <div key={session.sessionId} className={styles.sessionCard}>
            <div className={styles.sessionHeader}>
                <Link
                    href={`/tuners/${session.tunerId}/channel/${session.channelId}`}
                    className={styles.sessionChannel}
                >
                    {session.channelName}
                </Link>
                {getStatusBadge(session.status)}
            </div>
            <div className={styles.sessionDetails}>
                <div className={styles.sessionStat}>
                    <span className={styles.sessionLabel}>Viewers:</span>
                    <span className={styles.sessionValue}>{session.viewerCount}</span>
                </div>
                <div className={styles.sessionStat}>
                    <span className={styles.sessionLabel}>Uptime:</span>
                    <span className={styles.sessionValue}>{formatUptime(session.uptime)}</span>
                </div>
            </div>
            <div className={styles.sessionActions}>
                <button
                    type="button"
                    onClick={() => onStop(session.sessionId)}
                    disabled={session.status === 'stopping'}
                    className={styles.sessionStopBtn}
                >
                    Stop Session
                </button>
            </div>
        </div>
    );
}

/** Fetches the current transcoding session status from the API. */
async function loadTranscodingStatus(basePath: string): Promise<StatusResponse> {
    const response = await fetch(`${basePath}/api/transcode/status`);
    if (!response.ok) {
        throw new Error('Failed to fetch status');
    }
    return response.json() as Promise<StatusResponse>;
}

/** Sends a DELETE request to stop the given transcoding session. */
async function requestStopSession(basePath: string, sessionId: string): Promise<void> {
    const response = await fetch(
        `${basePath}/api/transcode/status?sessionId=${encodeURIComponent(sessionId)}`,
        { method: 'DELETE' }
    );
    if (!response.ok) {
        throw new Error('Failed to stop session');
    }
}

/** Session list with optional stop-confirmation dialog. */
function SessionsList({
    status,
    stoppingSession,
    onStop,
    onConfirmStop,
    onCancelStop,
}: {
    status: StatusResponse;
    stoppingSession: string | null;
    onStop: (sessionId: string) => void;
    onConfirmStop: () => void;
    onCancelStop: () => void;
}) {
    return (
        <div>
            {stoppingSession && (
                <StopSessionConfirmation
                    sessionId={stoppingSession}
                    onConfirm={onConfirmStop}
                    onCancel={onCancelStop}
                />
            )}

            <p>
                <strong>{status.count}</strong>
                {' '}
                active session{status.count !== 1 ? 's' : ''}
            </p>

            <div className={styles.sessionsContainer}>
                {status.sessions.map((session) => (
                    <SessionCard
                        key={session.sessionId}
                        session={session}
                        onStop={onStop}
                    />
                ))}
            </div>

            <p className="mt-4 text-sm text-tertiary">
                Auto-refreshes every 5 seconds
            </p>
        </div>
    );
}

interface TranscodingState {
    status: StatusResponse | null;
    error: string | null;
    loading: boolean;
    stoppingSession: string | null;
    fetchStatus: () => Promise<void>;
    confirmStopSession: () => Promise<void>;
    setStoppingSession: (id: string | null) => void;
}

/**
 * Custom hook that manages all transcoding session state:
 * polling, status fetching, and stop-session confirmation.
 */
function useTranscodingState(): TranscodingState {
    const [status, setStatus] = useState<StatusResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [stoppingSession, setStoppingSession] = useState<string | null>(null);

    const fetchStatus = async () => {
        try {
            const data = await loadTranscodingStatus(BASE_PATH);
            setStatus(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const confirmStopSession = async () => {
        if (!stoppingSession) {
            return;
        }
        try {
            await requestStopSession(BASE_PATH, stoppingSession);
            await fetchStatus();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setStoppingSession(null);
        }
    };

    useEffect(() => {
        const initialTimer = setTimeout(() => {
            void fetchStatus();
        }, 0);
        const interval = setInterval(() => {
            void fetchStatus();
        }, REFRESH_INTERVAL_MS);
        return () => {
            clearTimeout(initialTimer);
            clearInterval(interval);
        };
        // fetchStatus is defined in hook scope; stable enough for one-time setup

    }, []);

    return { status, error, loading, stoppingSession, fetchStatus, confirmStopSession, setStoppingSession };
}

export default function TranscodingStatus() {
    const {
        status,
        error,
        loading,
        stoppingSession,
        fetchStatus,
        confirmStopSession,
        setStoppingSession,
    } = useTranscodingState();

    const space4Style = { padding: 'var(--space-4)', marginBottom: 'var(--space-4)' };

    if (loading) {
        return <p>Loading status...</p>;
    }

    if (error) {
        return (
            <div className="bg-error" style={space4Style}>
                <p>Error loading status: {error}</p>
                <button type="button" onClick={() => void fetchStatus()} className="secondary">
                    Retry
                </button>
            </div>
        );
    }

    if (!status || status.count === 0) {
        return (
            <p>
                <em>No active transcoding sessions</em>
            </p>
        );
    }

    return (
        <SessionsList
            status={status}
            stoppingSession={stoppingSession}
            onStop={setStoppingSession}
            onConfirmStop={() => void confirmStopSession()}
            onCancelStop={() => setStoppingSession(null)}
        />
    );
}
