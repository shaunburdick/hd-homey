/**
 * Signal parsing utilities for HDHomeRun device API responses.
 *
 * All functions in this module are pure (no side effects) and operate on
 * plain strings or objects. This makes them trivially unit-testable.
 *
 * @module signal-parsers
 */

import type {
    TunerStatusEntry,
    TunerStatusResponse,
    StreamInfoPid,
    ParsedProgram,
    Atsc3PlpInfo,
    Atsc3L1Info,
    TunerLockStatus,
} from './types';

// =============================================================================
// Color Quality Thresholds & Types
// =============================================================================

/**
 * Signal quality thresholds for color-coded indicators.
 * All values are integer percentages (0–100).
 *
 * SEQ: 100 = green, 80–99 = yellow, <80 = red
 * SS / SNQ: >70 = green, 40–70 = yellow, <40 = red
 */
export const SIGNAL_THRESHOLDS = {
    SS: { green: 70, yellow: 40 },
    SNQ: { green: 70, yellow: 40 },
    SEQ: { green: 100, yellow: 80 },
} as const;

/**
 * Color quality tier — maps to CSS class names and ARIA label suffixes
 */
export type SignalQuality = 'good' | 'fair' | 'poor' | 'idle';

// =============================================================================
// SSE Event Payload Types
// =============================================================================

/**
 * Emitted every 2 seconds per tuner while the SSE connection is open.
 * `idle: true` when the tuner has no channel tuned (VctNumber absent).
 * `error` is present only when the device fetch failed.
 */
export interface SignalSseEvent {
    /** Discriminator for SSE event multiplexing */
    event: 'signal';
    /** HD Homey database tuner ID */
    tunerId: number;
    /** HDHomeRun resource name. E.g. "tuner0" */
    resource: string;
    /** True when tuner has no active channel tuned */
    idle: boolean;
    /** Virtual channel number. E.g. "5.1". Undefined when idle. */
    vctNumber?: string;
    /** Channel guide name. E.g. "KPIX". Undefined when idle. */
    vctName?: string;
    /** Signal strength percent (0–100). Null when idle or on error. */
    ss: number | null;
    /** SNR quality percent (0–100). Null when idle or on error. */
    snq: number | null;
    /** Symbol quality percent (0–100). Null when idle or on error. */
    seq: number | null;
    /** Unix timestamp in milliseconds */
    timestamp: number;
    /** Present on device fetch failure */
    error?: 'timeout' | 'unreachable' | 'no-tuners';
}

/**
 * Emitted when the tuned channel changes (VctNumber change detected)
 * or on first channel lock. Programs array is empty when no data available.
 */
export interface StreamInfoSseEvent {
    event: 'streaminfo';
    tunerId: number;
    programs: ParsedProgram[];
}

/**
 * Emitted when ATSC 3.0 lock is detected (lock string contains "atsc3").
 * All fields are null when the lock is released.
 */
export interface Atsc3PlpSseEvent {
    event: 'atsc3plp';
    tunerId: number;
    plpId: number | null;
    plpType: number | null;
    snrDb: number | null;
    fecType: string | null;
}

/**
 * Emitted alongside atsc3plp when ATSC 3.0 lock is detected.
 */
export interface Atsc3L1SseEvent {
    event: 'atsc3l1';
    tunerId: number;
    fftSize: string | null;
    gi: string | null;
    pp: string | null;
    l1bMod: string | null;
    l1dMod: string | null;
}

/**
 * Keepalive event emitted every 30 seconds.
 * Prevents proxy/load-balancer idle connection timeouts.
 */
export interface PingSseEvent {
    event: 'ping';
}

/**
 * Discriminated union of all SSE event payloads from /api/signal/* endpoints.
 */
export type SignalStreamEvent =
    | SignalSseEvent
    | StreamInfoSseEvent
    | Atsc3PlpSseEvent
    | Atsc3L1SseEvent
    | PingSseEvent;

// =============================================================================
// Client-Side State Types
// =============================================================================

/**
 * Single data point in the 60-entry rolling graph buffer.
 * Used as recharts data array element.
 */
export interface SignalDataPoint {
    /** Unix ms timestamp — used as recharts XAxis dataKey */
    timestamp: number;
    /** Signal strength percent (0–100), or null if idle/error */
    ss: number | null;
    /** SNR quality percent (0–100), or null if idle/error */
    snq: number | null;
}

/**
 * Live state for a single tuner as rendered in antenna mode.
 * Managed in a useState<Record<number, TunerSignalState>> in the antenna page.
 */
export interface TunerSignalState {
    tunerId: number;
    tunerName: string;
    resource: string;
    idle: boolean;
    vctName?: string;
    vctNumber?: string;
    ss: number | null;
    snq: number | null;
    seq: number | null;
    /** Rolling 60-point buffer for graphs */
    history: SignalDataPoint[];
    /** Last error string if device unreachable */
    error?: string;
}

// =============================================================================
// Pure Parsing Functions
// =============================================================================

/**
 * Find the status entry for a specific tuner resource from the /status.json array.
 *
 * @param json - Full array from /status.json
 * @param resource - Resource name to look up, e.g. "tuner0"
 * @returns The matching entry or null if not found
 */
export function parseStatusJson(
    json: TunerStatusResponse,
    resource: string,
): TunerStatusEntry | null {
    if (!Array.isArray(json)) {
        return null;
    }

    const entry = json.find((item) => item.Resource === resource);
    return entry ?? null;
}

/** Characters after the colon+space prefix in a streaminfo line */
const STREAMINFO_CODEC_OFFSET = 2;

/**
 * Parse the plain-text /tuner{N}/streaminfo response into structured PID entries.
 *
 * Line format: `{pid}: {codec} {type} {program} [{extra}]`
 * Where type is 'v' (video), 'a' (audio), or absent for data PIDs.
 *
 * @param rawText - Raw plain-text response from the device
 * @returns Array of parsed PID entries. Empty array on empty/malformed input.
 */
export function parseStreamInfo(rawText: string): StreamInfoPid[] {
    if (!rawText || rawText.trim() === '') {
        return [];
    }

    const pids: StreamInfoPid[] = [];

    for (const line of rawText.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed) continue;

        // Expected format: "481: mpeg2video v 1" or "484: data 1 0x100"
        const colonIdx = trimmed.indexOf(':');
        if (colonIdx === -1) continue;

        const pidStr = trimmed.slice(0, colonIdx).trim();
        const pid = parseInt(pidStr, 10);
        if (isNaN(pid)) continue;

        const rest = trimmed.slice(colonIdx + STREAMINFO_CODEC_OFFSET).trim();
        const parts = rest.split(/\s+/);
        if (parts.length < 2) continue;

        const codec = parts[0] ?? '';
        let type: StreamInfoPid['type'];
        let programStr: string;

        // Detect type token: 'v' = video, 'a' = audio, otherwise data
        if (parts[1] === 'v') {
            type = 'video';
            programStr = parts[2] ?? '0';
        } else if (parts[1] === 'a') {
            type = 'audio';
            programStr = parts[2] ?? '0';
        } else if (codec === 'data' || parts[1] !== undefined && !isNaN(parseInt(parts[1], 10))) {
            type = 'data';
            // When there's no type token, program number is parts[1]
            programStr = parts[1] ?? '0';
        } else {
            type = 'other';
            programStr = parts[2] ?? parts[1] ?? '0';
        }

        const program = parseInt(programStr, 10);

        pids.push({ pid, codec, type, program: isNaN(program) ? 0 : program });
    }

    return pids;
}

/**
 * Group parsed PID entries by program number.
 *
 * @param pids - Array of parsed PID entries from parseStreamInfo()
 * @param vctName - Optional channel guide name to attach to programs
 * @returns Array of programs with their PIDs grouped together
 */
export function groupStreamInfoByProgram(
    pids: StreamInfoPid[],
    vctName?: string,
): ParsedProgram[] {
    if (pids.length === 0) {
        return [];
    }

    const programMap = new Map<number, ParsedProgram>();

    for (const pid of pids) {
        const existing = programMap.get(pid.program);
        if (existing !== undefined) {
            existing.pids.push(pid);
        } else {
            programMap.set(pid.program, {
                programNumber: pid.program,
                name: vctName ?? '',
                pids: [pid],
            });
        }
    }

    return Array.from(programMap.values()).sort((a, b) => a.programNumber - b.programNumber);
}

/**
 * Parse key=value plain-text into a Map.
 * Lines without '=' are silently skipped.
 *
 * @param rawText - Raw key=value text
 * @returns Map of key → value strings
 */
function parseKeyValueText(rawText: string): Map<string, string> {
    const map = new Map<string, string>();

    if (!rawText || rawText.trim() === '') {
        return map;
    }

    for (const line of rawText.split('\n')) {
        const eqIdx = line.indexOf('=');
        if (eqIdx === -1) continue;
        const key = line.slice(0, eqIdx).trim();
        const value = line.slice(eqIdx + 1).trim();
        if (key) {
            map.set(key, value);
        }
    }

    return map;
}

/**
 * Parse the plain-text /tuner{N}/atsc3/plpinfo response.
 *
 * @param rawText - Raw key=value text from the device (or empty string on 404)
 * @returns Parsed PLP info with null values for absent fields
 */
export function parseAtsc3Plp(rawText: string): Atsc3PlpInfo {
    const kv = parseKeyValueText(rawText);

    const plpIdStr = kv.get('plpid');
    const plpTypeStr = kv.get('plptype');
    const snrStr = kv.get('snr');
    const fecType = kv.get('fectype') ?? null;

    return {
        plpId: plpIdStr !== undefined ? parseInt(plpIdStr, 10) : null,
        plpType: plpTypeStr !== undefined ? parseInt(plpTypeStr, 10) : null,
        snrDb: snrStr !== undefined ? parseFloat(snrStr) : null,
        fecType,
    };
}

/**
 * Parse the plain-text /tuner{N}/atsc3/l1info response.
 *
 * @param rawText - Raw key=value text from the device (or empty string on 404)
 * @returns Parsed L1 info with null values for absent fields
 */
export function parseAtsc3L1(rawText: string): Atsc3L1Info {
    const kv = parseKeyValueText(rawText);

    return {
        fftSize: kv.get('fftsize') ?? null,
        gi: kv.get('gi') ?? null,
        pp: kv.get('pp') ?? null,
        l1bMod: kv.get('l1bmod') ?? null,
        l1dMod: kv.get('l1dmod') ?? null,
    };
}

/**
 * Parse the plain-text /tuner{N}/status response to determine lock type.
 *
 * @param rawText - Raw key=value text from the device
 * @returns Parsed lock status
 */
export function parseTunerLockStatus(rawText: string): TunerLockStatus {
    const kv = parseKeyValueText(rawText);

    const ssStr = kv.get('ss');
    const snqStr = kv.get('snq');
    const seqStr = kv.get('seq');

    return {
        lock: kv.get('lock') ?? null,
        ss: ssStr !== undefined ? parseInt(ssStr, 10) : null,
        snq: snqStr !== undefined ? parseInt(snqStr, 10) : null,
        seq: seqStr !== undefined ? parseInt(seqStr, 10) : null,
    };
}

/**
 * Determine the signal quality tier for a given value and metric type.
 *
 * @param value - Signal value 0–100, or null when idle
 * @param metric - Which signal metric this value represents
 * @returns Quality tier: 'good', 'fair', 'poor', or 'idle' when null
 */
export function getSignalQuality(value: number | null, metric: 'SS' | 'SNQ' | 'SEQ'): SignalQuality {
    if (value === null) {
        return 'idle';
    }

    const thresholds = SIGNAL_THRESHOLDS[metric];

    if (value >= thresholds.green) {
        return 'good';
    }
    if (value >= thresholds.yellow) {
        return 'fair';
    }
    return 'poor';
}

/**
 * Format an SSE event as RFC 8895 wire format.
 *
 * Output format:
 * ```
 * event: <eventName>\n
 * data: <json>\n
 * \n
 * ```
 *
 * @param eventName - SSE event name (e.g. "signal", "ping")
 * @param data - Event payload object (serialized to JSON)
 * @returns Formatted SSE event string ready to enqueue
 */
export function formatSseEvent(eventName: string, data: object): string {
    return `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
}
