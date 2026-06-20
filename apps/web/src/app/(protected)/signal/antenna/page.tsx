'use client';

/**
 * Antenna Tuning Mode Page
 *
 * Route: /signal/antenna
 *
 * @module app/(protected)/signal/antenna/page
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { SignalStatusCard } from '@/components/signal/SignalStatusCard';
import { MAX_HISTORY_POINTS } from '@/lib/hdhr/signal-parsers';
import type { TunerSignalState, SignalDataPoint, SignalSseEvent } from '@/lib/hdhr/signal-parsers';

interface BuildStateOptions {
    data: SignalSseEvent;
    existing: TunerSignalState | undefined;
    newHistory: SignalDataPoint[];
}

/**
 * Construct a TunerSignalState from a raw SSE signal event.
 *
 * Slot labels are always derived from the resource field ("tuner0" → "Tuner 0",
 * "tuner1" → "Tuner 1", …). The DB tuner name is the device model name (e.g.
 * "HDHomeRun Connect 4") and is NOT used here — it is a device identifier,
 * not a slot label, and would be confusingly inconsistent with the auto-
 * discovered slot labels.
 *
 * @param options - Event data, prior state, and updated history
 * @returns Immutable state object for the keyed tuner slot
 */
function buildTunerState(options: BuildStateOptions): TunerSignalState {
    const { data, existing, newHistory } = options;
    // Derive a consistent slot label from the HDHomeRun resource name.
    // "tuner0" → "Tuner 0", "tuner1" → "Tuner 1", etc.
    const slotLabel = data.resource.replace('tuner', 'Tuner ');
    return {
        tunerId: data.tunerId,
        tunerName: existing?.tunerName ?? slotLabel,
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

/**
 * Subscribe to the antenna SSE stream and maintain a record of
 * TunerSignalState objects keyed by tunerId.
 *
 * @returns Live stream state: per-slot signal states + connection status
 */
function useAntennaStream(): AntennaStreamState {
    const [tunerStates, setTunerStates] = useState<Record<number, TunerSignalState>>({});
    const [connected, setConnected] = useState(false);
    const [connError, setConnError] = useState<string | null>(null);
    const historyRef = useRef<Record<number, SignalDataPoint[]>>({});

    const handleSignalEvent = useCallback((ev: MessageEvent<string>) => {
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
            ...prev,
            [data.tunerId]: buildTunerState({
                data,
                existing: prev[data.tunerId],
                newHistory,
            }),
        }));
    }, []);

    useEffect(() => {
        const es = new EventSource('/api/signal/antenna/stream');

        es.addEventListener('signal', handleSignalEvent);
        es.onerror = () => {
            setConnError('Connection error — retrying…');
        };

        return () => {
            es.removeEventListener('signal', handleSignalEvent);
            es.close();
        };
    }, [handleSignalEvent]);

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
