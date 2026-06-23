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

/**
 * Map a raw lock type string to a human-readable label and CSS modifier class.
 *
 * @param lockType - Lock type string from the device status endpoint, e.g. "atsc3-t2", "atsc1-t", "8vsb"
 * @returns Object with display label and CSS class, or null when lock type is unknown/absent
 */
function getLockTypeBadge(lockType: string | undefined): { label: string; modifier: string } | null {
    if (lockType === undefined) {
        return null;
    }
    if (lockType.includes('atsc3')) {
        return { label: 'ATSC 3.0', modifier: 'locktype-atsc3' };
    }
    if (lockType.includes('atsc1') || lockType === '8vsb') {
        return { label: 'ATSC 1.0', modifier: 'locktype-atsc1' };
    }
    return null;
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
 * Render the three signal metric gauges (SS, SNQ, SEQ) in a row.
 *
 * @param state - Tuner signal state carrying current gauge values
 */
function SignalGaugeRow({ state }: { state: TunerSignalState }) {
    return (
        <div className="signal-status-card-gauges">
            <SignalGauge label="SS" value={state.ss} metric="SS" />
            <SignalGauge label="SNQ" value={state.snq} metric="SNQ" />
            <SignalGauge label="SEQ" value={state.seq} metric="SEQ" />
        </div>
    );
}

/**
 * Render the SS and SNQ trend graphs stacked vertically.
 *
 * @param state - Tuner signal state carrying history buffer and tuner name
 */
function SignalGraphStack({ state }: { state: TunerSignalState }) {
    return (
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
    );
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
    const lockBadge = getLockTypeBadge(state.lockType);

    return (
        <div className="signal-status-card" data-tuner-id={state.tunerId}>
            <div className="signal-status-card-header">
                <h3 className="signal-status-card-name">{state.tunerName}</h3>
                <span className="signal-status-card-channel">{channelDisplay}</span>
                {lockBadge !== null && (
                    <span className={`signal-status-card-locktype ${lockBadge.modifier}`}>
                        {lockBadge.label}
                    </span>
                )}
            </div>

            {hasError && (
                <div className="signal-status-card-error" role="alert">
                    Device unreachable — retrying…
                </div>
            )}

            <SignalGaugeRow state={state} />
            <SignalGraphStack state={state} />

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
