/**
 * Unit tests for signal-parsers.ts
 * All functions are pure — no mocking required.
 */

import { describe, it, expect } from 'vitest';
import {
    parseStatusJson,
    parseStreamInfo,
    groupStreamInfoByProgram,
    parseAtsc3Plp,
    parseAtsc3L1,
    parseTunerLockStatus,
    getSignalQuality,
    formatSseEvent,
    SIGNAL_THRESHOLDS,
} from './signal-parsers';
import type { TunerStatusResponse } from './types';

// =============================================================================
// parseStatusJson
// =============================================================================

describe('parseStatusJson', () => {
    const activeEntry = {
        Resource: 'tuner0',
        VctNumber: '5.1',
        VctName: 'KPIX',
        Frequency: 695000000,
        SignalStrengthPercent: 83,
        SignalQualityPercent: 90,
        SymbolQualityPercent: 100,
    };

    const idleEntry = { Resource: 'tuner1' };

    const statusResponse: TunerStatusResponse = [activeEntry, idleEntry];

    it('returns the matching active entry', () => {
        const result = parseStatusJson(statusResponse, 'tuner0');
        expect(result).toEqual(activeEntry);
    });

    it('returns the matching idle entry', () => {
        const result = parseStatusJson(statusResponse, 'tuner1');
        expect(result).toEqual(idleEntry);
    });

    it('returns null when resource not found', () => {
        const result = parseStatusJson(statusResponse, 'tuner99');
        expect(result).toBeNull();
    });

    it('returns null for malformed input (not an array)', () => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- testing malformed input
        const result = parseStatusJson(null as any, 'tuner0');
        expect(result).toBeNull();
    });

    it('returns null for empty array', () => {
        const result = parseStatusJson([], 'tuner0');
        expect(result).toBeNull();
    });
});

// =============================================================================
// parseStreamInfo
// =============================================================================

describe('parseStreamInfo', () => {
    it('parses standard multi-program streaminfo output', () => {
        const raw = [
            '481: mpeg2video v 1',
            '482: ac3 a 1 0x81',
            '483: ac3 a 1 0x82',
            '484: mpeg2video v 2',
            '485: ac3 a 2 0x81',
        ].join('\n');

        const result = parseStreamInfo(raw);

        expect(result).toHaveLength(5);
        expect(result[0]).toEqual({ pid: 481, codec: 'mpeg2video', type: 'video', program: 1 });
        expect(result[1]).toEqual({ pid: 482, codec: 'ac3', type: 'audio', program: 1 });
        expect(result[2]).toEqual({ pid: 483, codec: 'ac3', type: 'audio', program: 1 });
        expect(result[3]).toEqual({ pid: 484, codec: 'mpeg2video', type: 'video', program: 2 });
        expect(result[4]).toEqual({ pid: 485, codec: 'ac3', type: 'audio', program: 2 });
    });

    it('parses a single PID line', () => {
        const result = parseStreamInfo('100: mpeg4aac a 1');
        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({ pid: 100, codec: 'mpeg4aac', type: 'audio', program: 1 });
    });

    it('parses data PID (no type token)', () => {
        const result = parseStreamInfo('484: data 1 0x100');
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({ pid: 484, codec: 'data', type: 'data', program: 1 });
    });

    it('returns empty array for empty string', () => {
        expect(parseStreamInfo('')).toEqual([]);
    });

    it('returns empty array for whitespace-only string', () => {
        expect(parseStreamInfo('   \n  ')).toEqual([]);
    });

    it('skips malformed lines gracefully', () => {
        const raw = [
            '481: mpeg2video v 1',  // good
            'not-a-pid-line',       // bad — no colon
            '482: ac3 a 1 0x81',    // good
        ].join('\n');

        const result = parseStreamInfo(raw);
        expect(result).toHaveLength(2);
        expect(result[0]?.pid).toBe(481);
        expect(result[1]?.pid).toBe(482);
    });

    it('skips lines with non-numeric PIDs', () => {
        const result = parseStreamInfo('abc: mpeg2video v 1');
        expect(result).toHaveLength(0);
    });
});

// =============================================================================
// groupStreamInfoByProgram
// =============================================================================

describe('groupStreamInfoByProgram', () => {
    it('groups PIDs by program number', () => {
        const pids = [
            { pid: 481, codec: 'mpeg2video', type: 'video' as const, program: 1 },
            { pid: 482, codec: 'ac3', type: 'audio' as const, program: 1 },
            { pid: 484, codec: 'mpeg2video', type: 'video' as const, program: 2 },
        ];

        const result = groupStreamInfoByProgram(pids, 'KPIX');

        expect(result).toHaveLength(2);
        expect(result[0]?.programNumber).toBe(1);
        expect(result[0]?.name).toBe('KPIX');
        expect(result[0]?.pids).toHaveLength(2);
        expect(result[1]?.programNumber).toBe(2);
        expect(result[1]?.pids).toHaveLength(1);
    });

    it('returns empty array for empty pids', () => {
        expect(groupStreamInfoByProgram([])).toEqual([]);
    });

    it('uses empty string for name when vctName is undefined', () => {
        const pids = [{ pid: 100, codec: 'mpeg2video', type: 'video' as const, program: 1 }];
        const result = groupStreamInfoByProgram(pids);
        expect(result[0]?.name).toBe('');
    });

    it('sorts programs by program number ascending', () => {
        const pids = [
            { pid: 484, codec: 'mpeg2video', type: 'video' as const, program: 3 },
            { pid: 481, codec: 'mpeg2video', type: 'video' as const, program: 1 },
            { pid: 483, codec: 'mpeg2video', type: 'video' as const, program: 2 },
        ];
        const result = groupStreamInfoByProgram(pids);
        expect(result.map((prog) => prog.programNumber)).toEqual([1, 2, 3]);
    });
});

// =============================================================================
// parseAtsc3Plp
// =============================================================================

describe('parseAtsc3Plp', () => {
    it('parses valid key-value PLP response', () => {
        const raw = 'plpid=0\nplptype=1\nsnr=32.5\nfectype=ldpc\n';
        const result = parseAtsc3Plp(raw);

        expect(result).toEqual({
            plpId: 0,
            plpType: 1,
            snrDb: 32.5,
            fecType: 'ldpc',
        });
    });

    it('handles partial data (missing fields are null)', () => {
        const result = parseAtsc3Plp('plpid=2\n');
        expect(result.plpId).toBe(2);
        expect(result.plpType).toBeNull();
        expect(result.snrDb).toBeNull();
        expect(result.fecType).toBeNull();
    });

    it('returns all nulls for empty string (404 response)', () => {
        const result = parseAtsc3Plp('');
        expect(result).toEqual({ plpId: null, plpType: null, snrDb: null, fecType: null });
    });

    it('parses float snr correctly', () => {
        const result = parseAtsc3Plp('snr=28.7\n');
        expect(result.snrDb).toBeCloseTo(28.7);
    });
});

// =============================================================================
// parseAtsc3L1
// =============================================================================

describe('parseAtsc3L1', () => {
    it('parses valid key-value L1 response', () => {
        const raw = 'fftsize=16K\ngi=1/192\npp=PP4\nl1bmod=bpsk\nl1dmod=qam16\n';
        const result = parseAtsc3L1(raw);

        expect(result).toEqual({
            fftSize: '16K',
            gi: '1/192',
            pp: 'PP4',
            l1bMod: 'bpsk',
            l1dMod: 'qam16',
        });
    });

    it('handles partial data', () => {
        const result = parseAtsc3L1('fftsize=32K\n');
        expect(result.fftSize).toBe('32K');
        expect(result.gi).toBeNull();
        expect(result.pp).toBeNull();
        expect(result.l1bMod).toBeNull();
        expect(result.l1dMod).toBeNull();
    });

    it('returns all nulls for empty string', () => {
        const result = parseAtsc3L1('');
        expect(result).toEqual({
            fftSize: null, gi: null, pp: null, l1bMod: null, l1dMod: null,
        });
    });
});

// =============================================================================
// parseTunerLockStatus
// =============================================================================

describe('parseTunerLockStatus', () => {
    it('parses ATSC 3.0 lock correctly', () => {
        const raw = 'lock=atsc3-t2\nss=83\nsnq=90\nseq=100\nbps=18974560\npps=71\n';
        const result = parseTunerLockStatus(raw);

        expect(result.lock).toBe('atsc3-t2');
        expect(result.ss).toBe(83);
        expect(result.snq).toBe(90);
        expect(result.seq).toBe(100);
    });

    it('parses ATSC 1.0 lock correctly', () => {
        const result = parseTunerLockStatus('lock=atsc1-t\nss=75\nsnq=85\nseq=100\n');
        expect(result.lock).toBe('atsc1-t');
    });

    it('parses no-lock (idle tuner)', () => {
        const result = parseTunerLockStatus('lock=none\nss=0\nsnq=0\nseq=0\n');
        expect(result.lock).toBe('none');
        expect(result.ss).toBe(0);
    });

    it('returns null lock for empty string', () => {
        const result = parseTunerLockStatus('');
        expect(result.lock).toBeNull();
        expect(result.ss).toBeNull();
    });
});

// =============================================================================
// getSignalQuality
// =============================================================================

describe('getSignalQuality', () => {
    it('returns idle when value is null', () => {
        expect(getSignalQuality(null, 'SS')).toBe('idle');
        expect(getSignalQuality(null, 'SNQ')).toBe('idle');
        expect(getSignalQuality(null, 'SEQ')).toBe('idle');
    });

    describe('SS thresholds', () => {
        it('returns good when SS > 70', () => {
            expect(getSignalQuality(71, 'SS')).toBe('good');
            expect(getSignalQuality(100, 'SS')).toBe('good');
        });

        it('returns fair when SS is 40–70', () => {
            expect(getSignalQuality(70, 'SS')).toBe('good'); // boundary: >= green
            expect(getSignalQuality(69, 'SS')).toBe('fair');
            expect(getSignalQuality(40, 'SS')).toBe('fair');
        });

        it('returns poor when SS < 40', () => {
            expect(getSignalQuality(39, 'SS')).toBe('poor');
            expect(getSignalQuality(0, 'SS')).toBe('poor');
        });
    });

    describe('SNQ thresholds', () => {
        it('returns good when SNQ > 70', () => {
            expect(getSignalQuality(71, 'SNQ')).toBe('good');
        });

        it('returns fair when SNQ is 40–70', () => {
            expect(getSignalQuality(55, 'SNQ')).toBe('fair');
        });

        it('returns poor when SNQ < 40', () => {
            expect(getSignalQuality(30, 'SNQ')).toBe('poor');
        });
    });

    describe('SEQ thresholds', () => {
        it('returns good when SEQ = 100', () => {
            expect(getSignalQuality(100, 'SEQ')).toBe('good');
        });

        it('returns fair when SEQ is 80–99', () => {
            expect(getSignalQuality(99, 'SEQ')).toBe('fair');
            expect(getSignalQuality(80, 'SEQ')).toBe('fair');
        });

        it('returns poor when SEQ < 80', () => {
            expect(getSignalQuality(79, 'SEQ')).toBe('poor');
            expect(getSignalQuality(50, 'SEQ')).toBe('poor');
            expect(getSignalQuality(0, 'SEQ')).toBe('poor');
        });
    });

    it('SIGNAL_THRESHOLDS constants match expected values', () => {
        expect(SIGNAL_THRESHOLDS.SS.green).toBe(70);
        expect(SIGNAL_THRESHOLDS.SS.yellow).toBe(40);
        expect(SIGNAL_THRESHOLDS.SEQ.green).toBe(100);
        expect(SIGNAL_THRESHOLDS.SEQ.yellow).toBe(80);
    });
});

// =============================================================================
// formatSseEvent
// =============================================================================

describe('formatSseEvent', () => {
    it('formats event in RFC 8895 wire format', () => {
        const result = formatSseEvent('signal', { foo: 'bar', n: 42 });
        expect(result).toBe('event: signal\ndata: {"foo":"bar","n":42}\n\n');
    });

    it('ends with double newline', () => {
        const result = formatSseEvent('ping', {});
        expect(result.endsWith('\n\n')).toBe(true);
    });

    it('separates event and data with newlines', () => {
        const result = formatSseEvent('test', { x: 1 });
        const lines = result.split('\n');
        expect(lines[0]).toBe('event: test');
        expect(lines[1]).toBe('data: {"x":1}');
        expect(lines[2]).toBe('');
        expect(lines[3]).toBe('');
    });

    it('serializes complex objects correctly', () => {
        const payload = { tunerId: 1, ss: 83, idle: false, vctName: 'KPIX' };
        const result = formatSseEvent('signal', payload);
        const dataLine = result.split('\n')[1];
        expect(dataLine).toBe(`data: ${JSON.stringify(payload)}`);
    });
});
