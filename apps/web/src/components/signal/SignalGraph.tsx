'use client';

/**
 * SignalGraph — Rolling 60-point line chart for signal metrics.
 *
 * Wraps recharts LineChart with accessibility attributes and a fixed
 * 120-second time window so data scrolls left-to-right without any
 * full-redraw animation.
 *
 * Animation design decision:
 *   recharts' default "enter" animation redraws the entire line on every new
 *   data point (every 2 s) which makes a rolling chart unreadable. Animation
 *   is therefore disabled unconditionally — the rolling scroll is visual
 *   enough feedback. The prefers-reduced-motion store is retained so future
 *   authors can re-enable subtle transition effects without the jarring redraw.
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

/** YAxis domain maximum (signal values are 0–100%) */
const YAXIS_MAX = 100;

/**
 * Fixed time window width in milliseconds.
 * At a 2-second poll interval and 60 history points, this exactly covers
 * the full rolling buffer.
 */
const WINDOW_MS = 120_000;

// =============================================================================
// Reduced-motion external store (retained for future use — see module comment)
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
// Helpers
// =============================================================================

/**
 * Sort data points ascending by timestamp and compute a fixed 120-second
 * XAxis domain anchored to the latest point.
 *
 * When the buffer is empty, returns a [0, WINDOW_MS] placeholder domain so
 * recharts renders a blank (but properly-scaled) chart while data loads.
 * We avoid Date.now() here because it is impure during render.
 *
 * @param data - Raw (possibly unordered) data points
 * @returns Sorted array and a [start, end] timestamp domain tuple
 */
function prepareSortedData(data: SignalDataPoint[]): {
    sorted: SignalDataPoint[];
    xDomain: [number, number];
} {
    const sorted = [...data].sort((ptA, ptB) => ptA.timestamp - ptB.timestamp);
    const latestTs = sorted.length > 0 ? (sorted[sorted.length - 1]?.timestamp ?? 0) : 0;
    const xDomain: [number, number] = latestTs > 0 ? [latestTs - WINDOW_MS, latestTs] : [0, WINDOW_MS];
    return { sorted, xDomain };
}

// =============================================================================
// Component
// =============================================================================

/**
 * Rolling 60-point recharts line chart for a single signal metric.
 *
 * Renders a fixed 120-second time window: oldest data on the left, newest
 * on the right. Data points are sorted ascending by timestamp before rendering.
 * Animation is unconditionally disabled to prevent the distracting full-redraw
 * that recharts triggers on every new data point arrival.
 *
 * Accessibility:
 * - Wrapping div has `role="img"` and `aria-label` for screen readers
 *
 * @param props - Graph display props
 */
export function SignalGraph({ title, data, dataKey, color, ariaLabel }: SignalGraphProps) {
    // Retain the reduced-motion store subscription — if subtle transitions are
    // re-introduced, they should still respect this user preference.
    useSyncExternalStore(
        subscribeToReducedMotion,
        getReducedMotionSnapshot,
        getServerSnapshot,
    );

    const { sorted, xDomain } = prepareSortedData(data);

    return (
        <div className="signal-graph">
            {title !== '' && <div className="signal-graph-title">{title}</div>}
            <div role="img" aria-label={ariaLabel} className="signal-graph-chart">
                <ResponsiveContainer width="100%" height={120}>
                    <LineChart data={sorted} margin={CHART_MARGIN}>
                        <XAxis
                            dataKey="timestamp"
                            type="number"
                            domain={xDomain}
                            tickFormatter={formatTime}
                            tick={{ fontSize: AXIS_TICK_FONT_SIZE }}
                            minTickGap={TICK_GAP_PX}
                            scale="time"
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
                            isAnimationActive={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}
