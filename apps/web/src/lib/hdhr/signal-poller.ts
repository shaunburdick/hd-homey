/**
 * Signal Polling Manager — Singleton for HDHomeRun device signal polling.
 *
 * Manages a deduplicated poll loop per device: when multiple SSE clients
 * connect to the same device, only ONE fetch is performed per poll cycle
 * and the result is fanned out to all subscribers.
 *
 * Pattern: module-level singleton (same as transcoding/session-manager.ts).
 *
 * @module signal-poller
 */

import {
    parseStatusJson,
    parseStreamInfo,
    groupStreamInfoByProgram,
    parseAtsc3Plp,
    parseAtsc3L1,
    parseTunerLockStatus,
    formatSseEvent,
} from './signal-parsers';
import type {
    SignalSseEvent,
    StreamInfoSseEvent,
    Atsc3PlpSseEvent,
    Atsc3L1SseEvent,
} from './signal-parsers';
import type { TunerStatusResponse } from './types';
import Logger from '@/lib/logger';

// =============================================================================
// Constants
// =============================================================================

/** Poll interval for device status.json fetches */
const POLL_INTERVAL_MS = 2_000;

/** Keepalive ping interval */
const PING_INTERVAL_MS = 30_000;

/** Device fetch timeout */
const FETCH_TIMEOUT_MS = 3_000;

/** Wildcard resource value for antenna-mode subscribers (all tuners on device) */
const WILDCARD_RESOURCE = '*';

// =============================================================================
// Internal Types (not exported)
// =============================================================================

/** Internal: represents one active SSE connection subscribed to a device's signal feed */
interface SseSubscriber {
    /** Unique subscriber ID (crypto.randomUUID()) */
    id: string;
    /** ReadableStream controller to enqueue SSE data */
    controller: ReadableStreamDefaultController<Uint8Array>;
    /** DB tuner ID — used to filter events in multi-tuner (antenna) subscriptions */
    tunerId: number;
    /** HDHomeRun resource name this subscriber is filtering for, or '*' for antenna (all) */
    resource: string;
}

/** Internal: represents a tuner slot being tracked for a device */
interface TrackedTuner {
    /** DB ID from the tuners table */
    tunerId: number;
    /** HDHomeRun resource name, e.g. "tuner0" */
    resource: string;
}

/** Internal: tracks polling state for a single HDHomeRun device (by base URL) */
interface DevicePollEntry {
    /** Device base URL. E.g. "http://192.168.1.100" */
    deviceUrl: string;
    /** Active poll interval handle */
    intervalHandle: ReturnType<typeof setInterval> | null;
    /** Active keepalive (ping) interval handle */
    pingHandle: ReturnType<typeof setInterval> | null;
    /** All SSE subscribers watching this device */
    subscribers: Map<string, SseSubscriber>;
    /** Last seen VctNumber per resource — for streaminfo change detection */
    lastVctNumber: Map<string, string | undefined>;
    /** Last seen lock type per resource — for ATSC 3.0 change detection */
    lastLockType: Map<string, string | null>;
    /** Tuners to poll on this device */
    trackedTuners: Map<string, TrackedTuner>;
}

// =============================================================================
// Polling Manager Class
// =============================================================================

/**
 * Singleton manager for HDHomeRun device signal polling.
 *
 * Maintains one poll timer per device IP and fans SSE events out to all
 * connected clients. When the last client disconnects, polling stops.
 */
export class SignalPollingManager {
    private readonly devices = new Map<string, DevicePollEntry>();

    // -------------------------------------------------------------------------
    // Public API
    // -------------------------------------------------------------------------

    /**
     * Subscribe a single-tuner SSE client to a device's signal feed.
     *
     * @param deviceUrl - Device base URL, e.g. "http://192.168.1.100"
     * @param tunerDbId - HD Homey database tuner ID
     * @param resource - HDHomeRun resource name, e.g. "tuner0"
     * @param controller - ReadableStream controller for the SSE response
     * @returns subscriberId — pass to unsubscribe() when client disconnects
     */
    public subscribe(
        deviceUrl: string,
        tunerDbId: number,
        resource: string,
        controller: ReadableStreamDefaultController<Uint8Array>,
    ): string {
        const subscriberId = crypto.randomUUID();

        const entry = this.getOrCreateEntry(deviceUrl);

        entry.subscribers.set(subscriberId, {
            id: subscriberId,
            controller,
            tunerId: tunerDbId,
            resource,
        });

        // Track this tuner on the device
        entry.trackedTuners.set(resource, { tunerId: tunerDbId, resource });

        Logger.debug(
            { deviceUrl, resource, tunerId: tunerDbId, subscriberId },
            'SSE subscriber added',
        );

        this.ensurePolling(deviceUrl);

        return subscriberId;
    }

    /**
     * Subscribe an antenna-mode SSE client to all tuners on all provided devices.
     * The same subscriber receives events for every tuner with a `tunerId` discriminator.
     *
     * @param deviceUrl - Device base URL
     * @param tuners - Array of tuner objects to track on this device
     * @param controller - ReadableStream controller for the SSE response
     * @returns subscriberId
     */
    public subscribeAll(
        deviceUrl: string,
        tuners: TrackedTuner[],
        controller: ReadableStreamDefaultController<Uint8Array>,
    ): string {
        const subscriberId = crypto.randomUUID();

        const entry = this.getOrCreateEntry(deviceUrl);

        entry.subscribers.set(subscriberId, {
            id: subscriberId,
            controller,
            tunerId: -1, // antenna mode receives all tuner events
            resource: WILDCARD_RESOURCE,
        });

        // Register all tuners for this device
        for (const tuner of tuners) {
            entry.trackedTuners.set(tuner.resource, tuner);
        }

        Logger.debug(
            { deviceUrl, tunerCount: tuners.length, subscriberId },
            'Antenna SSE subscriber added',
        );

        this.ensurePolling(deviceUrl);

        return subscriberId;
    }

    /**
     * Remove a subscriber. If this was the last subscriber for the device,
     * polling stops within the current poll cycle.
     *
     * @param deviceUrl - Device base URL
     * @param subscriberId - ID returned from subscribe() or subscribeAll()
     */
    public unsubscribe(deviceUrl: string, subscriberId: string): void {
        const entry = this.devices.get(deviceUrl);
        if (entry === undefined) return;

        entry.subscribers.delete(subscriberId);

        Logger.debug(
            { deviceUrl, subscriberId, remaining: entry.subscribers.size },
            'SSE subscriber removed',
        );

        if (entry.subscribers.size === 0) {
            this.stopPolling(deviceUrl);
            this.devices.delete(deviceUrl);
            Logger.debug({ deviceUrl }, 'All subscribers gone — polling stopped');
        }
    }

    /**
     * Get the current subscriber count for a device.
     *
     * @param deviceUrl - Device base URL
     * @returns Number of active subscribers
     */
    public getSubscriberCount(deviceUrl: string): number {
        return this.devices.get(deviceUrl)?.subscribers.size ?? 0;
    }

    // -------------------------------------------------------------------------
    // Private: Entry Management
    // -------------------------------------------------------------------------

    /**
     * Get existing device entry or create a new one.
     */
    private getOrCreateEntry(deviceUrl: string): DevicePollEntry {
        const existing = this.devices.get(deviceUrl);
        if (existing !== undefined) return existing;

        const entry: DevicePollEntry = {
            deviceUrl,
            intervalHandle: null,
            pingHandle: null,
            subscribers: new Map(),
            lastVctNumber: new Map(),
            lastLockType: new Map(),
            trackedTuners: new Map(),
        };

        this.devices.set(deviceUrl, entry);
        return entry;
    }

    /**
     * Start polling if not already running.
     */
    private ensurePolling(deviceUrl: string): void {
        const entry = this.devices.get(deviceUrl);
        if (entry === undefined || entry.intervalHandle !== null) return;

        this.startPolling(deviceUrl);
    }

    // -------------------------------------------------------------------------
    // Private: Polling Loop
    // -------------------------------------------------------------------------

    /**
     * Start the poll loop for a device (both signal poll and ping intervals).
     */
    private startPolling(deviceUrl: string): void {
        const entry = this.devices.get(deviceUrl);
        if (entry === undefined) return;

        Logger.debug({ deviceUrl }, 'Starting signal polling');

        // Trigger an immediate first poll so the SSE client gets data quickly
        void this.poll(deviceUrl);

        entry.intervalHandle = setInterval(() => {
            void this.poll(deviceUrl);
        }, POLL_INTERVAL_MS);

        entry.pingHandle = setInterval(() => {
            this.dispatchPing(deviceUrl);
        }, PING_INTERVAL_MS);
    }

    /**
     * Stop and clear the poll + ping intervals for a device.
     */
    private stopPolling(deviceUrl: string): void {
        const entry = this.devices.get(deviceUrl);
        if (entry === undefined) return;

        if (entry.intervalHandle !== null) {
            clearInterval(entry.intervalHandle);
            entry.intervalHandle = null;
        }

        if (entry.pingHandle !== null) {
            clearInterval(entry.pingHandle);
            entry.pingHandle = null;
        }

        Logger.debug({ deviceUrl }, 'Signal polling stopped');
    }

    /**
     * Main poll cycle: fetch status.json, dispatch signal events, and
     * conditionally fetch streaminfo / ATSC 3.0 data.
     */
    private async poll(deviceUrl: string): Promise<void> {
        const entry = this.devices.get(deviceUrl);
        if (entry === undefined || entry.subscribers.size === 0) return;

        const statusUrl = `${deviceUrl}/status.json`;

        let statusJson: TunerStatusResponse;

        try {
            const response = await this.fetchWithTimeout(statusUrl, FETCH_TIMEOUT_MS);
            statusJson = await response.json() as TunerStatusResponse;
        } catch (error) {
            const errorType = error instanceof Error && error.name === 'AbortError'
                ? 'timeout'
                : 'unreachable';

            Logger.warn({ deviceUrl, errorType }, 'Device fetch failed');

            // Emit error signal events for all tracked tuners
            for (const [, tuner] of entry.trackedTuners) {
                const errorEvent: SignalSseEvent = {
                    event: 'signal',
                    tunerId: tuner.tunerId,
                    resource: tuner.resource,
                    idle: true,
                    ss: null,
                    snq: null,
                    seq: null,
                    timestamp: Date.now(),
                    error: errorType,
                };
                this.dispatchToSubscribers(entry, tuner.resource, tuner.tunerId, formatSseEvent('signal', errorEvent));
            }
            return;
        }

        // Process each tracked tuner
        for (const [, tuner] of entry.trackedTuners) {
            const statusEntry = parseStatusJson(statusJson, tuner.resource);

            if (statusEntry === null) {
                continue;
            }

            await this.dispatchSignalEvent(entry, statusEntry, tuner.tunerId);
            await this.dispatchStreamInfoIfChanged(entry, statusEntry, tuner.tunerId, deviceUrl);
            await this.dispatchAtsc3IfLocked(entry, statusEntry, tuner.tunerId, deviceUrl);
        }
    }

    // -------------------------------------------------------------------------
    // Private: Event Dispatchers
    // -------------------------------------------------------------------------

    /**
     * Build and dispatch a `signal` SSE event for a tuner.
     */
    private async dispatchSignalEvent(
        entry: DevicePollEntry,
        statusEntry: ReturnType<typeof parseStatusJson>,
        tunerId: number,
    ): Promise<void> {
        if (statusEntry === null) return;

        const idle = statusEntry.VctNumber === undefined;

        const event: SignalSseEvent = {
            event: 'signal',
            tunerId,
            resource: statusEntry.Resource,
            idle,
            vctNumber: statusEntry.VctNumber,
            vctName: statusEntry.VctName,
            ss: statusEntry.SignalStrengthPercent ?? null,
            snq: statusEntry.SignalQualityPercent ?? null,
            seq: statusEntry.SymbolQualityPercent ?? null,
            timestamp: Date.now(),
        };

        this.dispatchToSubscribers(
            entry,
            statusEntry.Resource,
            tunerId,
            formatSseEvent('signal', event),
        );
    }

    /**
     * Fetch and dispatch streaminfo if the VctNumber has changed.
     */
    private async dispatchStreamInfoIfChanged(
        entry: DevicePollEntry,
        statusEntry: ReturnType<typeof parseStatusJson>,
        tunerId: number,
        deviceUrl: string,
    ): Promise<void> {
        if (statusEntry === null) return;

        const resource = statusEntry.Resource;
        const currentVct = statusEntry.VctNumber;
        const lastVct = entry.lastVctNumber.get(resource);

        if (currentVct === lastVct) return;

        entry.lastVctNumber.set(resource, currentVct);

        if (currentVct === undefined) return; // tuner went idle — no streaminfo needed

        // Extract tuner number from resource string (e.g. "tuner0" → "0")
        const tunerNum = resource.replace('tuner', '');
        const streamInfoUrl = `${deviceUrl}/tuner${tunerNum}/streaminfo`;

        try {
            const response = await this.fetchWithTimeout(streamInfoUrl, FETCH_TIMEOUT_MS);
            const rawText = await response.text();
            const pids = parseStreamInfo(rawText);
            const programs = groupStreamInfoByProgram(pids, statusEntry.VctName);

            const event: StreamInfoSseEvent = {
                event: 'streaminfo',
                tunerId,
                programs,
            };

            this.dispatchToSubscribers(
                entry,
                resource,
                tunerId,
                formatSseEvent('streaminfo', event),
            );
        } catch (error) {
            Logger.warn({ deviceUrl, resource, error }, 'Failed to fetch streaminfo');
        }
    }

    /**
     * Fetch and dispatch ATSC 3.0 PLP + L1 data when lock type changes to ATSC 3.0.
     */
    private async dispatchAtsc3IfLocked(
        entry: DevicePollEntry,
        statusEntry: ReturnType<typeof parseStatusJson>,
        tunerId: number,
        deviceUrl: string,
    ): Promise<void> {
        if (statusEntry === null) return;

        const resource = statusEntry.Resource;
        const tunerNum = resource.replace('tuner', '');
        const statusUrl = `${deviceUrl}/tuner${tunerNum}/status`;

        let lockType: string | null = null;

        try {
            const response = await this.fetchWithTimeout(statusUrl, FETCH_TIMEOUT_MS);
            const rawText = await response.text();
            const lockStatus = parseTunerLockStatus(rawText);
            lockType = lockStatus.lock;
        } catch {
            // Lock status unavailable — skip ATSC 3.0 check
            return;
        }

        const lastLock = entry.lastLockType.get(resource);
        if (lockType === lastLock) return;

        entry.lastLockType.set(resource, lockType);

        const isAtsc3 = lockType !== null && lockType.includes('atsc3');
        if (!isAtsc3) return;

        // Fetch PLP info
        const plpUrl = `${deviceUrl}/tuner${tunerNum}/atsc3/plpinfo`;
        const l1Url = `${deviceUrl}/tuner${tunerNum}/atsc3/l1info`;

        await Promise.all([
            this.fetchAtsc3Plp(entry, resource, tunerId, plpUrl),
            this.fetchAtsc3L1(entry, resource, tunerId, l1Url),
        ]);
    }

    /**
     * Fetch and dispatch ATSC 3.0 PLP info event.
     */
    private async fetchAtsc3Plp(
        entry: DevicePollEntry,
        resource: string,
        tunerId: number,
        url: string,
    ): Promise<void> {
        try {
            const response = await this.fetchWithTimeout(url, FETCH_TIMEOUT_MS);
            const rawText = await response.text();
            const plp = parseAtsc3Plp(rawText);

            const event: Atsc3PlpSseEvent = {
                event: 'atsc3plp',
                tunerId,
                ...plp,
            };

            this.dispatchToSubscribers(entry, resource, tunerId, formatSseEvent('atsc3plp', event));
        } catch {
            // 404 or network error — silently skip (ATSC 3.0 is optional)
        }
    }

    /**
     * Fetch and dispatch ATSC 3.0 L1 info event.
     */
    private async fetchAtsc3L1(
        entry: DevicePollEntry,
        resource: string,
        tunerId: number,
        url: string,
    ): Promise<void> {
        try {
            const response = await this.fetchWithTimeout(url, FETCH_TIMEOUT_MS);
            const rawText = await response.text();
            const l1 = parseAtsc3L1(rawText);

            const event: Atsc3L1SseEvent = {
                event: 'atsc3l1',
                tunerId,
                ...l1,
            };

            this.dispatchToSubscribers(entry, resource, tunerId, formatSseEvent('atsc3l1', event));
        } catch {
            // 404 or network error — silently skip
        }
    }

    /**
     * Dispatch a ping keepalive to all subscribers on a device.
     */
    private dispatchPing(deviceUrl: string): void {
        const entry = this.devices.get(deviceUrl);
        if (entry === undefined) return;

        const pingData = formatSseEvent('ping', {});

        for (const [, subscriber] of entry.subscribers) {
            this.enqueueToController(subscriber.controller, pingData);
        }
    }

    /**
     * Fan out SSE event text to all matching subscribers for a tuner.
     * Subscribers with resource='*' (antenna mode) receive all events.
     * Single-tuner subscribers receive only events matching their resource.
     */
    private dispatchToSubscribers(
        entry: DevicePollEntry,
        resource: string,
        tunerId: number,
        sseText: string,
    ): void {
        for (const [, subscriber] of entry.subscribers) {
            const matches =
                subscriber.resource === WILDCARD_RESOURCE ||
                (subscriber.resource === resource && subscriber.tunerId === tunerId);

            if (matches) {
                this.enqueueToController(subscriber.controller, sseText);
            }
        }
    }

    /**
     * Safely enqueue data to a ReadableStream controller.
     * Catches and logs errors if the stream has already been closed.
     */
    private enqueueToController(
        controller: ReadableStreamDefaultController<Uint8Array>,
        text: string,
    ): void {
        try {
            controller.enqueue(new TextEncoder().encode(text));
        } catch (error) {
            Logger.debug({ error }, 'Failed to enqueue SSE data — stream may be closed');
        }
    }

    // -------------------------------------------------------------------------
    // Private: Fetch Utilities
    // -------------------------------------------------------------------------

    /**
     * Fetch a URL with an AbortController timeout.
     *
     * @param url - URL to fetch
     * @param timeoutMs - Timeout in milliseconds
     * @returns Response
     * @throws AbortError if timeout exceeded; network errors propagate as-is
     */
    private async fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);

        try {
            return await fetch(url, { signal: controller.signal });
        } finally {
            clearTimeout(timer);
        }
    }
}

// =============================================================================
// Singleton Export
// =============================================================================

let pollerInstance: SignalPollingManager | null = null;

/**
 * Get the singleton SignalPollingManager instance.
 *
 * Uses module-level caching (same pattern as getSessionManager()).
 * Next.js Node.js runtime preserves module state across concurrent requests.
 *
 * @returns The shared SignalPollingManager instance
 */
export function getSignalPoller(): SignalPollingManager {
    pollerInstance ??= new SignalPollingManager();
    return pollerInstance;
}
