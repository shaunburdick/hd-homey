'use client';

/**
 * Per-Device Signal Monitor Page
 *
 * Route: /tuners/[id]/signal
 *
 * Displays a grid of SignalStatusCard components — one card per physical
 * tuner slot on the device (tuner0, tuner1, …). The SSE stream now emits
 * events for ALL slots, so state is keyed by tunerId (same pattern as the
 * antenna page). Physical slots beyond the DB-tracked ones are auto-
 * discovered by the poller and arrive with synthetic negative tunerId values.
 *
 * @module app/(protected)/tuners/[id]/signal/page
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SignalStatusCard } from '@/components/signal/SignalStatusCard';
import { MAX_HISTORY_POINTS } from '@/lib/hdhr/signal-parsers';
import type { TunerSignalState, SignalDataPoint, SignalSseEvent } from '@/lib/hdhr/signal-parsers';

// ---------------------------------------------------------------------------
// Helper types
// ---------------------------------------------------------------------------

interface TunerApiEntry {
    id: number;
    name: string;
}

// ---------------------------------------------------------------------------
// State builder (mirrors the antenna page pattern)
// ---------------------------------------------------------------------------

interface BuildStateOptions {
    data: SignalSseEvent;
    existing: TunerSignalState | undefined;
    newHistory: SignalDataPoint[];
    tunerName: string;
}

/**
 * Construct a TunerSignalState from a raw SSE signal event.
 *
 * @param options - Event data, prior state, updated history, and display name
 * @returns Immutable state object for the keyed tuner slot
 */
function buildTunerState(options: BuildStateOptions): TunerSignalState {
    const { data, existing, newHistory, tunerName } = options;
    return {
        tunerId: data.tunerId,
        tunerName: existing?.tunerName ?? tunerName,
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

// ---------------------------------------------------------------------------
// Custom hook: SSE stream subscription (multi-tuner)
// ---------------------------------------------------------------------------

interface SignalStreamState {
    tunerStates: Record<number, TunerSignalState>;
    connected: boolean;
    connError: string | null;
}

/**
 * Subscribe to the per-device SSE stream and maintain a record of
 * TunerSignalState objects keyed by tunerId.
 *
 * @param tunerId - The DB id from the URL; used to form the stream URL
 * @param tunerName - Display name for the primary (DB-tracked) tuner slot
 * @returns Live stream state: per-slot signal states + connection status
 */
function useSignalStream(tunerId: string, tunerName: string): SignalStreamState {
    const [tunerStates, setTunerStates] = useState<Record<number, TunerSignalState>>({});
    const [connected, setConnected] = useState(false);
    const [connError, setConnError] = useState<string | null>(null);
    const historyRef = useRef<Record<number, SignalDataPoint[]>>({});

    const handleSignalEvent = useCallback((ev: MessageEvent<string>) => {
        const data = JSON.parse(ev.data) as SignalSseEvent;
        setConnected(true);

        const prevHistory = historyRef.current[data.tunerId] ?? [];
        const point: SignalDataPoint = { timestamp: data.timestamp, ss: data.ss, snq: data.snq };
        const newHistory = [...prevHistory, point].slice(-MAX_HISTORY_POINTS);
        historyRef.current[data.tunerId] = newHistory;

        // Derive display name: DB tuner gets the fetched name; auto-discovered
        // slots get a human-friendly label from the resource field.
        const derivedName = data.resource.replace('tuner', 'Tuner ');

        setTunerStates((prev) => ({
            ...prev,
            [data.tunerId]: buildTunerState({
                data,
                existing: prev[data.tunerId],
                newHistory,
                tunerName: data.tunerId > 0 ? tunerName : derivedName,
            }),
        }));

        if (data.error !== undefined) {
            setConnError(
                data.error === 'timeout'
                    ? 'Device not responding — retrying…'
                    : 'Device unreachable — retrying…',
            );
        } else {
            setConnError(null);
        }
    }, [tunerName]);

    useEffect(() => {
        const es = new EventSource(`/api/signal/${tunerId}/stream`);

        es.addEventListener('signal', handleSignalEvent);
        es.onerror = () => {
            setConnError('Connection error — retrying…');
        };

        return () => {
            es.removeEventListener('signal', handleSignalEvent);
            es.close();
        };
    }, [tunerId, handleSignalEvent]);

    return { tunerStates, connected, connError };
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

/**
 * Breadcrumb navigation bar for the signal monitor page.
 *
 * @param tunerId - DB tuner id (used for the "Back" link)
 * @param tunerName - Human-readable device/tuner name
 */
function SignalBreadcrumb({ tunerId, tunerName }: { tunerId: string; tunerName: string }) {
    return (
        <nav className="signal-breadcrumb" aria-label="Signal page navigation">
            <Link href={`/tuners/${tunerId}`} className="signal-breadcrumb-back">← Back to {tunerName}</Link>
            <span className="signal-breadcrumb-separator" aria-hidden="true"> | </span>
            <Link href="/signal/antenna" className="signal-breadcrumb-antenna">📡 Antenna Tuning Mode →</Link>
        </nav>
    );
}

/**
 * Renders the grid of SignalStatusCard components (one per discovered slot).
 *
 * @param tunerStates - Map of tunerId → TunerSignalState
 */
function SignalGrid({ tunerStates }: { tunerStates: Record<number, TunerSignalState> }) {
    const tunerList = Object.values(tunerStates);
    if (tunerList.length === 0) {
        return null;
    }

    return (
        <div className="antenna-grid" role="region" aria-label="All tuner slots signal status">
            {tunerList.map((tunerState) => (
                <SignalStatusCard key={tunerState.tunerId} state={tunerState} />
            ))}
        </div>
    );
}

// ---------------------------------------------------------------------------
// Page component
// ---------------------------------------------------------------------------

/**
 * Per-device signal monitor page.
 *
 * Fetches the device name from /api/tuners/[id], then opens an SSE stream
 * that delivers signal events for all physical tuner slots on that device.
 * Renders a CSS grid of SignalStatusCard components mirroring the antenna page.
 */
export default function SignalPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const tunerId = params.id;
    const [tunerName, setTunerName] = useState(`Tuner ${tunerId}`);

    // Fetch display name for the primary tuner (DB-tracked slot)
    useEffect(() => {
        const controller = new AbortController();
        void fetch(`/api/tuners/${tunerId}`, { signal: controller.signal })
            .then((res) => res.ok ? res.json() as Promise<{ data: TunerApiEntry }> : Promise.resolve(null))
            .then((json) => {
                if (json !== null) {
                    setTunerName(json.data.name);
                }
                return json;
            })
            .catch(() => { /* AbortError expected during Strict Mode cleanup */ });
        return () => {
            controller.abort();
        };
    }, [tunerId]);

    const { tunerStates, connected, connError } = useSignalStream(tunerId, tunerName);

    return (
        <main className="page-container">
            <SignalBreadcrumb tunerId={tunerId} tunerName={tunerName} />
            <h1>{`${tunerName} — Signal Monitor`}</h1>
            {!connected && connError === null && (
                <p className="signal-connecting" aria-live="polite">Connecting to signal stream…</p>
            )}
            {connError !== null && (
                <div className="signal-error-banner" role="alert">⚠️ {connError}</div>
            )}
            {connected && Object.keys(tunerStates).length === 0 && (
                <p className="signal-empty">No tuner data received yet…</p>
            )}
            <SignalGrid tunerStates={tunerStates} />
            <div className="signal-actions">
                <button type="button" onClick={() => router.back()} className="signal-back-button">← Back</button>
            </div>
        </main>
    );
}
