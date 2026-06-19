'use client';

/**
 * SignalGauge — Displays a single signal metric with a color-coded quality badge.
 *
 * Accessibility: ARIA label on the numeric display, text label on the quality
 * badge (not just color alone) to satisfy WCAG 1.4.1.
 *
 * @module components/signal/SignalGauge
 */

import { getSignalQuality } from '@/lib/hdhr/signal-parsers';
import type { SignalQuality } from '@/lib/hdhr/signal-parsers';

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
    /** Human-readable label for the metric, e.g. "Signal Strength" */
    label: string;
    /** Signal value 0–100, or null when idle */
    value: number | null;
    /** Which signal metric to apply thresholds for */
    metric: 'SS' | 'SNQ' | 'SEQ';
    /** Unit suffix, defaults to "%" */
    unit?: string;
}

/**
 * Renders a labeled signal gauge with numeric value and color-coded quality badge.
 *
 * - Value is displayed as a number with unit suffix (default "%")
 * - Quality badge shows icon + text label (not color alone — WCAG 1.4.1)
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
            <div className="signal-gauge-label">{label}</div>
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
