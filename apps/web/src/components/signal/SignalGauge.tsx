'use client';

/**
 * SignalGauge — Displays a single signal metric with a color-coded quality indicator.
 *
 * Layout design rationale:
 * The gauge uses a vertical stack layout so each metric reads naturally top-to-bottom:
 *   1. Abbreviated label (e.g. "SS", "SNQ", "SEQ") — small, muted, identifies the metric
 *   2. Numeric value — large and prominent, the primary data point the user scans
 *   3. Quality dot — small colored circle whose color conveys good/fair/poor/idle state
 *
 * The quality badge text label ("Good", "Fair", "Poor", "Idle") is intentionally
 * de-emphasized (visually small) because the color and the numeric value already
 * communicate quality. The text label satisfies WCAG 1.4.1 (not color alone).
 * The "Idle" state does NOT need a prominent badge — the "--" value already signals
 * that no data is available.
 *
 * Accessibility: ARIA label on the value container combines metric name and value
 * for screen readers. Quality badge is aria-hidden because the ARIA label already
 * conveys the complete picture.
 *
 * @module components/signal/SignalGauge
 */

import { getSignalQuality } from '@/lib/hdhr/signal-parsers';
import type { SignalQuality } from '@/lib/hdhr/signal-parsers';

// =============================================================================
// Tooltip text
// =============================================================================

/**
 * Full names and descriptions for each signal metric, shown as hover tooltips
 * on the abbreviated label (e.g. "SS", "SNQ", "SEQ").
 */
export const METRIC_TOOLTIPS: Record<string, string> = {
    SS: 'Signal Strength (SS) — raw RF power level',
    SNQ: 'Signal-to-Noise Quality (SNQ) — clarity of the received signal',
    SEQ: 'Symbol Error Quality (SEQ) — stability of the data stream',
};

// =============================================================================
// Styles
// =============================================================================

/** CSS class names and display labels for each quality tier */
export const QUALITY_STYLES: Record<SignalQuality, { label: string; icon: string; className: string }> = {
    good: {
        label: 'Good',
        icon: '●',
        className: 'signal-quality-good',
    },
    fair: {
        label: 'Fair',
        icon: '●',
        className: 'signal-quality-fair',
    },
    poor: {
        label: 'Poor',
        icon: '●',
        className: 'signal-quality-poor',
    },
    idle: {
        label: 'Idle',
        icon: '○',
        className: 'signal-quality-idle',
    },
};

// =============================================================================
// Component
// =============================================================================

interface SignalGaugeProps {
    /** Short abbreviation displayed in the gauge label (e.g. "SS", "SNQ", "SEQ").
     *  The full meaning is surfaced as a hover tooltip sourced from {@link METRIC_TOOLTIPS}. */
    label: string;
    /** Signal value 0–100, or null when idle */
    value: number | null;
    /** Which signal metric to apply thresholds for */
    metric: 'SS' | 'SNQ' | 'SEQ';
    /** Unit suffix, defaults to "%" */
    unit?: string;
}

/**
 * Renders a labeled signal gauge with numeric value and color-coded quality indicator.
 *
 * Vertical stack layout: label → value (large) → quality indicator (small).
 *
 * - Value is displayed large and prominent — it is the primary scannable data point
 * - Quality indicator uses a colored dot + small text label (satisfies WCAG 1.4.1)
 * - When idle, the value shows "--" and the indicator is gray; no visually prominent badge needed
 * - ARIA label combines metric name and value for screen readers
 *
 * @param props - Gauge display props
 */
export function SignalGauge({ label, value, metric, unit = '%' }: SignalGaugeProps) {
    const quality = getSignalQuality(value, metric);
    const style = QUALITY_STYLES[quality];
    const displayValue = value !== null ? `${value}${unit}` : '--';

    const ariaLabel = value !== null
        ? `${label} ${value} percent`
        : `${label} not available`;

    return (
        <div className="signal-gauge" data-metric={metric} data-quality={quality}>
            <div className="signal-gauge-label" title={METRIC_TOOLTIPS[metric] ?? label}>{label}</div>
            <div
                className="signal-gauge-value"
                aria-label={ariaLabel}
            >
                <span className="signal-gauge-number">{displayValue}</span>
            </div>
            <div
                className={`signal-gauge-badge ${style.className}`}
                aria-hidden="true"
            >
                <span className="signal-gauge-badge-icon">{style.icon}</span>
                <span className="signal-gauge-badge-label">{style.label}</span>
            </div>
        </div>
    );
}
