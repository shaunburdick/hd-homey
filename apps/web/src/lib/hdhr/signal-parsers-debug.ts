/**
 * Debug status parser for HDHomeRun native protocol `/tuner{N}/debug` responses.
 *
 * Extracted from `signal-parsers.ts` to keep that file within the 500-line limit.
 * All functions are pure (no side effects) and operate on plain strings.
 *
 * @module signal-parsers-debug
 */

// =============================================================================
// Debug Status Types
// =============================================================================

/**
 * Parsed debug status from the HDHomeRun native protocol `/tuner{N}/debug` variable.
 *
 * The raw text is a multi-line format with prefix labels on each line:
 * ```
 * tun: ch=qam:33 lock=qam256 ss=84 snq=88 seq=100 dbg=22081-6930
 * dev: resync=0 overflow=0
 * ts:  bps=38809216 ut=94 te=0 miss=0 crc=0
 * flt: bps=38809216
 * net: pps=0 err=0 stop=0
 * ```
 *
 * All fields are optional — absent fields remain `undefined`.
 */
export interface DebugStatus {
    // tun: line — tuner-level signal diagnostics
    /** RF channel string, e.g. "qam:33" */
    ch?: string;
    /** Lock type, e.g. "qam256" */
    lock?: string;
    /** Signal strength percent 0–100 */
    ss?: number;
    /** SNR quality percent 0–100 */
    snq?: number;
    /** Symbol quality percent 0–100 */
    seq?: number;
    /** Raw debug counter string, e.g. "22081-6930" */
    dbg?: string;

    // dev: line — device-level error counters
    /** Resync events since channel change */
    resync?: number;
    /** Buffer overflow events since channel change */
    overflow?: number;

    // ts: line — transport stream statistics
    /** Transport stream bitrate in bits per second */
    bps?: number;
    /** Transport stream utilization percent (0–100) */
    ut?: number;
    /** Transport errors (continuity counter errors) */
    te?: number;
    /** Missed packets (PCR-based) */
    miss?: number;
    /** CRC errors in transport stream */
    crc?: number;

    // flt: line — filtered output statistics
    /** Filtered output bitrate in bits per second */
    filteredBps?: number;

    // net: line — network delivery statistics
    /** Network packets per second sent to subscribers */
    pps?: number;
    /** Network delivery errors */
    netErrors?: number;
    /** Stream stop events */
    stop?: number;
}

/**
 * SSE event emitted per active tuner per poll cycle with debug counters.
 * Best-effort — may be absent for a given cycle if native protocol fails.
 */
export interface DebugSseEvent {
    /** Discriminator for SSE event multiplexing */
    event: 'debug';
    /** HD Homey database tuner ID */
    tunerId: number;
    /** Parsed debug status counters */
    debug: DebugStatus;
}

// =============================================================================
// Parsing Helpers
// =============================================================================

/**
 * Parse key=value pairs from a single debug line (after stripping the prefix).
 *
 * @param line - Line content after the prefix (e.g. "ch=qam:33 lock=qam256 ss=84")
 * @returns Map of key → string value
 */
function parseDebugLine(line: string): Map<string, string> {
    const result = new Map<string, string>();
    for (const token of line.trim().split(/\s+/)) {
        const eqIdx = token.indexOf('=');
        if (eqIdx === -1 || eqIdx === 0) {
            continue;
        }
        const key = token.slice(0, eqIdx);
        const value = token.slice(eqIdx + 1);
        if (key !== '' && value !== '') {
            result.set(key, value);
        }
    }
    return result;
}

/**
 * Parse an integer from a key-value map, returning undefined if absent or NaN.
 *
 * @param kv - Key-value map from a debug line
 * @param key - Key to look up
 * @returns Parsed integer or undefined
 */
function getInt(kv: Map<string, string>, key: string): number | undefined {
    const val = kv.get(key);
    if (val === undefined) {
        return undefined;
    }
    const n = parseInt(val, 10);
    return isNaN(n) ? undefined : n;
}

/**
 * Apply `tun:` line fields onto the status object.
 *
 * @param kv - Parsed key-value map from the tun line
 * @param status - Status object to update in place
 */
function applyTunLine(kv: Map<string, string>, status: DebugStatus): void {
    const ch = kv.get('ch');
    if (ch !== undefined) {
        status.ch = ch;
    }
    const lock = kv.get('lock');
    if (lock !== undefined) {
        status.lock = lock;
    }
    const dbg = kv.get('dbg');
    if (dbg !== undefined) {
        status.dbg = dbg;
    }
    const ss = getInt(kv, 'ss');
    if (ss !== undefined) {
        status.ss = ss;
    }
    const snq = getInt(kv, 'snq');
    if (snq !== undefined) {
        status.snq = snq;
    }
    const seq = getInt(kv, 'seq');
    if (seq !== undefined) {
        status.seq = seq;
    }
}

/**
 * Apply `dev:` line fields onto the status object.
 *
 * @param kv - Parsed key-value map from the dev line
 * @param status - Status object to update in place
 */
function applyDevLine(kv: Map<string, string>, status: DebugStatus): void {
    const resync = getInt(kv, 'resync');
    if (resync !== undefined) {
        status.resync = resync;
    }
    const overflow = getInt(kv, 'overflow');
    if (overflow !== undefined) {
        status.overflow = overflow;
    }
}

/**
 * Apply `ts:` line fields onto the status object.
 *
 * @param kv - Parsed key-value map from the ts line
 * @param status - Status object to update in place
 */
function applyTsLine(kv: Map<string, string>, status: DebugStatus): void {
    const bps = getInt(kv, 'bps');
    if (bps !== undefined) {
        status.bps = bps;
    }
    const ut = getInt(kv, 'ut');
    if (ut !== undefined) {
        status.ut = ut;
    }
    const te = getInt(kv, 'te');
    if (te !== undefined) {
        status.te = te;
    }
    const miss = getInt(kv, 'miss');
    if (miss !== undefined) {
        status.miss = miss;
    }
    const crc = getInt(kv, 'crc');
    if (crc !== undefined) {
        status.crc = crc;
    }
}

/**
 * Apply `flt:` line fields onto the status object.
 *
 * @param kv - Parsed key-value map from the flt line
 * @param status - Status object to update in place
 */
function applyFltLine(kv: Map<string, string>, status: DebugStatus): void {
    const filteredBps = getInt(kv, 'bps');
    if (filteredBps !== undefined) {
        status.filteredBps = filteredBps;
    }
}

/**
 * Apply `net:` line fields onto the status object.
 *
 * @param kv - Parsed key-value map from the net line
 * @param status - Status object to update in place
 */
function applyNetLine(kv: Map<string, string>, status: DebugStatus): void {
    const pps = getInt(kv, 'pps');
    if (pps !== undefined) {
        status.pps = pps;
    }
    const netErrors = getInt(kv, 'err');
    if (netErrors !== undefined) {
        status.netErrors = netErrors;
    }
    const stop = getInt(kv, 'stop');
    if (stop !== undefined) {
        status.stop = stop;
    }
}

/**
 * Map of prefix label to the function that applies its fields to the status.
 * Unknown prefixes are silently skipped via Map lookup miss (returns undefined).
 */
const PREFIX_HANDLERS = new Map<string, (kv: Map<string, string>, status: DebugStatus) => void>([
    ['tun', applyTunLine],
    ['dev', applyDevLine],
    ['ts', applyTsLine],
    ['flt', applyFltLine],
    ['net', applyNetLine],
]);

// =============================================================================
// Public Parser
// =============================================================================

/**
 * Parse the plain-text `/tuner{N}/debug` response into a structured object.
 *
 * Lines are identified by their prefix label (`tun:`, `dev:`, `ts:`, `flt:`,
 * `net:`). Unknown prefix labels are silently skipped for forward compatibility.
 * Key=value pairs within each line are split on whitespace.
 *
 * @param rawText - Raw multi-line text from the device debug variable
 * @returns Parsed debug status. All fields are optional; absent fields are undefined.
 */
export function parseDebugStatus(rawText: string): DebugStatus {
    const status: DebugStatus = {};

    if (rawText.trim() === '') {
        return status;
    }

    for (const line of rawText.split('\n')) {
        const trimmed = line.trim();
        if (trimmed === '') {
            continue;
        }

        const colonIdx = trimmed.indexOf(':');
        if (colonIdx === -1) {
            continue;
        }

        const prefix = trimmed.slice(0, colonIdx).trim();
        const rest = trimmed.slice(colonIdx + 1);
        const handler = PREFIX_HANDLERS.get(prefix);

        if (handler !== undefined) {
            handler(parseDebugLine(rest), status);
        }
        // Unknown prefixes are silently ignored — forward compatibility
    }

    return status;
}
