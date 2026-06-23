/**
 * Unit tests for signal-parsers-program-list.ts
 *
 * Tests cover:
 *   - isProgramListingFormat: detection heuristic for both formats and edge cases
 *   - parseProgramListing: parsing of real FLEX 4K output and edge cases
 *   - Integration: verifying both parsers produce correct results for their format
 */

import { describe, it, expect } from 'vitest';
import { isProgramListingFormat, parseProgramListing } from './signal-parsers-program-list';
import { parseStreamInfo, groupStreamInfoByProgram } from './signal-parsers';

// =============================================================================
// Real-world test fixtures
// =============================================================================

/**
 * Real FLEX 4K program-listing output (5 programs + tsid line).
 */
const FLEX4K_PROGRAM_LISTING = [
    '3: 15.1 WKOFCBS',
    '4: 5.2 Charge!',
    '5: 5.1 ROAR',
    '6: 3.1 WSTMNBC',
    '7: 3.3 Comet',
    'tsid=0x089B',
].join('\n');

/**
 * Standard PID-listing output from an older HDHomeRun device.
 */
const STANDARD_PID_LISTING = [
    '481: mpeg2video v 1',
    '482: ac3 a 1 0x81',
].join('\n');

// =============================================================================
// isProgramListingFormat
// =============================================================================

describe('isProgramListingFormat', () => {
    it('returns true for FLEX 4K program-listing format', () => {
        expect(isProgramListingFormat(FLEX4K_PROGRAM_LISTING)).toBe(true);
    });

    it('returns false for standard PID-listing format', () => {
        expect(isProgramListingFormat(STANDARD_PID_LISTING)).toBe(false);
    });

    it('returns false for empty string', () => {
        expect(isProgramListingFormat('')).toBe(false);
    });

    it('returns false for whitespace-only string', () => {
        expect(isProgramListingFormat('   \n   \t  ')).toBe(false);
    });

    it('returns true when leading lines are tsid= or blank (skips them)', () => {
        // tsid before the program list — real device output variation
        const input = 'tsid=0x089B\n3: 15.1 WKOFCBS\n4: 5.2 Charge!\n';
        expect(isProgramListingFormat(input)).toBe(true);
    });

    it('returns false when leading lines are tsid= or blank but body is PID format', () => {
        const input = '\n\n481: mpeg2video v 1\n482: ac3 a 1\n';
        expect(isProgramListingFormat(input)).toBe(false);
    });

    it('returns false for all known PID codec names as first token', () => {
        const pidLines: string[] = [
            '100: mpeg2video v 1',
            '101: ac3 a 1',
            '102: mpeg4aac a 1',
            '103: data 1',
            '104: h264 v 1',
            '105: hevc v 1',
            '106: eac3 a 1',
            '107: mp3 a 1',
        ];
        for (const line of pidLines) {
            expect(isProgramListingFormat(line)).toBe(false);
        }
    });

    it('returns false for a string with no colon', () => {
        expect(isProgramListingFormat('no colon here at all')).toBe(false);
    });

    it('returns false for unknown non-guide-number first token', () => {
        // e.g. a future codec or malformed line — should default to PID format
        expect(isProgramListingFormat('100: unknowncodec v 1')).toBe(false);
    });
});

// =============================================================================
// parseProgramListing
// =============================================================================

describe('parseProgramListing', () => {
    it('parses real FLEX 4K output with 5 programs', () => {
        const result = parseProgramListing(FLEX4K_PROGRAM_LISTING);

        expect(result).toHaveLength(5);

        expect(result[0]).toEqual({
            programNumber: 3,
            guideNumber: '15.1',
            name: 'WKOFCBS',
            pids: [],
        });
        expect(result[1]).toEqual({
            programNumber: 4,
            guideNumber: '5.2',
            name: 'Charge!',
            pids: [],
        });
        expect(result[2]).toEqual({
            programNumber: 5,
            guideNumber: '5.1',
            name: 'ROAR',
            pids: [],
        });
        expect(result[3]).toEqual({
            programNumber: 6,
            guideNumber: '3.1',
            name: 'WSTMNBC',
            pids: [],
        });
        expect(result[4]).toEqual({
            programNumber: 7,
            guideNumber: '3.3',
            name: 'Comet',
            pids: [],
        });
    });

    it('handles multi-word guide names', () => {
        const input = '10: 4.1 NBC News Channel\n';
        const result = parseProgramListing(input);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
            programNumber: 10,
            guideNumber: '4.1',
            name: 'NBC News Channel',
            pids: [],
        });
    });

    it('handles a guide name that is a single word', () => {
        const input = '5: 5.1 ROAR\n';
        const result = parseProgramListing(input);

        expect(result[0]?.name).toBe('ROAR');
    });

    it('handles a program entry with no guide name (empty name)', () => {
        const input = '5: 5.1\n';
        const result = parseProgramListing(input);

        expect(result).toHaveLength(1);
        expect(result[0]?.guideNumber).toBe('5.1');
        expect(result[0]?.name).toBe('');
    });

    it('filters out tsid= lines', () => {
        const input = '6: 3.1 WSTMNBC\ntsid=0x089B\n7: 3.3 Comet\n';
        const result = parseProgramListing(input);

        expect(result).toHaveLength(2);
        expect(result.every((program) => program.guideNumber !== undefined)).toBe(true);
    });

    it('returns empty array for empty string', () => {
        expect(parseProgramListing('')).toEqual([]);
    });

    it('returns empty array for whitespace-only string', () => {
        expect(parseProgramListing('   \n  \t  ')).toEqual([]);
    });

    it('skips blank lines', () => {
        const input = '\n\n3: 15.1 WKOFCBS\n\n4: 5.2 Charge!\n\n';
        const result = parseProgramListing(input);

        expect(result).toHaveLength(2);
    });

    it('skips malformed lines (no colon)', () => {
        const input = 'not a valid line\n3: 15.1 WKOFCBS\n';
        const result = parseProgramListing(input);

        expect(result).toHaveLength(1);
        expect(result[0]?.programNumber).toBe(3);
    });

    it('skips lines with non-numeric program numbers', () => {
        const input = 'abc: 15.1 WKOFCBS\n3: 5.1 ROAR\n';
        const result = parseProgramListing(input);

        expect(result).toHaveLength(1);
        expect(result[0]?.programNumber).toBe(3);
    });

    it('skips lines where token after colon is not a guide number', () => {
        // PID-format lines mixed in should be ignored
        const input = '481: mpeg2video v 1\n3: 15.1 WKOFCBS\n';
        const result = parseProgramListing(input);

        expect(result).toHaveLength(1);
        expect(result[0]?.programNumber).toBe(3);
    });

    it('all returned programs have empty pids arrays', () => {
        const result = parseProgramListing(FLEX4K_PROGRAM_LISTING);
        expect(result.every((program) => program.pids.length === 0)).toBe(true);
    });

    it('preserves order of programs as they appear in the response', () => {
        const result = parseProgramListing(FLEX4K_PROGRAM_LISTING);
        const programNumbers = result.map((program) => program.programNumber);
        expect(programNumbers).toEqual([3, 4, 5, 6, 7]);
    });
});

// =============================================================================
// Format detection integration
// =============================================================================

describe('format detection integration', () => {
    it('program-list format: parseProgramListing returns correct count and structure', () => {
        expect(isProgramListingFormat(FLEX4K_PROGRAM_LISTING)).toBe(true);

        const programs = parseProgramListing(FLEX4K_PROGRAM_LISTING);
        expect(programs).toHaveLength(5);
        for (const program of programs) {
            expect(program.guideNumber).toMatch(/^\d+\.\d+$/);
            expect(program.pids).toEqual([]);
        }
    });

    it('PID format: groupStreamInfoByProgram returns correct count and structure', () => {
        const pidListing = [
            '481: mpeg2video v 1',
            '482: ac3 a 1 0x81',
            '483: ac3 a 1 0x82',
            '484: mpeg2video v 2',
            '485: ac3 a 2 0x81',
        ].join('\n');

        expect(isProgramListingFormat(pidListing)).toBe(false);

        const pids = parseStreamInfo(pidListing);
        const programs = groupStreamInfoByProgram(pids, 'KPIX');

        expect(programs).toHaveLength(2);
        expect(programs[0]?.programNumber).toBe(1);
        expect(programs[0]?.pids.length).toBeGreaterThan(0);
        // PID format does not populate guideNumber
        expect(programs[0]?.guideNumber).toBeUndefined();
    });

    it('each format uses the correct parser with no cross-contamination', () => {
        // Program-list format should NOT be fed to PID parser
        const programListPrograms = parseProgramListing(FLEX4K_PROGRAM_LISTING);
        expect(programListPrograms.every((program) => program.guideNumber !== undefined)).toBe(true);

        // PID format should NOT be fed to program-list parser
        const pidListPrograms = parseProgramListing(STANDARD_PID_LISTING);
        // The PID lines have no guide-number token — they will be skipped
        expect(pidListPrograms).toEqual([]);
    });
});
