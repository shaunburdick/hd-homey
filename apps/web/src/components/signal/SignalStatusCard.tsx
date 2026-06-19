'use client';

/**
 * SignalStatusCard — Per-tuner card for antenna tuning mode.
 *
 * Displays tuner name, current channel, signal gauges, rolling graphs,
 * and an error banner when the device is unreachable.
 *
 * @module components/signal/SignalStatusCard
 */

import { SignalGauge } from './SignalGauge';
import { SignalGraph } from './SignalGraph';
import type { TunerSignalState } from '@/lib/hdhr/signal-parsers';

// =============================================================================
// Component
// =============================================================================

interface SignalStatusCardProps {
    /** Current signal state for this tuner */
    state: TunerSignalState;
}

/**
 * Card component displaying live signal data for a single tuner.
 * Used exclusively in the antenna tuning mode page.
 *
 * Shows:
 * - Tuner name and currently tuned channel (or "Idle")
 * - Compact SignalGauge row: SS, SNQ, SEQ
 * - Two SignalGraph: SS rolling 60-point, SNQ rolling 60-point
 * - Error banner when device is unreachable
 *
 * @param props - Card display props
 */
export function SignalStatusCard({ state }: SignalStatusCardProps) {
    const channelDisplay = state.idle
        ? 'Idle'
        : state.vctName
          ? `${state.vctNumber ?? ''} ${state.vctName}`.trim()
          : state.vctNumber ?? 'Tuned';

    const hasError = Boolean(state.error);

    return (
        <div className="signal-status-card" data-tuner-id={state.tunerId}>
            {/* Card header: name + channel */}
            <div className="signal-status-card-header">
                <h3 className="signal-status-card-name">{state.tunerName}</h3>
                <span className="signal-status-card-channel">
                    {channelDisplay}
                </span>
            </div>

            {/* Error banner */}
            {hasError && (
                <div className="signal-status-card-error" role="alert">
                    Device unreachable — retrying…
                </div>
            )}

            {/* Gauge row */}
            <div className="signal-status-card-gauges">
                <SignalGauge
                    label="SS"
                    value={state.ss}
                    metric="SS"
                />
                <SignalGauge
                    label="SNQ"
                    value={state.snq}
                    metric="SNQ"
                />
                <SignalGauge
                    label="SEQ"
                    value={state.seq}
                    metric="SEQ"
                />
            </div>

            {/* Rolling graphs */}
            <div className="signal-status-card-graphs">
                <SignalGraph
                    title="Signal Strength"
                    data={state.history}
                    dataKey="ss"
                    color="steelblue"
                    ariaLabel={`${state.tunerName} Signal Strength rolling graph, current: ${state.ss !== null ? `${state.ss}%` : 'N/A'}`}
                />
                <SignalGraph
                    title="SNR Quality"
                    data={state.history}
                    dataKey="snq"
                    color="mediumseagreen"
                    ariaLabel={`${state.tunerName} SNR Quality rolling graph, current: ${state.snq !== null ? `${state.snq}%` : 'N/A'}`}
                />
            </div>
        </div>
    );
}
