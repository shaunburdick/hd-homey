'use client';

/**
 * SignalStatusCard — Per-tuner card for antenna tuning mode and per-device signal page.
 *
 * Accepts an optional `diagnostics` node that, when provided, is rendered as a
 * collapsible section inside the card — below the graphs and visually flush with
 * the card's background, border and padding. The antenna page omits this prop.
 *
 * @module components/signal/SignalStatusCard
 */

import type { ReactNode } from 'react';
import { SignalGauge } from './SignalGauge';
import { SignalGraph } from './SignalGraph';
import type { TunerSignalState } from '@/lib/hdhr/signal-parsers';

interface SignalStatusCardProps {
    state: TunerSignalState;
    /** Optional diagnostics node rendered as a collapsible section inside the card. */
    diagnostics?: ReactNode;
}

/** Determine the channel display string from the tuner state */
function getChannelDisplay(state: TunerSignalState): string {
    if (state.idle) {
        return 'Idle';
    }
    if (state.vctName !== undefined && state.vctName !== '') {
        return `${state.vctNumber ?? ''} ${state.vctName}`.trim();
    }
    return state.vctNumber ?? 'Tuned';
}

/** Signal strength aria label */
function ssLabel(state: TunerSignalState): string {
    return `${state.tunerName} Signal Strength, current: ${state.ss !== null ? `${state.ss}%` : 'N/A'}`;
}

/** SNQ aria label */
function snqLabel(state: TunerSignalState): string {
    return `${state.tunerName} SNR Quality, current: ${state.snq !== null ? `${state.snq}%` : 'N/A'}`;
}

/**
 * Card component displaying live signal data for a single tuner.
 *
 * The optional `diagnostics` prop is rendered as a collapsible `<details>`
 * section at the bottom of the card, styled to match the card's background and
 * typography. Omit the prop entirely on pages that don't need diagnostics
 * (e.g. the antenna page).
 *
 * @param props - Card display props
 */
export function SignalStatusCard({ state, diagnostics }: SignalStatusCardProps) {
    const channelDisplay = getChannelDisplay(state);
    const hasError = state.error !== undefined;

    return (
        <div className="signal-status-card" data-tuner-id={state.tunerId}>
            <div className="signal-status-card-header">
                <h3 className="signal-status-card-name">{state.tunerName}</h3>
                <span className="signal-status-card-channel">{channelDisplay}</span>
            </div>

            {hasError && (
                <div className="signal-status-card-error" role="alert">
                    Device unreachable — retrying…
                </div>
            )}

            <div className="signal-status-card-gauges">
                <SignalGauge label="SS" value={state.ss} metric="SS" />
                <SignalGauge label="SNQ" value={state.snq} metric="SNQ" />
                <SignalGauge label="SEQ" value={state.seq} metric="SEQ" />
            </div>

            <div className="signal-status-card-graphs">
                <SignalGraph
                    title="Signal Strength"
                    data={state.history}
                    dataKey="ss"
                    color="steelblue"
                    ariaLabel={ssLabel(state)}
                />
                <SignalGraph
                    title="SNR Quality"
                    data={state.history}
                    dataKey="snq"
                    color="mediumseagreen"
                    ariaLabel={snqLabel(state)}
                />
            </div>

            {diagnostics !== undefined && (
                <details className="signal-status-card-diagnostics">
                    <summary className="signal-status-card-diagnostics-summary">▶ Diagnostics</summary>
                    <div className="signal-status-card-diagnostics-content">
                        {diagnostics}
                    </div>
                </details>
            )}
        </div>
    );
}
