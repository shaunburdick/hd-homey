/**
 * Tests for SignalGraph component.
 * Verifies role="img", aria-label, reduced-motion handling, and rendering.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import { SignalGraph } from './SignalGraph';
import type { SignalDataPoint } from '@/lib/hdhr/signal-parsers';

// =============================================================================
// Mocks
// =============================================================================

// Recharts uses ResizeObserver — polyfill for jsdom
global.ResizeObserver = class ResizeObserver {
    observe(): void { /* test polyfill */ }
    unobserve(): void { /* test polyfill */ }
    disconnect(): void { /* test polyfill */ }
};

// =============================================================================
// Helpers
// =============================================================================

function makeDataPoints(count: number): SignalDataPoint[] {
    return Array.from({ length: count }, (_, i) => ({
        timestamp: Date.now() - (count - i) * 2000,
        ss: 80 + (i % 10),
        snq: 85 + (i % 5),
    }));
}

function mockMatchMedia(prefersReducedMotion: boolean) {
    Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation((query: string) => ({
            matches: query.includes('reduce') ? prefersReducedMotion : false,
            media: query,
            onchange: null,
            addEventListener: vi.fn(),
            removeEventListener: vi.fn(),
            dispatchEvent: vi.fn(),
        })),
    });
}

// =============================================================================
// Tests
// =============================================================================

describe('SignalGraph', () => {
    beforeEach(() => {
        // Default: no reduced motion preference
        mockMatchMedia(false);
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    it('renders without crashing with empty data array', () => {
        expect(() => {
            render(
                <SignalGraph
                    title="Signal Strength"
                    data={[]}
                    dataKey="ss"
                    color="steelblue"
                    ariaLabel="Signal Strength rolling graph"
                />,
            );
        }).not.toThrow();
    });

    it('renders without crashing with 60 data points', () => {
        expect(() => {
            render(
                <SignalGraph
                    title="Signal Strength"
                    data={makeDataPoints(60)}
                    dataKey="ss"
                    color="steelblue"
                    ariaLabel="Signal Strength rolling graph"
                />,
            );
        }).not.toThrow();
    });

    it('has role="img" on the chart wrapper', () => {
        const { container } = render(
            <SignalGraph
                title="Signal Strength"
                data={makeDataPoints(5)}
                dataKey="ss"
                color="steelblue"
                ariaLabel="Signal Strength rolling graph, current value: 83%"
            />,
        );

        const imgWrapper = container.querySelector('[role="img"]');
        expect(imgWrapper).toBeTruthy();
    });

    it('applies the aria-label prop to the role="img" wrapper', () => {
        const ariaLabel = 'Signal Strength rolling graph, current value: 83%';
        const { container } = render(
            <SignalGraph
                title="Signal Strength"
                data={[]}
                dataKey="ss"
                color="steelblue"
                ariaLabel={ariaLabel}
            />,
        );

        const imgWrapper = container.querySelector(`[aria-label="${ariaLabel}"]`);
        expect(imgWrapper).toBeTruthy();
    });

    it('disables animation when prefers-reduced-motion is set', () => {
        // This test verifies that the component reads the matchMedia preference.
        // We mock matchMedia to return matches: true for 'prefers-reduced-motion: reduce'.
        mockMatchMedia(true);

        const { container } = render(
            <SignalGraph
                title="SNR Quality"
                data={makeDataPoints(10)}
                dataKey="snq"
                color="mediumseagreen"
                ariaLabel="SNR Quality rolling graph"
            />,
        );

        // Component should render with the role="img" wrapper
        expect(container.querySelector('[role="img"]')).toBeTruthy();

        // matchMedia should have been called with the reduced-motion query
        expect(window.matchMedia).toHaveBeenCalledWith('(prefers-reduced-motion: reduce)');
    });

    it('renders the title text', () => {
        const { container } = render(
            <SignalGraph
                title="My Signal"
                data={[]}
                dataKey="ss"
                color="steelblue"
                ariaLabel="test"
            />,
        );
        expect(container.textContent).toContain('My Signal');
    });
});
