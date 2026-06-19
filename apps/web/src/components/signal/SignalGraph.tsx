'use client';

/**
 * SignalGraph — Rolling 60-point line chart for signal metrics.
 *
 * Wraps recharts LineChart with accessibility attributes and
 * prefers-reduced-motion support.
 *
 * @module components/signal/SignalGraph
 */

import { useEffect, useState } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
} from 'recharts';
import type { SignalDataPoint } from '@/lib/hdhr/signal-parsers';

// =============================================================================
// Types
// =============================================================================

interface SignalGraphProps {
    /** Chart title, displayed as heading above the graph */
    title: string;
    /** Rolling data buffer (max 60 entries) */
    data: SignalDataPoint[];
    /** Which field to graph from SignalDataPoint */
    dataKey: 'ss' | 'snq';
    /** Line stroke color, e.g. "steelblue" */
    color: string;
    /** ARIA label for the graph wrapper (for screen readers) */
    ariaLabel: string;
}

// =============================================================================
// Tooltip Formatter
// =============================================================================

/**
 * Format a timestamp value for the XAxis tick display.
 * Shows HH:MM:SS from a Unix millisecond timestamp.
 */
function formatTime(ts: number): string {
    return new Date(ts).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
    });
}

// =============================================================================
// Component
// =============================================================================

/**
 * Rolling 60-point recharts line chart for a single signal metric.
 *
 * Accessibility:
 * - Wrapping div has `role="img"` and `aria-label` for screen readers
 * - Animation is disabled when `prefers-reduced-motion: reduce` is set
 *
 * @param props - Graph display props
 */
export function SignalGraph({ title, data, dataKey, color, ariaLabel }: SignalGraphProps) {
    const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

    useEffect(() => {
        const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
        setPrefersReducedMotion(mq.matches);

        const handler = (event: MediaQueryListEvent) => {
            setPrefersReducedMotion(event.matches);
        };

        mq.addEventListener('change', handler);
        return () => mq.removeEventListener('change', handler);
    }, []);

    return (
        <div className="signal-graph">
            {title && <div className="signal-graph-title">{title}</div>}
            <div
                role="img"
                aria-label={ariaLabel}
                className="signal-graph-chart"
            >
                <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={data} margin={{ top: 5, right: 5, left: -20, bottom: 5 }}>
                        <XAxis
                            dataKey="timestamp"
                            tickFormatter={formatTime}
                            tick={{ fontSize: 10 }}
                            minTickGap={40}
                        />
                        <YAxis domain={[0, 100]} tick={{ fontSize: 10 }} />
                        <Tooltip
                            labelFormatter={(ts: number) => formatTime(ts)}
                            formatter={(value: number) => [`${value}%`, dataKey.toUpperCase()]}
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
