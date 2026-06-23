/**
 * Signal parsing utilities for HDHomeRun device API responses.
 *
 * All functions in this module are pure (no side effects) and operate on
 * plain strings or objects. This makes them trivially unit-testable.
 *
 * Debug status parsing for the native protocol is in `signal-parsers-debug.ts`
 * (extracted to keep this file within the 500-line limit).
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
    ChannelInfo,
} from './types';

// Re-export debug types and parser from the dedicated module so callers have
// a single import point for all signal-parsing utilities.
export type { DebugStatus, DebugSseEvent } from './signal-parsers-debug';
export { parseDebugStatus } from './signal-parsers-debug';

// =============================================================================
// Rolling History Buffer Size
// =============================================================================

/**
 * Number of data points retained in the rolling signal history graph buffer.
 * At a 2-second poll interval, this gives 120 seconds (2 minutes) of history.
 */
export const MAX_HISTORY_POINTS = 60;

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

/** Color quality tier — maps to CSS class names and ARIA label suffixes */
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
    /**
     * Tuner lock type from /tuner{N}/status. E.g. "atsc3-t2", "atsc1-t", "8vsb", "none".
     * Undefined until the first lock-type poll completes. Absent when idle or on error.
     */
    lockType?: string;
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

/** Emitted alongside atsc3plp when ATSC 3.0 lock is detected. */
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
    /**
     * Tuner lock type from /tuner{N}/status. E.g. "atsc3-t2", "atsc1-t", "8vsb", "none".
     * Undefined until the first lock-type poll completes. Absent when idle or on error.
     */
    lockType?: string;
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
    if (!Array.isArray(json) || json.length === 0) {
        return null;
    }

    const entry = json.find((item) => item.Resource === resource);
    return entry ?? null;
}

/** Characters after the colon+space prefix in a streaminfo line */
const STREAMINFO_CODEC_OFFSET = 2;

/** Maps streaminfo type token to normalized PID type */
const TYPE_TOKEN_MAP = new Map<string, StreamInfoPid['type']>([
    ['v', 'video'],
    ['a', 'audio'],
]);

/** Determine the PID type and program number from the rest-of-line parts array. */
function parsePidTypeParts(
    codec: string,
    parts: string[],
): { type: StreamInfoPid['type']; programStr: string } {
    const token = parts[1];

    // Named type token ('v' or 'a')
    if (token !== undefined && TYPE_TOKEN_MAP.has(token)) {
        const type = TYPE_TOKEN_MAP.get(token) as StreamInfoPid['type'];
        return { type, programStr: parts[2] ?? '0' };
    }

    // Data: codec is 'data' or parts[1] is numeric program number
    const isNumericToken = token !== undefined && !isNaN(parseInt(token, 10));
    if (codec === 'data' || isNumericToken) {
        return { type: 'data', programStr: token ?? '0' };
    }

    return { type: 'other', programStr: parts[2] ?? token ?? '0' };
}

/**
 * Parse a single streaminfo line into a StreamInfoPid.
 * Returns null when the line is malformed or missing required fields.
 */
function parseStreamInfoLine(line: string): StreamInfoPid | null {
    const trimmed = line.trim();
    if (trimmed === '') {
        return null;
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) {
        return null;
    }

    const pidStr = trimmed.slice(0, colonIdx).trim();
    const pid = parseInt(pidStr, 10);
    if (isNaN(pid)) {
        return null;
    }

    const rest = trimmed.slice(colonIdx + STREAMINFO_CODEC_OFFSET).trim();
    const parts = rest.split(/\s+/);
    if (parts.length < 2) {
        return null;
    }

    const codec = parts[0] ?? '';
    const { type, programStr } = parsePidTypeParts(codec, parts);
    const program = parseInt(programStr, 10);

    return { pid, codec, type, program: isNaN(program) ? 0 : program };
}

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
    if (rawText.trim() === '') {
        return [];
    }

    const pids: StreamInfoPid[] = [];

    for (const line of rawText.split('\n')) {
        const pid = parseStreamInfoLine(line);
        if (pid !== null) {
            pids.push(pid);
        }
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

    return Array.from(programMap.values()).sort(
        (progA, progB) => progA.programNumber - progB.programNumber,
    );
}

/**
 * Parse key=value plain-text into a Map. Lines without '=' are silently skipped.
 *
 * @param rawText - Raw key=value text
 * @returns Map of key → value strings
 */
function parseKeyValueText(rawText: string): Map<string, string> {
    const map = new Map<string, string>();

    if (rawText === '' || rawText.trim() === '') {
        return map;
    }

    for (const line of rawText.split('\n')) {
        const eqIdx = line.indexOf('=');
        if (eqIdx === -1) {
            continue;
        }
        const key = line.slice(0, eqIdx).trim();
        const value = line.slice(eqIdx + 1).trim();
        if (key !== '') {
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
 * Output: `event: <name>\ndata: <json>\n\n`
 *
 * @param eventName - SSE event name (e.g. "signal", "ping")
 * @param data - Event payload object (serialized to JSON)
 * @returns Formatted SSE event string ready to enqueue
 */
export function formatSseEvent(eventName: string, data: object): string {
    return `event: ${eventName}\ndata: ${JSON.stringify(data)}\n\n`;
}

/**
 * Options for {@link createLineupFallbackProgram}.
 */
export interface LineupFallbackOptions {
    /** Current VctNumber from status.json, e.g. "3.1" */
    guideNumber: string;
    /** Channel guide name from status.json (optional) */
    vctName?: string;
    /** Parsed lineup.json array from the device */
    lineupData: ChannelInfo[];
}

/**
 * Create synthetic program entries from lineup.json data.
 *
 * Used as fallback when `/tuner{N}/streaminfo` returns 404 on newer HDHomeRun
 * models (FLEX 4K, SCRIBE 4K with firmware 20250815+). Cross-references the
 * tuner's current `VctNumber` against `GuideNumber` entries in lineup.json.
 *
 * Returns a single synthetic `ParsedProgram` with `programNumber: 0` (no real
 * MPEG program number available). PIDs use placeholder IDs: 0 for video, 1 for audio.
 *
 * @param options - Guide number, optional VCT name, and lineup data to search
 * @returns Synthetic ParsedProgram[] — one entry if matched, empty if no match
 */
export function createLineupFallbackProgram(options: LineupFallbackOptions): ParsedProgram[] {
    const { guideNumber, lineupData } = options;

    const entry = lineupData.find((item) => item.GuideNumber === guideNumber);
    if (entry === undefined) {
        return [];
    }

    const pids: StreamInfoPid[] = [];

    if (entry.VideoCodec !== undefined) {
        pids.push({ pid: 0, codec: `${entry.VideoCodec} video`, type: 'video', program: 0 });
    }

    if (entry.AudioCodec !== undefined) {
        pids.push({ pid: 1, codec: `${entry.AudioCodec} audio`, type: 'audio', program: 0 });
    }

    return [{ programNumber: 0, name: entry.GuideName, guideNumber: options.guideNumber, pids }];
}
