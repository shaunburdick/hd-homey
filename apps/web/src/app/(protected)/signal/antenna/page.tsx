'use client';

/**
 * Antenna Tuning Mode Page
 *
 * Route: /signal/antenna
 *
 * @module app/(protected)/signal/antenna/page
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SignalStatusCard } from '@/components/signal/SignalStatusCard';
import type { TunerSignalState, SignalDataPoint, SignalSseEvent } from '@/lib/hdhr/signal-parsers';

const MAX_HISTORY_POINTS = 60;

interface BuildStateOptions {
    data: SignalSseEvent;
    existing: TunerSignalState | undefined;
    newHistory: SignalDataPoint[];
}

function buildTunerState(options: BuildStateOptions): TunerSignalState {
    const { data, existing, newHistory } = options;
    return {
        tunerId: data.tunerId,
        tunerName: existing?.tunerName ?? `Tuner ${data.tunerId}`,
        resource: data.resource,
        idle: data.idle,
        vctName: data.vctName,
        vctNumber: data.vctNumber,
        ss: data.ss,
        snq: data.snq,
        seq: data.seq,
        history: newHistory,
        error: data.error,
    };
}

interface AntennaStreamState {
    tunerStates: Record<number, TunerSignalState>;
    connected: boolean;
    connError: string | null;
}

function useAntennaStream(): AntennaStreamState {
    const [tunerStates, setTunerStates] = useState<Record<number, TunerSignalState>>({});
    const [connected, setConnected] = useState(false);
    const [connError, setConnError] = useState<string | null>(null);
    const historyRef = useRef<Record<number, SignalDataPoint[]>>({});

    useEffect(() => {
        const es = new EventSource('/api/signal/antenna/stream');

        es.onmessage = (ev: MessageEvent<string>) => {
            const data = JSON.parse(ev.data) as SignalSseEvent;
            if (data.error === 'no-tuners') {
                setConnError('No active tuners configured'); return;
            }

            setConnected(true);
            const prevHistory = historyRef.current[data.tunerId] ?? [];
            const point: SignalDataPoint = { timestamp: data.timestamp, ss: data.ss, snq: data.snq };
            const newHistory = [...prevHistory, point].slice(-MAX_HISTORY_POINTS);
            historyRef.current[data.tunerId] = newHistory;
            setTunerStates((prev) => ({
                ...prev, [data.tunerId]: buildTunerState({ data, existing: prev[data.tunerId], newHistory }),
            }));
        };

        es.onerror = () => {
            setConnError('Connection error — retrying…');
        };
        return () => {
            es.close();
        };
    }, []);

    return { tunerStates, connected, connError };
}

function AntennaGrid({ tunerStates }: { tunerStates: Record<number, TunerSignalState> }) {
    const tunerList = Object.values(tunerStates);
    if (tunerList.length === 0) {
        return null;
    }

    return (
        <div className="antenna-grid" role="region" aria-label="All tuners signal status">
            {tunerList.map((tunerState) => (
                <SignalStatusCard key={tunerState.tunerId} state={tunerState} />
            ))}
        </div>
    );
}

/**
 * Antenna tuning mode page — shows all active tuners simultaneously.
 */
export default function AntennaPage() {
    const router = useRouter();
    const { tunerStates, connected, connError } = useAntennaStream();

    return (
        <main className="page-container">
            <header className="antenna-header">
                <h1>📡 Antenna Tuning Mode</h1>
                <button type="button" className="antenna-exit-button" onClick={() => router.back()}>
                    Exit Antenna Mode
                </button>
            </header>
            {!connected && connError === null && (
                <p className="antenna-connecting" aria-live="polite">Connecting to signal stream…</p>
            )}
            {connError !== null && (
                <div className="antenna-error-banner" role="alert">⚠️ {connError}</div>
            )}
            {connected && Object.keys(tunerStates).length === 0 && (
                <p className="antenna-empty">No tuner data received yet…</p>
            )}
            <AntennaGrid tunerStates={tunerStates} />
        </main>
    );
}
