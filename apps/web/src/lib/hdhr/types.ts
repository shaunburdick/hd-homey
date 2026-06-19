export interface ChannelInfo {
    GuideNumber: string;
    GuideName: string;
    VideoCodec?: string;
    AudioCodec?: string;
    HD?: number;
    URL: string;
}

// =============================================================================
// Signal Monitoring Types (SPEC-015)
// =============================================================================

/**
 * Raw entry from HDHomeRun /status.json array.
 *
 * An active tuner includes all optional fields.
 * An idle tuner contains only `Resource`.
 *
 * Example (active):
 *   { Resource: "tuner0", VctNumber: "5.1", VctName: "KPIX",
 *     Frequency: 695000000, SignalStrengthPercent: 83,
 *     SignalQualityPercent: 90, SymbolQualityPercent: 100 }
 *
 * Example (idle):
 *   { Resource: "tuner1" }
 */
export interface TunerStatusEntry {
    /** Always present. E.g. "tuner0", "tuner1" */
    Resource: string;
    /** Virtual channel number. E.g. "5.1". Absent when idle. */
    VctNumber?: string;
    /** Guide name. E.g. "KPIX". Absent when idle. */
    VctName?: string;
    /** RF frequency in Hz. E.g. 695000000. Absent when idle. */
    Frequency?: number;
    /** Signal power level as integer 0–100. Absent when idle. */
    SignalStrengthPercent?: number;
    /** MER / SNR quality as integer 0–100. Absent when idle. */
    SignalQualityPercent?: number;
    /** Symbol error quality as integer 0–100. Absent when idle. */
    SymbolQualityPercent?: number;
}

/**
 * Full response from HDHomeRun /status.json — an array of per-slot entries.
 * Index position corresponds to tuner slot number.
 */
export type TunerStatusResponse = TunerStatusEntry[];

/**
 * Parsed PID entry from /tuner{N}/streaminfo plain-text response.
 *
 * Raw line format: `{pid}: {codec} {type} {program} [{extra}]`
 * Example raw lines:
 *   "481: mpeg2video v 1"
 *   "482: ac3 a 1 0x81"
 *   "483: ac3 a 1 0x82"
 *   "484: data 1 0x100"   ← note: no 'a'/'v' type token on data lines
 */
export interface StreamInfoPid {
    /** Decimal PID value. E.g. 481 */
    pid: number;
    /** Codec string. E.g. "mpeg2video", "ac3", "data", "mpeg4aac" */
    codec: string;
    /** Normalized PID type */
    type: 'video' | 'audio' | 'data' | 'other';
    /** Program number this PID belongs to */
    program: number;
}

/**
 * Stream info parsed and grouped by program number.
 * One entry per MPEG program found in the transport stream.
 */
export interface ParsedProgram {
    /** MPEG program number */
    programNumber: number;
    /** Program name from VctName (passed in externally, may be empty string) */
    name: string;
    /** All PIDs belonging to this program */
    pids: StreamInfoPid[];
}

/**
 * Parsed ATSC 3.0 PLP (Physical Layer Pipe) entry.
 *
 * Raw key=value format:
 *   plpid=0
 *   plptype=1
 *   snr=32.5
 *   fectype=ldpc
 *
 * All fields are null when not present or on parse error.
 */
export interface Atsc3PlpInfo {
    /** PLP identifier (integer) */
    plpId: number | null;
    /** PLP type code (integer) */
    plpType: number | null;
    /** Signal-to-noise ratio in dB (float) */
    snrDb: number | null;
    /** Forward error correction type. E.g. "ldpc" */
    fecType: string | null;
}

/**
 * Parsed ATSC 3.0 L1 signaling data.
 *
 * Raw key=value format:
 *   fftsize=16K
 *   gi=1/192
 *   pp=PP4
 *   l1bmod=bpsk
 *   l1dmod=qam16
 *
 * All fields are null when not present or on parse error.
 */
export interface Atsc3L1Info {
    /** FFT size. E.g. "16K", "32K" */
    fftSize: string | null;
    /** Guard interval. E.g. "1/192", "1/64" */
    gi: string | null;
    /** Pilot pattern. E.g. "PP4" */
    pp: string | null;
    /** L1-Basic modulation scheme. E.g. "bpsk" */
    l1bMod: string | null;
    /** L1-Detail modulation scheme. E.g. "qam16" */
    l1dMod: string | null;
}

/**
 * Parsed tuner lock status from /tuner{N}/status plain-text response.
 * Used to detect ATSC 3.0 lock (lock field contains "atsc3").
 *
 * Raw key=value format:
 *   lock=atsc3-t2
 *   ss=83
 *   snq=90
 *   seq=100
 *   bps=18974560
 *   pps=71
 */
export interface TunerLockStatus {
    /** Lock type string. E.g. "atsc3-t2", "atsc1-t", "none". */
    lock: string | null;
    /** Signal strength percent. Redundant with status.json, used as fallback. */
    ss: number | null;
    /** SNR quality percent */
    snq: number | null;
    /** Symbol quality percent */
    seq: number | null;
}
