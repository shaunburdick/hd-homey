'use client';

/**
 * Transcoding Status Dashboard Component
 * Shows active transcoding sessions with real-time updates
 */

import { useEffect, useState } from 'react';
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

    if (error) {
        return (
            <div style={{ padding: '1rem', backgroundColor: '#fee', border: '1px solid #fcc' }}>
                <p>Error loading status: {error}</p>
                <button type="button" onClick={() => void fetchStatus()}>
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
        const styles: Record<string, React.CSSProperties> = {
            starting: { backgroundColor: '#fff3cd', color: '#856404' },
            running: { backgroundColor: '#d4edda', color: '#155724' },
            stopping: { backgroundColor: '#f8d7da', color: '#721c24' },
            error: { backgroundColor: '#f8d7da', color: '#721c24' },
        };

        return (
            <span
                style={{
                    padding: '0.25rem 0.5rem',
                    borderRadius: '4px',
                    fontSize: '0.875rem',
                    fontWeight: 'bold',
                    ...styles[sessionStatus],
                }}
            >
                {sessionStatus.toUpperCase()}
            </span>
        );
    };

    return (
        <div>
            {stoppingSession && (
                <div
                    style={{
                        padding: '1rem',
                        backgroundColor: '#fff3cd',
                        border: '1px solid #ffc107',
                        marginBottom: '1rem',
                    }}
                >
                    <p>
                        <strong>Stop session {stoppingSession}?</strong>
                    </p>
                    <p>
                        <button type="button" onClick={() => void confirmStopSession()}>
                            Yes, Stop Session
                        </button>
                        {' '}
                        <button type="button" onClick={() => setStoppingSession(null)}>
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

            <table>
                <thead>
                    <tr>
                        <th>Channel</th>
                        <th>Viewers</th>
                        <th>Uptime</th>
                        <th>Status</th>
                        <th>Actions</th>
                    </tr>
                </thead>
                <tbody>
                    {status.sessions.map((session) => (
                        <tr key={session.sessionId}>
                            <td>
                                <a href={`/tuners/${session.tunerId}/channel/${session.channelId}`}>
                                    {session.channelName}
                                </a>
                            </td>
                            <td>{session.viewerCount}</td>
                            <td>{formatUptime(session.uptime)}</td>
                            <td>{getStatusBadge(session.status)}</td>
                            <td>
                                <button
                                    type="button"
                                    onClick={() => void stopSession(session.sessionId)}
                                    disabled={session.status === 'stopping'}
                                    style={{ fontSize: '0.875rem' }}
                                >
                                    Stop
                                </button>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>

            <p style={{ marginTop: '1rem', fontSize: '0.875rem', color: '#666' }}>
                Auto-refreshes every 5 seconds
            </p>
        </div>
    );
}
