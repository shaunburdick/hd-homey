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

/** Minimal streaminfo response — one video PID in program 1 */
const STREAMINFO_RESPONSE = '481: mpeg2video v 1\n';

/** Two-PID streaminfo response — video + audio in program 1 */
const STREAMINFO_TWO_PIDS = `${STREAMINFO_RESPONSE}482: ac3 a 1`;

/** Tuner status response for ATSC 1 lock with signal values */
const LOCK_STATUS_ATSC1 = 'lock=atsc1-t\nss=83\nsnq=90\nseq=100\n';

/** Lineup.json fixture for lineup fallback tests */
const LINEUP_JSON = JSON.stringify([
    { GuideNumber: '5.1', GuideName: 'KPIX', VideoCodec: 'MPEG2', AudioCodec: 'AC3', URL: 'http://192.168.1.100:5004/auto/v5.1' },
    { GuideNumber: '7.1', GuideName: 'KGO', VideoCodec: 'MPEG2', AudioCodec: 'AC3', URL: 'http://192.168.1.100:5004/auto/v7.1' },
]);

/** Error message for simulated 404 responses in lineup fallback tests */
const ERR_404 = '404 Not Found';

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

            // Fetch order per poll cycle for an active tuner:
            // 1. status.json (tuner0 has VctNumber="5.1")
            // 2. streaminfo (VctNumber changed from undefined to "5.1")
            // 3. tuner status (ATSC lock type check)
            fetchMock
                .mockResolvedValueOnce(new Response(ACTIVE_STATUS_JSON, { status: 200 }))
                .mockResolvedValueOnce(new Response(STREAMINFO_RESPONSE, { status: 200 })) // streaminfo
                .mockResolvedValueOnce(new Response('lock=atsc1-t\nss=83\n', { status: 200 })); // tuner status

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

            // Fetch order per poll cycle:
            // 1. status.json
            // 2. streaminfo (VctNumber changed from undefined to '5.1')
            // 3. tuner status (for ATSC lock detection)
            fetchMock
                .mockResolvedValueOnce(new Response(statusFirstPoll, { status: 200 }))
                .mockResolvedValueOnce(new Response(STREAMINFO_TWO_PIDS, { status: 200 })) // streaminfo
                .mockResolvedValueOnce(new Response(LOCK_STATUS_ATSC1, { status: 200 })); // tuner status

            manager.subscribe({ deviceUrl: DEVICE_URL, tunerDbId: 1, resource: 'tuner0', controller });
            await vi.advanceTimersByTimeAsync(0);
            // Multiple ticks for nested async chains
            for (let i = 0; i < 5; i++) {
                await Promise.resolve();
            }

            const output = decodeChunks(controller);
            expect(output).toContain(STREAMINFO_EVENT);
            // programs array must contain the parsed PIDs from the streaminfo response
            expect(output).toContain('"programNumber":1');
            expect(output).toContain('"codec":"mpeg2video"');
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
                .mockResolvedValueOnce(new Response(STREAMINFO_RESPONSE, { status: 200 })) // streaminfo
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

            // Fetch order per poll cycle:
            // 1. status.json
            // 2. streaminfo (VctNumber changed to '44.1' from undefined)
            // 3. tuner status (returns atsc3 lock → triggers ATSC 3.0 fetches)
            // 4. plpinfo — fails with 404
            // 5. l1info — fails with 404
            fetchMock
                .mockResolvedValueOnce(new Response(statusAtsc3, { status: 200 }))
                .mockResolvedValueOnce(new Response(STREAMINFO_RESPONSE, { status: 200 })) // streaminfo
                .mockResolvedValueOnce(new Response('lock=atsc3-t2\nss=80\n', { status: 200 })) // tuner status
                .mockRejectedValueOnce(new Error('404 not found'))  // plpinfo fails
                .mockRejectedValueOnce(new Error('404 not found')); // l1info fails

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

    // -------------------------------------------------------------------------
    // lineup.json fallback for devices that return 404 on /streaminfo
    // -------------------------------------------------------------------------

    describe('lineup.json fallback', () => {
        it('dispatches synthetic streaminfo SSE event when streaminfo returns 404', async () => {
            const controller = makeController();

            // Single-tuner status to avoid tuner1 auto-discovery complicating mock order.
            const singleTunerStatus = JSON.stringify([
                {
                    Resource: 'tuner0',
                    VctNumber: '5.1',
                    VctName: 'KPIX',
                    SignalStrengthPercent: 83,
                    SignalQualityPercent: 90,
                    SymbolQualityPercent: 100,
                },
            ]);

            // Fetch order:
            // 1. status.json — active tuner on channel 5.1
            // 2. streaminfo — fails (simulates 404 / network error on newer models)
            // 3. lineup.json — succeeds with codec info
            // 4. tuner0/status — for ATSC lock detection
            fetchMock
                .mockResolvedValueOnce(new Response(singleTunerStatus, { status: 200 })) // status.json
                .mockRejectedValueOnce(new Error(ERR_404))                                  // streaminfo fails
                .mockResolvedValueOnce(new Response(LINEUP_JSON, { status: 200 }))        // lineup.json
                .mockResolvedValueOnce(new Response(LOCK_STATUS_ATSC1, { status: 200 })); // tuner status

            manager.subscribe({ deviceUrl: DEVICE_URL, tunerDbId: 1, resource: 'tuner0', controller });

            await vi.advanceTimersByTimeAsync(0);
            for (let i = 0; i < 10; i++) {
                await Promise.resolve();
            }

            const output = decodeChunks(controller);
            expect(output).toContain(STREAMINFO_EVENT);
            // Synthetic program from lineup: programNumber 0, codecs from lineup
            expect(output).toContain('"programNumber":0');
            expect(output).toContain('"MPEG2 video"');
            expect(output).toContain('"AC3 audio"');
        });

        it('does not crash when lineup.json also returns 404', async () => {
            const controller = makeController();

            // Single-tuner status to avoid auto-discovery complicating mock order.
            const singleTunerStatus = JSON.stringify([
                {
                    Resource: 'tuner0',
                    VctNumber: '5.1',
                    VctName: 'KPIX',
                    SignalStrengthPercent: 83,
                    SignalQualityPercent: 90,
                    SymbolQualityPercent: 100,
                },
            ]);

            // Fetch order:
            // 1. status.json — active tuner
            // 2. streaminfo — fails
            // 3. lineup.json — also fails (truly unsupported device or network blip)
            // 4. tuner0/status — for ATSC lock detection
            fetchMock
                .mockResolvedValueOnce(new Response(singleTunerStatus, { status: 200 })) // status.json
                .mockRejectedValueOnce(new Error(ERR_404))                                  // streaminfo fails
                .mockRejectedValueOnce(new Error(ERR_404))                                  // lineup.json also fails
                .mockResolvedValueOnce(new Response(LOCK_STATUS_ATSC1, { status: 200 })); // tuner status

            manager.subscribe({ deviceUrl: DEVICE_URL, tunerDbId: 1, resource: 'tuner0', controller });

            await vi.advanceTimersByTimeAsync(0);
            for (let i = 0; i < 10; i++) {
                await Promise.resolve();
            }

            // Must still emit the signal event — lineup failure is silently swallowed
            const output = decodeChunks(controller);
            expect(output).toContain(SIGNAL_EVENT);
            // No streaminfo event emitted — there was no data to build one from
            expect(output).not.toContain(STREAMINFO_EVENT);
        });

        it('uses cached lineup on second poll cycle without re-fetching', async () => {
            const controller = makeController();

            // Single-tuner status responses to keep mock sequence deterministic.
            // First poll: channel 5.1 — streaminfo fails, lineup fetched and cached.
            const singleTunerPoll1 = JSON.stringify([
                {
                    Resource: 'tuner0',
                    VctNumber: '5.1',
                    VctName: 'KPIX',
                    SignalStrengthPercent: 83,
                    SignalQualityPercent: 90,
                    SymbolQualityPercent: 100,
                },
            ]);
            // Second poll: channel changes to 7.1 — triggers another streaminfo attempt.
            // Lineup is already cached, so no /lineup.json re-fetch.
            const singleTunerPoll2 = JSON.stringify([
                {
                    Resource: 'tuner0',
                    VctNumber: '7.1',
                    VctName: 'KGO',
                    SignalStrengthPercent: 75,
                    SignalQualityPercent: 85,
                    SymbolQualityPercent: 100,
                },
            ]);

            // Poll 1 fetches: status.json → streaminfo (fails) → lineup.json → tuner0/status
            // Poll 2 fetches: status.json → streaminfo (fails) → tuner0/status  [no lineup re-fetch]
            fetchMock
                // Poll 1
                .mockResolvedValueOnce(new Response(singleTunerPoll1, { status: 200 })) // status.json
                .mockRejectedValueOnce(new Error('streaminfo 404'))                       // streaminfo
                .mockResolvedValueOnce(new Response(LINEUP_JSON, { status: 200 }))       // lineup.json (cached)
                .mockResolvedValueOnce(new Response(LOCK_STATUS_ATSC1, { status: 200 })) // tuner0/status
                // Poll 2
                .mockResolvedValueOnce(new Response(singleTunerPoll2, { status: 200 })) // status.json
                .mockRejectedValueOnce(new Error('streaminfo 404'))                       // streaminfo (uses cache)
                .mockResolvedValueOnce(new Response(LOCK_STATUS_ATSC1, { status: 200 })); // tuner0/status

            manager.subscribe({ deviceUrl: DEVICE_URL, tunerDbId: 1, resource: 'tuner0', controller });

            // Run first poll
            await vi.advanceTimersByTimeAsync(0);
            for (let i = 0; i < 10; i++) {
                await Promise.resolve();
            }

            // Run second poll (2 second interval)
            await vi.advanceTimersByTimeAsync(2000);
            for (let i = 0; i < 20; i++) {
                await Promise.resolve();
            }

            const lineupCalls = fetchMock.mock.calls.filter(
                (call: unknown[]) => typeof call[0] === 'string' && call[0].endsWith('/lineup.json'),
            );
            // Only one lineup.json fetch across two poll cycles
            expect(lineupCalls).toHaveLength(1);

            // Both polls should have dispatched streaminfo events (using cached lineup on poll 2)
            const output = decodeChunks(controller);
            const streaminfoMatches = output.match(/event: streaminfo/g);
            expect(streaminfoMatches).toHaveLength(2);
        });
    });

    // -------------------------------------------------------------------------
    // Auto-discovery: poller discovers all tuners from /status.json
    // -------------------------------------------------------------------------

    describe('auto-discovery', () => {
        const FOUR_TUNER_JSON = JSON.stringify([
            { Resource: 'tuner0' },
            { Resource: 'tuner1' },
            { Resource: 'tuner2' },
            { Resource: 'tuner3' },
        ]);

        it('subscriber only receives events for their subscribed resource', async () => {
            const controller = makeController();

            fetchMock.mockResolvedValue(new Response(FOUR_TUNER_JSON, { status: 200 }));

            // Subscribe to tuner0 only (as happens with 1 DB record per device)
            manager.subscribe({ deviceUrl: DEVICE_URL, tunerDbId: 1, resource: 'tuner0', controller });
            await vi.advanceTimersByTimeAsync(0);
            await Promise.resolve();
            await Promise.resolve();

            const output = decodeChunks(controller);
            expect(output).toContain('"resource":"tuner0"');
            expect(output).not.toContain('"resource":"tuner1"');
            expect(output).not.toContain('"resource":"tuner2"');
            expect(output).not.toContain('"resource":"tuner3"');
        });

        it('antenna wildcard subscriber receives events for auto-discovered tuners', async () => {
            const controller = makeController();

            // Scenario: 1 DB record for a 4-tuner device. Antenna mode
            // subscribes using subscribeAll with only 1 tuner tracked.
            fetchMock.mockResolvedValue(new Response(FOUR_TUNER_JSON, { status: 200 }));

            manager.subscribeAll({
                deviceUrl: DEVICE_URL,
                tunersToTrack: [{ tunerId: 1, resource: 'tuner0' }],
                controller,
            });

            await vi.advanceTimersByTimeAsync(0);
            await Promise.resolve();
            await Promise.resolve();

            const output = decodeChunks(controller);
            // Explicitly-tracked tuner uses DB tunerId
            expect(output).toContain('"resource":"tuner0"');
            expect(output).toMatch(/"tunerId":1/);
            // Auto-discovered tuners use synthetic negative IDs
            expect(output).toContain('"resource":"tuner1"');
            expect(output).toContain('"resource":"tuner2"');
            expect(output).toContain('"resource":"tuner3"');
        });

        it('synthetic IDs are negative and descend per discovery', async () => {
            const controller = makeController();

            fetchMock.mockResolvedValue(new Response(FOUR_TUNER_JSON, { status: 200 }));

            manager.subscribeAll({
                deviceUrl: DEVICE_URL,
                tunersToTrack: [{ tunerId: 1, resource: 'tuner0' }],
                controller,
            });

            await vi.advanceTimersByTimeAsync(0);
            await Promise.resolve();
            await Promise.resolve();

            const output = decodeChunks(controller);
            // tuner0 uses explicit DB ID 1
            // tuner1, tuner2, tuner3 get descending synthetic IDs
            // tunerId appears before resource in JSON (event → tunerId → resource)
            expect(output).toMatch(/"tunerId":-1,"resource":"tuner1"/);
            expect(output).toMatch(/"tunerId":-2,"resource":"tuner2"/);
            expect(output).toMatch(/"tunerId":-3,"resource":"tuner3"/);
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
