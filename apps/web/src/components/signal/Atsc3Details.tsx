'use client';

/**
 * Atsc3Details — Conditional ATSC 3.0 PLP and L1 signaling details.
 *
 * Returns null when no ATSC 3.0 data is available (satisfies AC-011).
 *
 * @module components/signal/Atsc3Details
 */

import type { Atsc3PlpSseEvent, Atsc3L1SseEvent } from '@/lib/hdhr/signal-parsers';

interface Atsc3DetailsProps {
    plp: Atsc3PlpSseEvent | null;
    l1: Atsc3L1SseEvent | null;
}

function displayValue(value: string | number | null): string {
    return value !== null ? String(value) : '—';
}

/** PLP info sub-section */
function PlpSection({ plp }: { plp: Atsc3PlpSseEvent }) {
    return (
        <div className="atsc3-details-section">
            <h4>PLP Info</h4>
            <dl className="atsc3-details-list">
                <div className="atsc3-details-row"><dt>PLP ID</dt><dd>{displayValue(plp.plpId)}</dd></div>
                <div className="atsc3-details-row"><dt>PLP Type</dt><dd>{displayValue(plp.plpType)}</dd></div>
                <div className="atsc3-details-row"><dt>SNR (dB)</dt><dd>{displayValue(plp.snrDb)}</dd></div>
                <div className="atsc3-details-row"><dt>FEC Type</dt><dd>{displayValue(plp.fecType)}</dd></div>
            </dl>
        </div>
    );
}

/** L1 signaling sub-section */
function L1Section({ l1 }: { l1: Atsc3L1SseEvent }) {
    return (
        <div className="atsc3-details-section">
            <h4>L1 Signaling</h4>
            <dl className="atsc3-details-list">
                <div className="atsc3-details-row"><dt>FFT Size</dt><dd>{displayValue(l1.fftSize)}</dd></div>
                <div className="atsc3-details-row"><dt>Guard Interval</dt><dd>{displayValue(l1.gi)}</dd></div>
                <div className="atsc3-details-row"><dt>Pilot Pattern</dt><dd>{displayValue(l1.pp)}</dd></div>
                <div className="atsc3-details-row"><dt>L1-Basic Mod</dt><dd>{displayValue(l1.l1bMod)}</dd></div>
                <div className="atsc3-details-row"><dt>L1-Detail Mod</dt><dd>{displayValue(l1.l1dMod)}</dd></div>
            </dl>
        </div>
    );
}

/**
 * ATSC 3.0 technical details section.
 *
 * Returns null when both plp and l1 are null — satisfies AC-011.
 *
 * @param props - ATSC 3.0 event payloads
 */
export function Atsc3Details({ plp, l1 }: Atsc3DetailsProps) {
    if (plp === null && l1 === null) {
        return null;
    }

    return (
        <section className="atsc3-details" aria-label="ATSC 3.0 Details">
            <h3 className="atsc3-details-title">ATSC 3.0 Details</h3>
            {plp !== null && <PlpSection plp={plp} />}
            {l1 !== null && <L1Section l1={l1} />}
        </section>
    );
}
