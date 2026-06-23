/**
 * Program-list format parser for HDHomeRun streaminfo responses.
 *
 * Some HDHomeRun devices (FLEX 4K, SCRIBE 4K, and other ATSC devices) return a
 * **program listing** from `/tuner{N}/streaminfo` when no specific program is
 * selected, rather than the PID-level listing that older devices return.
 *
 * Program-listing format example:
 * ```
 * 3: 15.1 WKOFCBS
 * 4: 5.2 Charge!
 * 5: 5.1 ROAR
 * 6: 3.1 WSTMNBC
 * 7: 3.3 Comet
 * tsid=0x089B
 * ```
 *
 * PID-listing format example:
 * ```
 * 481: mpeg2video v 1
 * 482: ac3 a 1 0x81
 * ```
 *
 * This module exports format detection and parsing utilities that are
 * consumed by `signal-poller-streaminfo.ts`.
 *
 * @module signal-parsers-program-list
 */

import type { ParsedProgram } from './types';

/**
 * Codec names recognised in standard PID-listing streaminfo output.
 * Used by the format heuristic to distinguish PID lines from program lines.
 */
const KNOWN_PID_CODECS = new Set([
    'mpeg2video',
    'ac3',
    'mpeg4aac',
    'data',
    'h264',
    'hevc',
    'eac3',
    'mp3',
]);

/** Pattern that matches a virtual channel number, e.g. "3.1" or "15.2" */
const GUIDE_NUMBER_RE = /^\d+\.\d+$/;

/**
 * Find the first data line that can be used to detect the response format.
 *
 * Skips blank lines and `tsid=...` lines, which appear in both formats.
 *
 * @param rawText - Raw streaminfo text from the device
 * @returns The first meaningful line, or null when the text has no data lines
 */
function firstDataLine(rawText: string): string | null {
    for (const line of rawText.split('\n')) {
        const trimmed = line.trim();
        if (trimmed === '' || trimmed.startsWith('tsid=')) {
            continue;
        }
        return trimmed;
    }
    return null;
}

/**
 * Detect whether a streaminfo response uses program-listing format.
 *
 * Heuristic: examine the first non-empty, non-tsid data line.
 * - If the token after `{num}: ` matches `/^\d+\.\d+$/` (guide number like "3.1"),
 *   it is program-listing format.
 * - If that token is a known codec name (mpeg2video, ac3, etc.), it is PID format.
 *
 * Returns false for empty or whitespace-only input and for any line that
 * does not match the expected structure.
 *
 * @param rawText - Raw plain-text response from `/tuner{N}/streaminfo`
 * @returns `true` when the text is program-listing format, `false` otherwise
 */
export function isProgramListingFormat(rawText: string): boolean {
    const line = firstDataLine(rawText);
    if (line === null) {
        return false;
    }

    const colonIdx = line.indexOf(':');
    if (colonIdx === -1) {
        return false;
    }

    const afterColon = line.slice(colonIdx + 1).trim();
    const firstToken = afterColon.split(/\s+/)[0] ?? '';

    if (firstToken === '') {
        return false;
    }

    // A guide number like "3.1" → program-listing format
    if (GUIDE_NUMBER_RE.test(firstToken)) {
        return true;
    }

    // A known codec like "mpeg2video" → PID-listing format
    if (KNOWN_PID_CODECS.has(firstToken)) {
        return false;
    }

    // Unknown token — default to PID format to avoid misclassification
    return false;
}

/**
 * Parse a single program-listing line into its components.
 *
 * Line format: `{program_num}: {guide_number} {guide_name…}`
 *
 * @param line - Raw line from the program-listing text
 * @returns Parsed components or `null` when the line is malformed / should be skipped
 */
function parseProgramListingLine(
    line: string,
): { programNumber: number; guideNumber: string; name: string } | null {
    const trimmed = line.trim();

    // Skip blank lines and tsid metadata lines
    if (trimmed === '' || trimmed.startsWith('tsid=')) {
        return null;
    }

    const colonIdx = trimmed.indexOf(':');
    if (colonIdx === -1) {
        return null;
    }

    const programNumStr = trimmed.slice(0, colonIdx).trim();
    const programNumber = parseInt(programNumStr, 10);
    if (isNaN(programNumber)) {
        return null;
    }

    const afterColon = trimmed.slice(colonIdx + 1).trim();
    const parts = afterColon.split(/\s+/);

    // Minimum: guide number must be present
    const guideNumber = parts[0] ?? '';
    if (!GUIDE_NUMBER_RE.test(guideNumber)) {
        // Line does not have a guide-number token — skip as malformed
        return null;
    }

    // Everything after the guide number is the program name (may be multi-word)
    const name = parts.slice(1).join(' ');

    return { programNumber, guideNumber, name };
}

/**
 * Parse a program-listing format streaminfo response into `ParsedProgram` entries.
 *
 * Each returned program has:
 * - `programNumber` — the integer before the colon
 * - `guideNumber` — the virtual channel number (e.g. "3.1")
 * - `name` — the guide name (may be multi-word or empty string)
 * - `pids: []` — empty; PID details are not available in this format
 *
 * Lines that do not match the expected structure (blank lines, `tsid=...` lines,
 * and any line without a valid guide-number token) are silently skipped.
 *
 * @param rawText - Raw plain-text response from `/tuner{N}/streaminfo`
 * @returns Array of parsed programs in the order they appear in the response
 */
export function parseProgramListing(rawText: string): ParsedProgram[] {
    if (rawText.trim() === '') {
        return [];
    }

    const programs: ParsedProgram[] = [];

    for (const line of rawText.split('\n')) {
        const parsed = parseProgramListingLine(line);
        if (parsed !== null) {
            programs.push({
                programNumber: parsed.programNumber,
                guideNumber: parsed.guideNumber,
                name: parsed.name,
                pids: [],
            });
        }
    }

    return programs;
}
