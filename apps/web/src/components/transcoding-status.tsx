'use client';

/**
 * Transcoding Status Dashboard Component
 * Shows active transcoding sessions with real-time updates
 */

import { useEffect, useState } from 'react';
import styles from './transcoding-status.module.css';
import type { SessionStats } from '@/lib/transcoding/types';

interface StatusResponse {
    sessions: SessionStats[];
    count: number;
}

export default function TranscodingStatus() {
    const [status, setStatus] = useState<StatusResponse | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    const fetchStatus = async () => {
        try {
            const response = await fetch('/api/transcode/status');

            if (!response.ok) {
                throw new Error('Failed to fetch status');
            }

            const data = await response.json() as StatusResponse;
            setStatus(data);
            setError(null);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setLoading(false);
        }
    };

    const [stoppingSession, setStoppingSession] = useState<string | null>(null);

    const stopSession = async (sessionId: string) => {
        setStoppingSession(sessionId);
    };

    const confirmStopSession = async () => {
        if (!stoppingSession) {
            return;
        }

        try {
            const response = await fetch(
                `/api/transcode/status?sessionId=${encodeURIComponent(stoppingSession)}`,
                { method: 'DELETE' }
            );

            if (!response.ok) {
                throw new Error('Failed to stop session');
            }

            await fetchStatus();
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        } finally {
            setStoppingSession(null);
        }
    };

    useEffect(() => {
        void fetchStatus();

        const interval = setInterval(() => {
            void fetchStatus();
        }, 5000);

        return () => {
            clearInterval(interval);
        };
    }, []);

    if (loading) {
        return <p>Loading status...</p>;
    }

    const space4Style = { padding: 'var(--space-4)', marginBottom: 'var(--space-4)' };

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

    const formatUptime = (seconds: number): string => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;

        if (mins === 0) {
            return `${secs}s`;
        }

        return `${mins}m ${secs}s`;
    };

    const getStatusBadge = (sessionStatus: SessionStats['status']) => {
        const badgeStyles: Record<string, React.CSSProperties> = {
            starting: {
                backgroundColor: 'var(--color-warning-bg)',
                color: 'var(--color-warning)'
            },
            running: {
                backgroundColor: 'var(--color-success-bg)',
                color: 'var(--color-success)'
            },
            stopping: {
                backgroundColor: 'var(--color-error-bg)',
                color: 'var(--color-error)'
            },
            error: {
                backgroundColor: 'var(--color-error-bg)',
                color: 'var(--color-error)'
            },
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
    };

    return (
        <div>
            {stoppingSession && (
                <div className="bg-warning" style={space4Style}>
                    <p>
                        <strong>Stop session {stoppingSession}?</strong>
                    </p>
                    <p>
                        <button type="button" onClick={() => void confirmStopSession()} className="danger">
                            Yes, Stop Session
                        </button>
                        {' '}
                        <button type="button" onClick={() => setStoppingSession(null)} className="secondary">
                            Cancel
                        </button>
                    </p>
                </div>
            )}

            <p>
                <strong>{status.count}</strong>
                {' '}
                active session
                {status.count !== 1 ? 's' : ''}
            </p>

            <div className={styles.sessionsContainer}>
                {status.sessions.map((session) => (
                    <div key={session.sessionId} className={styles.sessionCard}>
                        <div className={styles.sessionHeader}>
                            <a
                                href={`/tuners/${session.tunerId}/channel/${session.channelId}`}
                                className={styles.sessionChannel}
                            >
                                {session.channelName}
                            </a>
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
                                onClick={() => void stopSession(session.sessionId)}
                                disabled={session.status === 'stopping'}
                                className={styles.sessionStopBtn}
                            >
                                Stop Session
                            </button>
                        </div>
                    </div>
                ))}
            </div>

            <p className="mt-4 text-sm text-tertiary">
                Auto-refreshes every 5 seconds
            </p>
        </div>
    );
}
