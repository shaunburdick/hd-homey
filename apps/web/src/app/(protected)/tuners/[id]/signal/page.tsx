'use client';

/**
 * Per-Device Signal Monitor Page
 *
 * Route: /tuners/[id]/signal
 *
 * Displays a grid of SignalStatusCard components — one card per physical
 * tuner slot on the device (tuner0, tuner1, …). Each card receives three
 * named slot props for its diagnostic sections: `tuningControl`, `programs`,
 * and `atsc3Details`. These render as flat sections directly inside the card —
 * below the graphs, with no outer collapsible wrapper. ATSC 3.0 details carry
 * their own single-level `<details>` collapsible internally.
 *
 * SSE stream multiplexing:
 *   The same SSE stream emits `signal`, `streaminfo`, `atsc3plp`, and
 *   `atsc3l1` events. This page registers handlers for all four. Program and
 *   ATSC 3.0 state are keyed by tunerId (same key as signal state) so each
 *   slot's diagnostics update independently.
 *
 * Physical slots beyond the DB-tracked ones are auto-discovered by the poller
 * and arrive with synthetic negative tunerId values.
 *
 * All slots use consistent "Tuner N" labels derived from the resource field
 * (e.g. "tuner0" → "Tuner 0"). The device model name from the DB is used
 * only for the breadcrumb "← Back to <device>" link — not as a slot label.
 *
 * @module app/(protected)/tuners/[id]/signal/page
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Dispatch, RefObject, SetStateAction } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { SignalStatusCard } from '@/components/signal/SignalStatusCard';
import { ProgramList } from '@/components/signal/ProgramList';
import { Atsc3Details } from '@/components/signal/Atsc3Details';
import { TuningControl } from '@/components/signal/TuningControl';
import { MAX_HISTORY_POINTS } from '@/lib/hdhr/signal-parsers';
import type {
    TunerSignalState,
    SignalDataPoint,
    SignalSseEvent,
    StreamInfoSseEvent,
    Atsc3PlpSseEvent,
    Atsc3L1SseEvent,
} from '@/lib/hdhr/signal-parsers';
import type { ParsedProgram } from '@/lib/hdhr/types';

// ---------------------------------------------------------------------------
// Helper types
// ---------------------------------------------------------------------------

interface TunerApiEntry {
    id: number;
    name: string;
}

// ---------------------------------------------------------------------------
// State builder
// ---------------------------------------------------------------------------

interface BuildStateOptions {
    data: SignalSseEvent;
    existing: TunerSignalState | undefined;
    newHistory: SignalDataPoint[];
    slotLabel: string;
}

/**
 * Construct a TunerSignalState from a raw SSE signal event.
 *
 * All slots use a resource-derived slot label ("Tuner 0", "Tuner 1", …)
 * regardless of whether they are DB-tracked or auto-discovered. This keeps
 * naming consistent across all per-device signal pages.
 *
 * @param options - Event data, prior state, updated history, and slot label
 * @returns Immutable state object for the keyed tuner slot
 */
function buildTunerState(options: BuildStateOptions): TunerSignalState {
    const { data, existing, newHistory, slotLabel } = options;
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
        lockType: data.lockType,
        error: data.error,
    };
}

// ---------------------------------------------------------------------------
// Custom hook: SSE stream subscription (multi-tuner, all event types)
// ---------------------------------------------------------------------------

interface SignalStreamState {
    tunerStates: Record<number, TunerSignalState>;
    /** MPEG program data per tunerId, keyed by tunerId */
    programs: Record<number, ParsedProgram[]>;
    /** ATSC 3.0 PLP event per tunerId */
    atsc3Plp: Record<number, Atsc3PlpSseEvent>;
    /** ATSC 3.0 L1 event per tunerId */
    atsc3L1: Record<number, Atsc3L1SseEvent>;
    connected: boolean;
    connError: string | null;
}

/** Memoized SSE event handlers for all four event types on the signal stream */
interface SignalEventHandlers {
    onSignal: (ev: MessageEvent<string>) => void;
    onStreamInfo: (ev: MessageEvent<string>) => void;
    onAtsc3Plp: (ev: MessageEvent<string>) => void;
    onAtsc3L1: (ev: MessageEvent<string>) => void;
}

/**
 * Build the four memoized SSE event handler callbacks for the signal stream.
 *
 * Extracted from useSignalStream to keep each function within the line limit.
 * Handlers write into the React state setters and the historyRef passed in.
 *
 * @param setters - State setter functions + history ref from the parent hook
 * @returns Four stable callbacks to attach/detach on the EventSource
 */
function useSignalEventHandlers(setters: {
    setTunerStates: Dispatch<SetStateAction<Record<number, TunerSignalState>>>;
    setPrograms: Dispatch<SetStateAction<Record<number, ParsedProgram[]>>>;
    setAtsc3Plp: Dispatch<SetStateAction<Record<number, Atsc3PlpSseEvent>>>;
    setAtsc3L1: Dispatch<SetStateAction<Record<number, Atsc3L1SseEvent>>>;
    setConnected: Dispatch<SetStateAction<boolean>>;
    setConnError: Dispatch<SetStateAction<string | null>>;
    historyRef: RefObject<Record<number, SignalDataPoint[]>>;
}): SignalEventHandlers {
    const { setTunerStates, setPrograms, setAtsc3Plp, setAtsc3L1, setConnected, setConnError, historyRef } = setters;

    /** Handle `signal` events — gauge/graph updates every 2 s */
    const onSignal = useCallback((ev: MessageEvent<string>) => {
        const data = JSON.parse(ev.data) as SignalSseEvent;
        setConnected(true);
        const prevHistory = historyRef.current[data.tunerId] ?? [];
        const point: SignalDataPoint = { timestamp: data.timestamp, ss: data.ss, snq: data.snq };
        const newHistory = [...prevHistory, point].slice(-MAX_HISTORY_POINTS);
        historyRef.current[data.tunerId] = newHistory;
        // "tuner0" → "Tuner 0", "tuner1" → "Tuner 1", etc.
        const slotLabel = data.resource.replace('tuner', 'Tuner ');
        setTunerStates((prev) => ({
            ...prev,
            [data.tunerId]: buildTunerState({ data, existing: prev[data.tunerId], newHistory, slotLabel }),
        }));
        if (data.error !== undefined) {
            const msg = data.error === 'timeout'
                ? 'Device not responding — retrying…'
                : 'Device unreachable — retrying…';
            setConnError(msg);
        } else {
            setConnError(null);
        }
    }, [setTunerStates, setConnected, setConnError, historyRef]);

    /** Handle `streaminfo` events — MPEG program/PID listing on channel change */
    const onStreamInfo = useCallback((ev: MessageEvent<string>) => {
        const data = JSON.parse(ev.data) as StreamInfoSseEvent;
        setPrograms((prev) => ({ ...prev, [data.tunerId]: data.programs }));
    }, [setPrograms]);

    /** Handle `atsc3plp` events — PLP info on ATSC 3.0 lock */
    const onAtsc3Plp = useCallback((ev: MessageEvent<string>) => {
        const data = JSON.parse(ev.data) as Atsc3PlpSseEvent;
        setAtsc3Plp((prev) => ({ ...prev, [data.tunerId]: data }));
    }, [setAtsc3Plp]);

    /** Handle `atsc3l1` events — L1 signaling info on ATSC 3.0 lock */
    const onAtsc3L1 = useCallback((ev: MessageEvent<string>) => {
        const data = JSON.parse(ev.data) as Atsc3L1SseEvent;
        setAtsc3L1((prev) => ({ ...prev, [data.tunerId]: data }));
    }, [setAtsc3L1]);

    return { onSignal, onStreamInfo, onAtsc3Plp, onAtsc3L1 };
}

/**
 * Subscribe to the per-device SSE stream and maintain live state.
 *
 * Handles four event types on the same stream:
 *   - `signal`     → gauge/graph data (every 2 s)
 *   - `streaminfo` → MPEG program/PID listing (on channel change)
 *   - `atsc3plp`   → ATSC 3.0 PLP info (on lock change)
 *   - `atsc3l1`    → ATSC 3.0 L1 info (on lock change)
 *
 * The EventSource URL only changes when the `tunerId` URL param changes, so
 * updating the breadcrumb device name will never cause a reconnect.
 *
 * @param tunerId - DB id from the URL; used to form the stream URL
 * @returns Live stream state: per-slot signal, program, and ATSC 3.0 states
 */
function useSignalStream(tunerId: string): SignalStreamState {
    const [tunerStates, setTunerStates] = useState<Record<number, TunerSignalState>>({});
    const [programs, setPrograms] = useState<Record<number, ParsedProgram[]>>({});
    const [atsc3Plp, setAtsc3Plp] = useState<Record<number, Atsc3PlpSseEvent>>({});
    const [atsc3L1, setAtsc3L1] = useState<Record<number, Atsc3L1SseEvent>>({});
    const [connected, setConnected] = useState(false);
    const [connError, setConnError] = useState<string | null>(null);
    const historyRef = useRef<Record<number, SignalDataPoint[]>>({});

    const { onSignal, onStreamInfo, onAtsc3Plp, onAtsc3L1 } = useSignalEventHandlers({
        setTunerStates, setPrograms, setAtsc3Plp, setAtsc3L1, setConnected, setConnError, historyRef,
    });

    useEffect(() => {
        const es = new EventSource(`/api/signal/${tunerId}/stream`);
        es.addEventListener('signal', onSignal);
        es.addEventListener('streaminfo', onStreamInfo);
        es.addEventListener('atsc3plp', onAtsc3Plp);
        es.addEventListener('atsc3l1', onAtsc3L1);
        es.onerror = () => {
            setConnError('Connection error — retrying…');
        };
        return () => {
            es.removeEventListener('signal', onSignal);
            es.removeEventListener('streaminfo', onStreamInfo);
            es.removeEventListener('atsc3plp', onAtsc3Plp);
            es.removeEventListener('atsc3l1', onAtsc3L1);
            es.close();
        };
    }, [tunerId, onSignal, onStreamInfo, onAtsc3Plp, onAtsc3L1]);

    return { tunerStates, programs, atsc3Plp, atsc3L1, connected, connError };
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
            <a href={`/tuners/${tunerId}`} className="signal-breadcrumb-back">← Back to {tunerName}</a>
        </nav>
    );
}

interface SignalGridProps {
    tunerStates: Record<number, TunerSignalState>;
    programs: Record<number, ParsedProgram[]>;
    atsc3Plp: Record<number, Atsc3PlpSseEvent>;
    atsc3L1: Record<number, Atsc3L1SseEvent>;
    /** DB tuner ID from the URL — passed to TuningControl for API calls */
    pageTunerId: number;
}

/**
 * Renders the grid of SignalStatusCard components (one per discovered slot).
 *
 * Each card receives three named slot props for its diagnostic sections:
 *   - `tuningControl` — TuningControl for channel navigation
 *   - `programs`      — ProgramList inline program listing
 *   - `atsc3Details`  — Atsc3Details single-level collapsible (ATSC 3.0 only)
 *
 * Sections render flat inside each card — no outer collapsible wrapper.
 * Diagnostic data is keyed by the same tunerId as the signal state, so each
 * slot's diagnostics update independently as SSE events arrive.
 *
 * @param props - Tuner signal states and per-slot diagnostic data
 */
function SignalGrid({ tunerStates, programs, atsc3Plp, atsc3L1, pageTunerId }: SignalGridProps) {
    const tunerList = Object.values(tunerStates);
    if (tunerList.length === 0) {
        return null;
    }

    return (
        <div className="antenna-grid" role="region" aria-label="All tuner slots signal status">
            {tunerList.map((tunerState) => (
                <SignalStatusCard
                    key={tunerState.tunerId}
                    state={tunerState}
                    tuningControl={
                        <TuningControl
                            tunerId={pageTunerId}
                            resource={tunerState.resource ?? 'tuner0'}
                            vctName={tunerState.vctName}
                            vctNumber={tunerState.vctNumber}
                            idle={tunerState.idle}
                        />
                    }
                    programs={
                        <ProgramList
                            programs={programs[tunerState.tunerId] ?? []}
                            idle={tunerState.idle}
                        />
                    }
                    atsc3Details={
                        <Atsc3Details
                            plp={atsc3Plp[tunerState.tunerId] ?? null}
                            l1={atsc3L1[tunerState.tunerId] ?? null}
                        />
                    }
                />
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
 * Renders a CSS grid of SignalStatusCard components with flat per-slot
 * diagnostic sections (TuningControl, ProgramList, Atsc3Details) inside
 * each card — no outer collapsible wrapper.
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

    const { tunerStates, programs, atsc3Plp, atsc3L1, connected, connError } = useSignalStream(tunerId);

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
            <SignalGrid
                tunerStates={tunerStates}
                programs={programs}
                atsc3Plp={atsc3Plp}
                atsc3L1={atsc3L1}
                pageTunerId={parseInt(tunerId, 10)}
            />
            <div className="signal-actions">
                <button type="button" onClick={() => router.back()} className="signal-back-button">← Back</button>
            </div>
        </main>
    );
}
