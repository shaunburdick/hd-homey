'use client';

/**
 * SignalGraph — Rolling 60-point line chart for signal metrics.
 *
 * Wraps recharts LineChart with accessibility attributes and
 * prefers-reduced-motion support.
 *
 * @module components/signal/SignalGraph
 */

import { useSyncExternalStore } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
} from 'recharts';
import type { SignalDataPoint } from '@/lib/hdhr/signal-parsers';

/** Chart margins in pixels */
const CHART_MARGIN = { top: 5, right: 5, left: -20, bottom: 5 } as const;

/** Minimum gap between XAxis tick labels in pixels */
const TICK_GAP_PX = 40;

/** Font size for axis tick labels */
const AXIS_TICK_FONT_SIZE = 10;

/** YAxis domain maximum (signal values are 0-100%) */
const YAXIS_MAX = 100;

// =============================================================================
// Reduced-motion external store
// =============================================================================

function getReducedMotionSnapshot(): boolean {
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function getServerSnapshot(): boolean {
    return false; // SSR default: no animation preference
}

function subscribeToReducedMotion(callback: () => void): () => void {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    mq.addEventListener('change', callback);
    return () => mq.removeEventListener('change', callback);
}

// =============================================================================
// Types
// =============================================================================

interface SignalGraphProps {
    title: string;
    data: SignalDataPoint[];
    dataKey: 'ss' | 'snq';
    color: string;
    ariaLabel: string;
}

// =============================================================================
// Formatters
// =============================================================================

function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

// =============================================================================
// Component
// =============================================================================

/**
 * Rolling 60-point recharts line chart for a single signal metric.
 *
 * Accessibility:
 * - Wrapping div has `role="img"` and `aria-label` for screen readers
 * - Animation is disabled when `prefers-reduced-motion: reduce` is active
 *
 * @param props - Graph display props
 */
export function SignalGraph({ title, data, dataKey, color, ariaLabel }: SignalGraphProps) {
    const prefersReducedMotion = useSyncExternalStore(
        subscribeToReducedMotion,
        getReducedMotionSnapshot,
        getServerSnapshot,
    );

    return (
        <div className="signal-graph">
            {title !== '' && <div className="signal-graph-title">{title}</div>}
            <div role="img" aria-label={ariaLabel} className="signal-graph-chart">
                <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={data} margin={CHART_MARGIN}>
                        <XAxis
                            dataKey="timestamp"
                            tickFormatter={formatTime}
                            tick={{ fontSize: AXIS_TICK_FONT_SIZE }}
                            minTickGap={TICK_GAP_PX}
                        />
                        <YAxis domain={[0, YAXIS_MAX]} tick={{ fontSize: AXIS_TICK_FONT_SIZE }} />
                        <Tooltip
                            labelFormatter={(label) => typeof label === 'number' ? formatTime(label) : String(label)}
                            formatter={(value) => [`${String(value)}%`, dataKey.toUpperCase()]}
                        />
                        <Line
                            type="monotone"
                            dataKey={dataKey}
                            stroke={color}
                            strokeWidth={2}
                            dot={false}
                            isAnimationActive={!prefersReducedMotion}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
