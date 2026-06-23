'use client';

/**
 * SignalStatusCard — Per-tuner signal status card with optional flat diagnostic sections.
 *
 * Accepts three optional named slot props for diagnostics content. When provided,
 * each slot is rendered as a flat `<div>` section directly inside the card — below
 * the graphs, in order: tuningControl → programs → atsc3Details. There is no outer
 * collapsible wrapper; ATSC 3.0 details carry their own single-level `<details>`
 * internally. Omit any slot prop on pages that don't need that section.
 *
 * @module components/signal/SignalStatusCard
 */

import type { ReactNode } from 'react';
import { SignalGauge } from './SignalGauge';
import { SignalGraph } from './SignalGraph';
import type { TunerSignalState } from '@/lib/hdhr/signal-parsers';

export interface SignalStatusCardProps {
    state: TunerSignalState;
    /** Optional tuning controls — renders inline between graphs and program listing */
    tuningControl?: ReactNode;
    /** Optional program listing — renders inline after tuning controls */
    programs?: ReactNode;
    /** Optional ATSC 3.0 details — renders as a single collapsible section */
    atsc3Details?: ReactNode;
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
 * The three optional diagnostic slot props (`tuningControl`, `programs`,
 * `atsc3Details`) are rendered as flat `<div className="signal-status-card-section">`
 * elements directly inside the card — no outer collapsible wrapping. Each slot
 * is only rendered when the prop is provided. ATSC 3.0 details manage their own
 * single-level `<details>` collapsible internally.
 *
 * @param props - Card display props
 */
export function SignalStatusCard({ state, tuningControl, programs, atsc3Details }: SignalStatusCardProps) {
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

            {tuningControl !== undefined && (
                <div className="signal-status-card-section">{tuningControl}</div>
            )}
            {programs !== undefined && (
                <div className="signal-status-card-section">{programs}</div>
            )}
            {atsc3Details !== undefined && (
                <div className="signal-status-card-section">{atsc3Details}</div>
            )}
        </div>
    );
}
