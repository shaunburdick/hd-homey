'use client';

/**
 * Atsc3Details — Conditional ATSC 3.0 PLP and L1 signaling details.
 *
 * This component is hidden (returns null) when no ATSC 3.0 data is available,
 * satisfying AC-011 (hidden on ATSC 1.0 devices).
 *
 * P2 feature: displayed only on the single-tuner signal page.
 *
 * @module components/signal/Atsc3Details
 */

import type { Atsc3PlpSseEvent, Atsc3L1SseEvent } from '@/lib/hdhr/signal-parsers';

// =============================================================================
// Component
// =============================================================================

interface Atsc3DetailsProps {
    /** PLP data from the atsc3plp SSE event, or null when not available */
    plp: Atsc3PlpSseEvent | null;
    /** L1 data from the atsc3l1 SSE event, or null when not available */
    l1: Atsc3L1SseEvent | null;
}

/** Display a value or em-dash when null */
function displayValue(value: string | number | null): string {
    return value !== null ? String(value) : '—';
}

/**
 * ATSC 3.0 technical details section.
 *
 * Returns null when both plp and l1 are null (hidden by default).
 * Shown only when the device detects an ATSC 3.0 lock.
 *
 * @param props - ATSC 3.0 event payloads
 */
export function Atsc3Details({ plp, l1 }: Atsc3DetailsProps) {
    // Hidden when no ATSC 3.0 data received — satisfies AC-011
    if (plp === null && l1 === null) {
        return null;
    }

    return (
        <section className="atsc3-details" aria-label="ATSC 3.0 Details">
            <h3 className="atsc3-details-title">ATSC 3.0 Details</h3>

            {plp !== null && (
                <div className="atsc3-details-section">
                    <h4>PLP Info</h4>
                    <dl className="atsc3-details-list">
                        <div className="atsc3-details-row">
                            <dt>PLP ID</dt>
                            <dd>{displayValue(plp.plpId)}</dd>
                        </div>
                        <div className="atsc3-details-row">
                            <dt>PLP Type</dt>
                            <dd>{displayValue(plp.plpType)}</dd>
                        </div>
                        <div className="atsc3-details-row">
                            <dt>SNR (dB)</dt>
                            <dd>{displayValue(plp.snrDb)}</dd>
                        </div>
                        <div className="atsc3-details-row">
                            <dt>FEC Type</dt>
                            <dd>{displayValue(plp.fecType)}</dd>
                        </div>
                    </dl>
                </div>
            )}

            {l1 !== null && (
                <div className="atsc3-details-section">
                    <h4>L1 Signaling</h4>
                    <dl className="atsc3-details-list">
                        <div className="atsc3-details-row">
                            <dt>FFT Size</dt>
                            <dd>{displayValue(l1.fftSize)}</dd>
                        </div>
                        <div className="atsc3-details-row">
                            <dt>Guard Interval</dt>
                            <dd>{displayValue(l1.gi)}</dd>
                        </div>
                        <div className="atsc3-details-row">
                            <dt>Pilot Pattern</dt>
                            <dd>{displayValue(l1.pp)}</dd>
                        </div>
                        <div className="atsc3-details-row">
                            <dt>L1-Basic Mod</dt>
                            <dd>{displayValue(l1.l1bMod)}</dd>
                        </div>
                        <div className="atsc3-details-row">
                            <dt>L1-Detail Mod</dt>
                            <dd>{displayValue(l1.l1dMod)}</dd>
                        </div>
                    </dl>
                </div>
            )}
        </section>
    );
}
