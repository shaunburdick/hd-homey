/**
 * Unit tests for signal-poller.ts
 *
 * Tests the SignalPollingManager singleton, subscriber management,
 * deduplication, and error handling. Uses mocked fetch.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SignalPollingManager, validateDeviceUrl } from './signal-poller';

// =============================================================================
// Test Helpers
// =============================================================================

/** Create a minimal mock ReadableStream controller */
function makeController(): ReadableStreamDefaultController<Uint8Array> {
    const chunks: Uint8Array[] = [];
    return {
        enqueue: vi.fn((chunk: Uint8Array) => {
            chunks.push(chunk);
        }),
        close: vi.fn(),
        error: vi.fn(),

        desiredSize: null,
    };
}

/** Decode all enqueued chunks from a controller mock into a string */
function decodeChunks(controller: ReadableStreamDefaultController<Uint8Array>): string {
    interface MockFn { mock: { calls: unknown[][] } }
    const enqueueMock = (controller.enqueue as unknown as MockFn).mock;
    return enqueueMock.calls
        .map((call: unknown[]) => new TextDecoder().decode(call[0] as Uint8Array))
        .join('');
}

/** Sample active tuner status.json response */
const ACTIVE_STATUS_JSON = JSON.stringify([
    {
        Resource: 'tuner0',
        VctNumber: '5.1',
        VctName: 'KPIX',
        Frequency: 695000000,
        SignalStrengthPercent: 83,
        SignalQualityPercent: 90,
        SymbolQualityPercent: 100,
    },
    { Resource: 'tuner1' },
]);

/** Sample idle tuner status.json response */
const IDLE_STATUS_JSON = JSON.stringify([{ Resource: 'tuner0' }]);

/** Device base URL */
const DEVICE_URL = 'http://192.168.1.100';

/** SSE signal event prefix for assertions */
const SIGNAL_EVENT = 'event: signal';

/** SSE streaminfo event prefix for assertions */
const STREAMINFO_EVENT = 'event: streaminfo';

// =============================================================================
// Tests
// =============================================================================

describe('SignalPollingManager', () => {
    let manager: SignalPollingManager;
    let fetchMock: ReturnType<typeof vi.fn>;

    beforeEach(() => {
        // Fresh manager instance per test
        manager = new SignalPollingManager();

        // Replace global fetch with a mock
        fetchMock = vi.fn();
        vi.stubGlobal('fetch', fetchMock);

        vi.useFakeTimers();
    });

    afterEach(() => {
        vi.restoreAllMocks();
        vi.useRealTimers();
    });

    // -------------------------------------------------------------------------
    // subscribe / unsubscribe
    // -------------------------------------------------------------------------

    describe('subscribe', () => {
        it('returns a unique subscriber ID', () => {
            const controller = makeController();
            fetchMock.mockResolvedValue(new Response(IDLE_STATUS_JSON, { status: 200 }));

            const id1 = manager.subscribe({ deviceUrl: DEVICE_URL, tunerDbId: 1, resource: 'tuner0', controller });
            const id2 = manager.subscribe({ deviceUrl: DEVICE_URL, tunerDbId: 2, resource: 'tuner1', controller });

            expect(id1).toBeTruthy();
            expect(id2).toBeTruthy();
            expect(id1).not.toBe(id2);
        });

        it('increments subscriber count', () => {
            const controller = makeController();
            fetchMock.mockResolvedValue(new Response(IDLE_STATUS_JSON, { status: 200 }));

            expect(manager.getSubscriberCount(DEVICE_URL)).toBe(0);
            manager.subscribe({ deviceUrl: DEVICE_URL, tunerDbId: 1, resource: 'tuner0', controller });
            expect(manager.getSubscriberCount(DEVICE_URL)).toBe(1);
            manager.subscribe({ deviceUrl: DEVICE_URL, tunerDbId: 2, resource: 'tuner1', controller });
            expect(manager.getSubscriberCount(DEVICE_URL)).toBe(2);
        });
    });

    describe('unsubscribe', () => {
        it('decrements subscriber count', () => {
            const controller = makeController();
            fetchMock.mockResolvedValue(new Response(IDLE_STATUS_JSON, { status: 200 }));

            const id = manager.subscribe({ deviceUrl: DEVICE_URL, tunerDbId: 1, resource: 'tuner0', controller });
            expect(manager.getSubscriberCount(DEVICE_URL)).toBe(1);

            manager.unsubscribe(DEVICE_URL, id);
            expect(manager.getSubscriberCount(DEVICE_URL)).toBe(0);
        });

        it('is a no-op when subscriber ID is unknown', () => {
            expect(() => manager.unsubscribe(DEVICE_URL, 'unknown')).not.toThrow();
        });

        it('is a no-op for unknown device URL', () => {
            expect(() => manager.unsubscribe('http://unknown', 'id')).not.toThrow();
        });
    });

    // -------------------------------------------------------------------------
    // Poll cycle dispatches correct SSE events
    // -------------------------------------------------------------------------

    describe('poll cycle', () => {
        it('dispatches a signal SSE event after subscribing', async () => {
            const controller = makeController();

            // Mock: status.json returns active tuner, then tuner status for lock check
            fetchMock
                .mockResolvedValueOnce(new Response(ACTIVE_STATUS_JSON, { status: 200 }))
                .mockResolvedValueOnce(new Response('lock=atsc1-t\nss=83\n', { status: 200 }));

            manager.subscribe({ deviceUrl: DEVICE_URL, tunerDbId: 1, resource: 'tuner0', controller });

            // Flush the immediate poll promise (started with void in startPolling)
            await vi.advanceTimersByTimeAsync(0);
            await Promise.resolve();
            await Promise.resolve(); // extra tick for nested await chains

            const output = decodeChunks(controller);
            expect(output).toContain(SIGNAL_EVENT);
            expect(output).toContain('"idle":false');
            expect(output).toContain('"ss":83');
            expect(output).toContain('"snq":90');
            expect(output).toContain('"seq":100');
            expect(output).toContain('"tunerId":1');
        });

        it('marks tuner as idle when VctNumber absent', async () => {
            const controller = makeController();
            fetchMock.mockResolvedValue(new Response(IDLE_STATUS_JSON, { status: 200 }));

            manager.subscribe({ deviceUrl: DEVICE_URL, tunerDbId: 1, resource: 'tuner0', controller });
            await vi.advanceTimersByTimeAsync(0);
            await Promise.resolve();
            await Promise.resolve();

            const output = decodeChunks(controller);
            expect(output).toContain('"idle":true');
            expect(output).toContain('"ss":null');
        });

        it('deduplicates: 2 subscribers share 1 fetch call per cycle', async () => {
            const controller1 = makeController();
            const controller2 = makeController();

            fetchMock.mockResolvedValue(new Response(ACTIVE_STATUS_JSON, { status: 200 }));

            manager.subscribe({ deviceUrl: DEVICE_URL, tunerDbId: 1, resource: 'tuner0', controller: controller1 });
            manager.subscribe({ deviceUrl: DEVICE_URL, tunerDbId: 1, resource: 'tuner0', controller: controller2 });

            // Allow immediate poll
            await vi.advanceTimersByTimeAsync(0);
            await Promise.resolve();
            await Promise.resolve();

            // Both subscribers should receive signal events
            expect(decodeChunks(controller1)).toContain(SIGNAL_EVENT);
            expect(decodeChunks(controller2)).toContain(SIGNAL_EVENT);

            // Reset call count and run one interval cycle
            fetchMock.mockClear();
            await vi.advanceTimersByTimeAsync(2000);
            await Promise.resolve();
            await Promise.resolve();

            // Only one status.json fetch per poll cycle
            const statusCalls = fetchMock.mock.calls.filter(
                (call: unknown[]) => typeof call[0] === 'string' && (call[0]).endsWith('/status.json'),
            );
            expect(statusCalls.length).toBe(1);
        });

        it('emits timeout error event when fetch times out', async () => {
            const controller = makeController();

            // Mock: fetch rejects with an AbortError (simulates timeout)
            fetchMock.mockRejectedValue(Object.assign(new Error('timeout'), { name: 'AbortError' }));

            manager.subscribe({ deviceUrl: DEVICE_URL, tunerDbId: 1, resource: 'tuner0', controller });
            await vi.advanceTimersByTimeAsync(0);
            await Promise.resolve();
            await Promise.resolve();

            const output = decodeChunks(controller);
            expect(output).toContain('"error":"timeout"');
        });

        it('emits unreachable error event when fetch rejects with network error', async () => {
            const controller = makeController();
            fetchMock.mockRejectedValue(new Error('Network unreachable'));

            manager.subscribe({ deviceUrl: DEVICE_URL, tunerDbId: 1, resource: 'tuner0', controller });
            await vi.advanceTimersByTimeAsync(0);
            await Promise.resolve();
            await Promise.resolve();

            const output = decodeChunks(controller);
            expect(output).toContain('"error":"unreachable"');
        });
    });

    // -------------------------------------------------------------------------
    // Interval management
    // -------------------------------------------------------------------------

    describe('interval cleanup', () => {
        it('stops polling interval when last subscriber unsubscribes', async () => {
            const controller = makeController();
            fetchMock.mockResolvedValue(new Response(IDLE_STATUS_JSON, { status: 200 }));

            const id = manager.subscribe({ deviceUrl: DEVICE_URL, tunerDbId: 1, resource: 'tuner0', controller });
            await vi.advanceTimersByTimeAsync(0);
            await Promise.resolve();
            await Promise.resolve();

            const callsBefore = fetchMock.mock.calls.length;

            manager.unsubscribe(DEVICE_URL, id);

            // Advance past multiple poll cycles — no new fetches expected
            await vi.advanceTimersByTimeAsync(6000);
            await Promise.resolve();

            expect(fetchMock.mock.calls.length).toBe(callsBefore);
        });
    });

    // -------------------------------------------------------------------------
    // VctNumber change detection → streaminfo dispatch
    // -------------------------------------------------------------------------

    describe('streaminfo dispatch on channel change', () => {
        it('fetches streaminfo when VctNumber first appears', async () => {
            const controller = makeController();

            const statusFirstPoll = JSON.stringify([
                {
                    Resource: 'tuner0',
                    VctNumber: '5.1',
                    VctName: 'KPIX',
                    SignalStrengthPercent: 83,
                    SignalQualityPercent: 90,
                    SymbolQualityPercent: 100,
                },
            ]);

            // status.json, tuner status (lock check), streaminfo
            fetchMock
                .mockResolvedValueOnce(new Response(statusFirstPoll, { status: 200 }))
                .mockResolvedValueOnce(new Response('lock=atsc1-t\nss=83\nsnq=90\nseq=100\n', { status: 200 }))
                .mockResolvedValueOnce(new Response('481: mpeg2video v 1\n482: ac3 a 1', { status: 200 }));

            manager.subscribe({ deviceUrl: DEVICE_URL, tunerDbId: 1, resource: 'tuner0', controller });
            await vi.advanceTimersByTimeAsync(0);
            // Multiple ticks for nested async chains
            for (let i = 0; i < 5; i++) {
                await Promise.resolve();
            }

            const output = decodeChunks(controller);
            expect(output).toContain(STREAMINFO_EVENT);
            expect(output).toContain('"programs"');
        });
    });

    // -------------------------------------------------------------------------
    // ATSC 3.0 lock detection
    // -------------------------------------------------------------------------

    describe('ATSC 3.0 detection', () => {
        it('fetches atsc3 plp + l1 when lock type changes to atsc3', async () => {
            const controller = makeController();

            const statusAtsc3 = JSON.stringify([
                {
                    Resource: 'tuner0',
                    VctNumber: '44.1',
                    VctName: 'HDTV',
                    SignalStrengthPercent: 80,
                    SignalQualityPercent: 85,
                    SymbolQualityPercent: 100,
                },
            ]);

            // Fetch order per poll cycle:
            // 1. status.json
            // 2. streaminfo (VctNumber changed to '44.1' from undefined)
            // 3. tuner status (for ATSC lock detection)
            // 4. plpinfo (ATSC 3.0 lock detected)
            // 5. l1info
            fetchMock
                .mockResolvedValueOnce(new Response(statusAtsc3, { status: 200 }))
                .mockResolvedValueOnce(new Response('481: mpeg2video v 1\n', { status: 200 })) // streaminfo
                .mockResolvedValueOnce(new Response('lock=atsc3-t2\nss=80\n', { status: 200 })) // tuner status
                .mockResolvedValueOnce(new Response('plpid=0\nsnr=32.5\nfectype=ldpc\n', { status: 200 }))
                .mockResolvedValueOnce(new Response('fftsize=16K\ngi=1/192\npp=PP4\n', { status: 200 }));

            manager.subscribe({ deviceUrl: DEVICE_URL, tunerDbId: 1, resource: 'tuner0', controller });
            await vi.advanceTimersByTimeAsync(0);
            for (let i = 0; i < 10; i++) {
                await Promise.resolve();
            }

            const output = decodeChunks(controller);
            expect(output).toContain('event: atsc3plp');
            expect(output).toContain('event: atsc3l1');
        });

        it('handles 404 on ATSC 3.0 endpoints gracefully', async () => {
            const controller = makeController();

            const statusAtsc3 = JSON.stringify([
                {
                    Resource: 'tuner0',
                    VctNumber: '44.1',
                    VctName: 'HDTV',
                    SignalStrengthPercent: 80,
                    SignalQualityPercent: 85,
                    SymbolQualityPercent: 100,
                },
            ]);

            fetchMock
                .mockResolvedValueOnce(new Response(statusAtsc3, { status: 200 }))
                .mockResolvedValueOnce(new Response('lock=atsc3-t2\nss=80\n', { status: 200 }))
                .mockRejectedValueOnce(new Error('404 not found'))  // plpinfo fails
                .mockRejectedValueOnce(new Error('404 not found')) // l1info fails
                .mockResolvedValueOnce(new Response('481: mpeg2video v 1\n', { status: 200 })); // streaminfo

            manager.subscribe({ deviceUrl: DEVICE_URL, tunerDbId: 1, resource: 'tuner0', controller });
            await vi.advanceTimersByTimeAsync(0);
            for (let i = 0; i < 10; i++) {
                await Promise.resolve();
            }

            // Should still emit signal event — the ATSC 3.0 failure is silent
            const output = decodeChunks(controller);
            expect(output).toContain(SIGNAL_EVENT);
            expect(output).not.toContain('event: atsc3plp');
        });
    });

    // -------------------------------------------------------------------------
    // subscribeAll (antenna mode)
    // -------------------------------------------------------------------------

    describe('subscribeAll', () => {
        it('receives events for all tracked tuners', async () => {
            const controller = makeController();

            const multiTunerStatus = JSON.stringify([
                {
                    Resource: 'tuner0',
                    VctNumber: '5.1',
                    VctName: 'KPIX',
                    SignalStrengthPercent: 83,
                    SignalQualityPercent: 90,
                    SymbolQualityPercent: 100,
                },
                {
                    Resource: 'tuner1',
                    VctNumber: '7.1',
                    VctName: 'KGO',
                    SignalStrengthPercent: 75,
                    SignalQualityPercent: 85,
                    SymbolQualityPercent: 100,
                },
            ]);

            fetchMock.mockResolvedValue(new Response(multiTunerStatus, { status: 200 }));

            manager.subscribeAll({
                deviceUrl: DEVICE_URL,
                tunersToTrack: [
                    { tunerId: 1, resource: 'tuner0' },
                    { tunerId: 2, resource: 'tuner1' },
                ],
                controller,
            });

            await vi.advanceTimersByTimeAsync(0);
            await Promise.resolve();
            await Promise.resolve();

            const output = decodeChunks(controller);
            expect(output).toContain('"tunerId":1');
            expect(output).toContain('"tunerId":2');
        });
    });
});

// =============================================================================
// validateDeviceUrl — SSRF guard tests
// =============================================================================

describe('validateDeviceUrl', () => {
    it('accepts a valid HDHomeRun device HTTP URL', () => {
        expect(() => validateDeviceUrl('http://192.168.1.100')).not.toThrow();
        expect(() => validateDeviceUrl('http://10.0.0.5:5004')).not.toThrow();
    });

    it('rejects HTTPS URLs (HDHomeRun devices are HTTP-only)', () => {
        expect(() => validateDeviceUrl('https://192.168.1.100')).toThrow(/expected "http:"/i);
    });

    it('rejects loopback addresses', () => {
        expect(() => validateDeviceUrl('http://127.0.0.1')).toThrow(/loopback/i);
        expect(() => validateDeviceUrl('http://localhost')).toThrow(/loopback/i);
        // IPv6 loopback must use bracket notation in URLs
        expect(() => validateDeviceUrl('http://[::1]')).toThrow(/loopback/i);
    });

    it('rejects IPv4 link-local addresses', () => {
        expect(() => validateDeviceUrl('http://169.254.1.1')).toThrow(/link-local/i);
    });

    it('rejects malformed URLs', () => {
        expect(() => validateDeviceUrl('not-a-url')).toThrow(/not a valid URL/i);
        expect(() => validateDeviceUrl('')).toThrow(/not a valid URL/i);
    });

    it('rejects non-HTTP schemes', () => {
        expect(() => validateDeviceUrl('ftp://192.168.1.100')).toThrow(/expected "http:"/i);
        expect(() => validateDeviceUrl('file:///etc/passwd')).toThrow(/expected "http:"/i);
    });
});
