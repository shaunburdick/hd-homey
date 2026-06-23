/**
 * Tests for SignalGauge component.
 * Verifies color coding, ARIA labels, and idle state rendering.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SignalGauge, QUALITY_STYLES, METRIC_TOOLTIPS } from './SignalGauge';

describe('SignalGauge', () => {
    // -------------------------------------------------------------------------
    // Color badge rendering
    // -------------------------------------------------------------------------

    it('renders green (good) badge when SEQ = 100', () => {
        const { container } = render(
            <SignalGauge label="Symbol Quality" value={100} metric="SEQ" />,
        );
        const badge = container.querySelector('[data-quality="good"]');
        expect(badge).toBeTruthy();
        expect(badge?.textContent).toContain('Good');
    });

    it('renders yellow (fair) badge when SS = 55', () => {
        const { container } = render(
            <SignalGauge label="Signal Strength" value={55} metric="SS" />,
        );
        const badge = container.querySelector('[data-quality="fair"]');
        expect(badge).toBeTruthy();
        expect(badge?.textContent).toContain('Fair');
    });

    it('renders red (poor) badge when SNQ = 30', () => {
        const { container } = render(
            <SignalGauge label="SNR Quality" value={30} metric="SNQ" />,
        );
        const badge = container.querySelector('[data-quality="poor"]');
        expect(badge).toBeTruthy();
        expect(badge?.textContent).toContain('Poor');
    });

    it('renders idle badge when value is null', () => {
        const { container } = render(
            <SignalGauge label="Signal Strength" value={null} metric="SS" />,
        );
        const badge = container.querySelector('[data-quality="idle"]');
        expect(badge).toBeTruthy();
        expect(badge?.textContent).toContain('Idle');
    });

    // -------------------------------------------------------------------------
    // Numeric display
    // -------------------------------------------------------------------------

    it('displays the numeric value', () => {
        render(<SignalGauge label="Signal Strength" value={83} metric="SS" />);
        expect(screen.getByText('83%')).toBeTruthy();
    });

    it('displays -- when value is null', () => {
        const { container } = render(
            <SignalGauge label="Signal Strength" value={null} metric="SS" />,
        );
        const numberEl = container.querySelector('.signal-gauge-number');
        expect(numberEl?.textContent).toBe('--');
    });

    it('respects custom unit prop', () => {
        render(<SignalGauge label="Test" value={42} metric="SS" unit=" dB" />);
        expect(screen.getByText('42 dB')).toBeTruthy();
    });

    // -------------------------------------------------------------------------
    // Accessibility
    // -------------------------------------------------------------------------

    it('has aria-label with numeric value and "percent"', () => {
        const { container } = render(
            <SignalGauge label="Signal Strength" value={83} metric="SS" />,
        );
        // The gauge value div should have the aria-label
        const el = container.querySelector('[aria-label="Signal Strength 83 percent"]');
        expect(el).toBeTruthy();
    });

    it('has aria-label saying "not available" when idle', () => {
        const { container } = render(
            <SignalGauge label="SNR Quality" value={null} metric="SNQ" />,
        );
        const el = container.querySelector('[aria-label="SNR Quality not available"]');
        expect(el).toBeTruthy();
    });

    // -------------------------------------------------------------------------
    // Non-color-only badge (WCAG 1.4.1)
    // -------------------------------------------------------------------------

    it('badge contains text label, not just color', () => {
        const { container } = render(
            <SignalGauge label="Symbol Quality" value={50} metric="SEQ" />,
        );
        // The badge should have text content — not just a colored dot
        const badgeLabel = container.querySelector('.signal-gauge-badge-label');
        expect(badgeLabel?.textContent).toBeTruthy();
        expect(badgeLabel?.textContent?.trim().length).toBeGreaterThan(0);
    });

    // -------------------------------------------------------------------------
    // QUALITY_STYLES export
    // -------------------------------------------------------------------------

    it('exports QUALITY_STYLES with expected keys', () => {
        expect(QUALITY_STYLES.good).toBeDefined();
        expect(QUALITY_STYLES.fair).toBeDefined();
        expect(QUALITY_STYLES.poor).toBeDefined();
        expect(QUALITY_STYLES.idle).toBeDefined();
    });

    it('each quality style has label and className', () => {
        for (const [, style] of Object.entries(QUALITY_STYLES)) {
            expect(style.label).toBeTruthy();
            expect(style.className).toBeTruthy();
            expect(style.icon).toBeTruthy();
        }
    });

    // -------------------------------------------------------------------------
    // Tooltip / title attribute
    // -------------------------------------------------------------------------

    const LABEL_SELECTOR = '.signal-gauge-label';

    it('label div has title with full tooltip text for SS', () => {
        const { container } = render(
            <SignalGauge label="SS" value={80} metric="SS" />,
        );
        const labelEl = container.querySelector(LABEL_SELECTOR);
        expect(labelEl?.getAttribute('title')).toBe(METRIC_TOOLTIPS['SS']);
    });

    it('label div has title with full tooltip text for SNQ', () => {
        const { container } = render(
            <SignalGauge label="SNQ" value={70} metric="SNQ" />,
        );
        const labelEl = container.querySelector(LABEL_SELECTOR);
        expect(labelEl?.getAttribute('title')).toBe(METRIC_TOOLTIPS['SNQ']);
    });

    it('label div has title with full tooltip text for SEQ', () => {
        const { container } = render(
            <SignalGauge label="SEQ" value={90} metric="SEQ" />,
        );
        const labelEl = container.querySelector(LABEL_SELECTOR);
        expect(labelEl?.getAttribute('title')).toBe(METRIC_TOOLTIPS['SEQ']);
    });

    it('METRIC_TOOLTIPS exports tooltip text for all three metrics', () => {
        expect(METRIC_TOOLTIPS['SS']).toContain('Signal Strength');
        expect(METRIC_TOOLTIPS['SNQ']).toContain('Signal-to-Noise Quality');
        expect(METRIC_TOOLTIPS['SEQ']).toContain('Symbol Error Quality');
    });
});
