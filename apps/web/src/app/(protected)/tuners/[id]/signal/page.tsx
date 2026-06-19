'use client';

/**
 * Single-Tuner Signal Monitor Page
 *
 * Route: /tuners/[id]/signal
 *
 * @module app/(protected)/tuners/[id]/signal/page
 */

import { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { SignalGauge } from '@/components/signal/SignalGauge';
import { SignalGraph } from '@/components/signal/SignalGraph';
import { ProgramList } from '@/components/signal/ProgramList';
import { Atsc3Details } from '@/components/signal/Atsc3Details';
import type {
    SignalDataPoint,
    SignalSseEvent,
    StreamInfoSseEvent,
    Atsc3PlpSseEvent,
    Atsc3L1SseEvent,
} from '@/lib/hdhr/signal-parsers';
import type { ParsedProgram } from '@/lib/hdhr/types';

const MAX_HISTORY_POINTS = 60;

function toErrorMsg(code: string | undefined): string | null {
    if (code === 'timeout') {
        return 'Device not responding — retrying…';
    }
    if (code === 'unreachable') {
        return 'Device unreachable — retrying…';
    }
    return null;
}

interface SignalHookState {
    signal: SignalSseEvent | null;
    programs: ParsedProgram[];
    atsc3Plp: Atsc3PlpSseEvent | null;
    atsc3L1: Atsc3L1SseEvent | null;
    connected: boolean;
    connError: string | null;
    history: SignalDataPoint[];
}

function useSignalStream(tunerId: string): SignalHookState {
    const [state, setState] = useState<SignalHookState>({
        signal: null, programs: [], atsc3Plp: null, atsc3L1: null,
        connected: false, connError: null, history: [],
    });
    const historyRef = useRef<SignalDataPoint[]>([]);

    useEffect(() => {
        const es = new EventSource(`/api/signal/${tunerId}/stream`);

        es.onmessage = (ev: MessageEvent<string>) => {
            const parsed = JSON.parse(ev.data) as { event?: string } & Record<string, unknown>;
            const eventType = parsed.event ?? 'signal';

            if (eventType === 'streaminfo') {
                setState((prev) => ({ ...prev, programs: (parsed as unknown as StreamInfoSseEvent).programs }));
                return;
            }
            if (eventType === 'atsc3plp') {
                setState((prev) => ({ ...prev, atsc3Plp: parsed as unknown as Atsc3PlpSseEvent }));
                return;
            }
            if (eventType === 'atsc3l1') {
                setState((prev) => ({ ...prev, atsc3L1: parsed as unknown as Atsc3L1SseEvent }));
                return;
            }
            // Default: signal event
            const data = parsed as unknown as SignalSseEvent;
            historyRef.current = [...historyRef.current,
                { timestamp: data.timestamp, ss: data.ss, snq: data.snq }].slice(-MAX_HISTORY_POINTS);
            setState((prev) => ({
                ...prev, signal: data, connected: true,
                connError: toErrorMsg(data.error), history: [...historyRef.current],
            }));
        };

        es.onerror = () => {
            setState((prev) => ({ ...prev, connError: 'Connection error — retrying…' }));
        };

        return () => {
            es.close();
        };
    }, [tunerId]);

    return state;
}

function SignalBreadcrumb({ tunerId, tunerName }: { tunerId: string; tunerName: string }) {
    return (
        <nav className="signal-breadcrumb" aria-label="Signal page navigation">
            <Link href={`/tuners/${tunerId}`} className="signal-breadcrumb-back">← Back to {tunerName}</Link>
            <span className="signal-breadcrumb-separator" aria-hidden="true"> | </span>
            <Link href="/signal/antenna" className="signal-breadcrumb-antenna">📡 Antenna Tuning Mode →</Link>
        </nav>
    );
}

function SignalGaugeRow({ signal }: { signal: SignalSseEvent | null }) {
    return (
        <div className="signal-gauge-row" role="region" aria-label="Signal metrics">
            <SignalGauge label="Signal Strength" value={signal?.ss ?? null} metric="SS" />
            <SignalGauge label="SNR Quality" value={signal?.snq ?? null} metric="SNQ" />
            <SignalGauge label="Symbol Quality" value={signal?.seq ?? null} metric="SEQ" />
        </div>
    );
}

function signalAriaLabel(prefix: string, value: number | null | undefined): string {
    return value !== null && value !== undefined
        ? `${prefix} rolling graph, current: ${value}%`
        : `${prefix} rolling graph`;
}

function SignalGraphRow({ signal, history }: { signal: SignalSseEvent | null; history: SignalDataPoint[] }) {
    return (
        <div className="signal-graphs-row">
            <SignalGraph
                title="Signal Strength" data={history} dataKey="ss" color="steelblue"
                ariaLabel={signalAriaLabel('Signal Strength', signal?.ss)}
            />
            <SignalGraph
                title="SNR Quality" data={history} dataKey="snq" color="mediumseagreen"
                ariaLabel={signalAriaLabel('SNR Quality', signal?.snq)}
            />
        </div>
    );
}

function buildChannelText(signal: SignalSseEvent): string {
    if (signal.vctName !== undefined && signal.vctName !== '') {
        return `${signal.vctNumber ?? ''} ${signal.vctName}`.trim();
    }
    return signal.vctNumber ?? '';
}

export default function SignalPage() {
    const params = useParams<{ id: string }>();
    const router = useRouter();
    const tunerId = params.id;
    const [tunerName, setTunerName] = useState(`Tuner ${tunerId}`);
    const { signal, programs, atsc3Plp, atsc3L1, connected, connError, history } = useSignalStream(tunerId);

    useEffect(() => {
        const controller = new AbortController();
        void fetch(`/api/tuners/${tunerId}`, { signal: controller.signal })
            .then((res) => res.ok ? res.json() as Promise<{ data: { name: string } }> : Promise.resolve(null))
            .then((json) => {
                if (json !== null) {
                    setTunerName(json.data.name);
                } return json;
            });
        return () => {
            controller.abort();
        };
    }, [tunerId]);

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
            {signal !== null && !signal.idle && (
                <p className="signal-channel-info">{buildChannelText(signal)}</p>
            )}
            {signal !== null && signal.idle && (
                <p className="signal-channel-info signal-channel-idle">Idle — no channel tuned</p>
            )}
            <SignalGaugeRow signal={signal} />
            <SignalGraphRow signal={signal} history={history} />
            <ProgramList programs={programs} idle={signal?.idle ?? true} tunerId={parseInt(tunerId, 10)} />
            <Atsc3Details plp={atsc3Plp} l1={atsc3L1} />
            <div className="signal-actions">
                <button type="button" onClick={() => router.back()} className="signal-back-button">← Back</button>
            </div>
        </main>
    );
}
