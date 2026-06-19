/**
 * Signal Polling Manager — Singleton for HDHomeRun device signal polling.
 *
 * One poll timer per device IP; fanned out to all SSE subscribers.
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
import type { SignalSseEvent, StreamInfoSseEvent, Atsc3PlpSseEvent, Atsc3L1SseEvent } from './signal-parsers';
import type { TunerStatusResponse } from './types';
import Logger from '@/lib/logger';

const POLL_INTERVAL_MS = 2_000;
const PING_INTERVAL_MS = 30_000;
const FETCH_TIMEOUT_MS = 3_000;
const WILDCARD_RESOURCE = '*';

interface SseSubscriber {
    id: string;
    controller: ReadableStreamDefaultController<Uint8Array>;
    tunerId: number;
    resource: string;
}

/** A tuner slot being tracked on a device */
export interface TrackedTuner {
    tunerId: number;
    resource: string;
}

interface DevicePollEntry {
    deviceUrl: string;
    intervalHandle: ReturnType<typeof setInterval> | null;
    pingHandle: ReturnType<typeof setInterval> | null;
    subscribers: Map<string, SseSubscriber>;
    lastVctNumber: Map<string, string | undefined>;
    lastLockType: Map<string, string | null>;
    trackedTuners: Map<string, TrackedTuner>;
}

// Options objects to comply with max-params=2 rule
interface SubscribeOptions {
    deviceUrl: string;
    tunerDbId: number;
    resource: string;
    controller: ReadableStreamDefaultController<Uint8Array>;
}

interface DispatchEventOptions {
    entry: DevicePollEntry;
    tunerId: number;
}

interface DispatchToSubscribersOptions extends DispatchEventOptions {
    resource: string;
    sseText: string;
}

interface Atsc3FetchOptions extends DispatchEventOptions {
    resource: string;
    url: string;
}

interface DispatchStreamInfoOptions extends DispatchEventOptions {
    statusEntry: NonNullable<ReturnType<typeof parseStatusJson>>;
    deviceUrl: string;
}

interface DispatchAtsc3Options extends DispatchEventOptions {
    statusEntry: NonNullable<ReturnType<typeof parseStatusJson>>;
    deviceUrl: string;
}

interface SubscribeAllOptions {
    deviceUrl: string;
    tunersToTrack: TrackedTuner[];
    controller: ReadableStreamDefaultController<Uint8Array>;
}

/**
 * Singleton manager for HDHomeRun device signal polling.
 *
 * Maintains one poll timer per device and fans events to all subscribers.
 */
export class SignalPollingManager {
    private readonly devices = new Map<string, DevicePollEntry>();

    /**
     * Subscribe a single-tuner SSE client.
     *
     * @returns subscriberId — pass to unsubscribe() on disconnect
     */
    public subscribe(options: SubscribeOptions): string {
        const { deviceUrl, tunerDbId, resource, controller } = options;
        const subscriberId = crypto.randomUUID();
        const entry = this.getOrCreateEntry(deviceUrl);

        entry.subscribers.set(subscriberId, { id: subscriberId, controller, tunerId: tunerDbId, resource });
        entry.trackedTuners.set(resource, { tunerId: tunerDbId, resource });

        Logger.debug({ deviceUrl, resource, tunerId: tunerDbId, subscriberId }, 'SSE subscriber added');
        this.ensurePolling(deviceUrl);
        return subscriberId;
    }

    /**
     * Subscribe an antenna-mode SSE client to all tuners on a device.
     *
     * @returns subscriberId
     */
    public subscribeAll(options: SubscribeAllOptions): string {
        const { deviceUrl, tunersToTrack, controller } = options;
        const subscriberId = crypto.randomUUID();
        const entry = this.getOrCreateEntry(deviceUrl);

        entry.subscribers.set(subscriberId, {
            id: subscriberId, controller, tunerId: -1, resource: WILDCARD_RESOURCE,
        });

        for (const tuner of tunersToTrack) {
            entry.trackedTuners.set(tuner.resource, tuner);
        }

        Logger.debug({ deviceUrl, tunerCount: tunersToTrack.length, subscriberId }, 'Antenna SSE subscriber added');
        this.ensurePolling(deviceUrl);
        return subscriberId;
    }

    /**
     * Remove a subscriber; stops polling if this was the last one.
     */
    public unsubscribe(deviceUrl: string, subscriberId: string): void {
        const entry = this.devices.get(deviceUrl);
        if (entry === undefined) {
            return;
        }

        entry.subscribers.delete(subscriberId);
        Logger.debug({ deviceUrl, subscriberId, remaining: entry.subscribers.size }, 'SSE subscriber removed');

        if (entry.subscribers.size === 0) {
            this.stopPolling(deviceUrl);
            this.devices.delete(deviceUrl);
        }
    }

    /**
     * Number of active subscribers for a device.
     */
    public getSubscriberCount(deviceUrl: string): number {
        return this.devices.get(deviceUrl)?.subscribers.size ?? 0;
    }

    private getOrCreateEntry(deviceUrl: string): DevicePollEntry {
        const existing = this.devices.get(deviceUrl);
        if (existing !== undefined) {
            return existing;
        }

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

    private ensurePolling(deviceUrl: string): void {
        const entry = this.devices.get(deviceUrl);
        if (entry?.intervalHandle !== null) {
            return;
        }
        this.startPolling(deviceUrl);
    }

    private startPolling(deviceUrl: string): void {
        const entry = this.devices.get(deviceUrl);
        if (entry === undefined) {
            return;
        }

        Logger.debug({ deviceUrl }, 'Starting signal polling');
        void this.poll(deviceUrl);

        entry.intervalHandle = setInterval(() => {
            void this.poll(deviceUrl);
        }, POLL_INTERVAL_MS);

        entry.pingHandle = setInterval(() => {
            this.dispatchPing(deviceUrl);
        }, PING_INTERVAL_MS);
    }

    private stopPolling(deviceUrl: string): void {
        const entry = this.devices.get(deviceUrl);
        if (entry === undefined) {
            return;
        }

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

    private async poll(deviceUrl: string): Promise<void> {
        const entry = this.devices.get(deviceUrl);
        if (entry === undefined || entry.subscribers.size === 0) {
            return;
        }

        let statusJson: TunerStatusResponse;

        try {
            const response = await this.fetchWithTimeout(`${deviceUrl}/status.json`, FETCH_TIMEOUT_MS);
            statusJson = await response.json() as TunerStatusResponse;
        } catch (error) {
            const errorType = error instanceof Error && error.name === 'AbortError' ? 'timeout' : 'unreachable';
            Logger.warn({ deviceUrl, errorType }, 'Device fetch failed');

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
                this.dispatchToSubscribers({
                    entry,
                    resource: tuner.resource,
                    tunerId: tuner.tunerId,
                    sseText: formatSseEvent('signal', errorEvent),
                });
            }
            return;
        }

        for (const [, tuner] of entry.trackedTuners) {
            const statusEntry = parseStatusJson(statusJson, tuner.resource);
            if (statusEntry === null) {
                continue;
            }

            this.dispatchSignalEvent({ entry, statusEntry, tunerId: tuner.tunerId });
            await this.dispatchStreamInfoIfChanged({ entry, statusEntry, tunerId: tuner.tunerId, deviceUrl });
            await this.dispatchAtsc3IfLocked({ entry, statusEntry, tunerId: tuner.tunerId, deviceUrl });
        }
    }

    private dispatchSignalEvent(
        options: DispatchEventOptions & { statusEntry: NonNullable<ReturnType<typeof parseStatusJson>> },
    ): void {
        const { entry, statusEntry, tunerId } = options;
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

        this.dispatchToSubscribers({
            entry,
            resource: statusEntry.Resource,
            tunerId,
            sseText: formatSseEvent('signal', event),
        });
    }

    private async dispatchStreamInfoIfChanged(options: DispatchStreamInfoOptions): Promise<void> {
        const { entry, statusEntry, tunerId, deviceUrl } = options;
        const { Resource: resource, VctNumber: currentVct, VctName: vctName } = statusEntry;

        if (currentVct === entry.lastVctNumber.get(resource)) {
            return;
        }

        entry.lastVctNumber.set(resource, currentVct);

        if (currentVct === undefined) {
            return;
        }

        const tunerNum = resource.replace('tuner', '');

        try {
            const response = await this.fetchWithTimeout(
                `${deviceUrl}/tuner${tunerNum}/streaminfo`,
                FETCH_TIMEOUT_MS,
            );
            const event: StreamInfoSseEvent = {
                event: 'streaminfo',
                tunerId,
                programs: groupStreamInfoByProgram(parseStreamInfo(await response.text()), vctName),
            };
            this.dispatchToSubscribers({
                entry,
                resource,
                tunerId,
                sseText: formatSseEvent('streaminfo', event),
            });
        } catch (error) {
            Logger.warn({ deviceUrl, resource, error }, 'Failed to fetch streaminfo');
        }
    }

    private async dispatchAtsc3IfLocked(options: DispatchAtsc3Options): Promise<void> {
        const { entry, statusEntry, tunerId, deviceUrl } = options;
        const { Resource: resource } = statusEntry;
        const tunerNum = resource.replace('tuner', '');

        let currentLockType: string | null;

        try {
            const response = await this.fetchWithTimeout(
                `${deviceUrl}/tuner${tunerNum}/status`,
                FETCH_TIMEOUT_MS,
            );
            currentLockType = parseTunerLockStatus(await response.text()).lock;
        } catch {
            // Lock status unavailable — skip ATSC 3.0 check entirely
            return;
        }

        if (currentLockType === entry.lastLockType.get(resource)) {
            return;
        }

        entry.lastLockType.set(resource, currentLockType);

        // Type guard: null check + substring check satisfy both strict-boolean and optional-chain rules
        const lockString = currentLockType ?? '';
        if (!lockString.includes('atsc3')) {
            return;
        }

        await Promise.all([
            this.fetchAtsc3Plp({
                entry,
                resource,
                tunerId,
                url: `${deviceUrl}/tuner${tunerNum}/atsc3/plpinfo`,
            }),
            this.fetchAtsc3L1({
                entry,
                resource,
                tunerId,
                url: `${deviceUrl}/tuner${tunerNum}/atsc3/l1info`,
            }),
        ]);
    }

    private async fetchAtsc3Plp(options: Atsc3FetchOptions): Promise<void> {
        const { entry, resource, tunerId, url } = options;
        try {
            const response = await this.fetchWithTimeout(url, FETCH_TIMEOUT_MS);
            const event: Atsc3PlpSseEvent = {
                event: 'atsc3plp',
                tunerId,
                ...parseAtsc3Plp(await response.text()),
            };
            this.dispatchToSubscribers({
                entry,
                resource,
                tunerId,
                sseText: formatSseEvent('atsc3plp', event),
            });
        } catch (fetchError) {
            Logger.debug({ url, fetchError }, 'ATSC 3.0 PLP endpoint not available');
        }
    }

    private async fetchAtsc3L1(options: Atsc3FetchOptions): Promise<void> {
        const { entry, resource, tunerId, url } = options;
        try {
            const response = await this.fetchWithTimeout(url, FETCH_TIMEOUT_MS);
            const event: Atsc3L1SseEvent = {
                event: 'atsc3l1',
                tunerId,
                ...parseAtsc3L1(await response.text()),
            };
            this.dispatchToSubscribers({
                entry,
                resource,
                tunerId,
                sseText: formatSseEvent('atsc3l1', event),
            });
        } catch (fetchError) {
            Logger.debug({ url, fetchError }, 'ATSC 3.0 L1 endpoint not available');
        }
    }

    private dispatchPing(deviceUrl: string): void {
        const entry = this.devices.get(deviceUrl);
        if (entry === undefined) {
            return;
        }

        const pingData = formatSseEvent('ping', {});

        for (const [, subscriber] of entry.subscribers) {
            this.enqueueToController(subscriber.controller, pingData);
        }
    }

    private dispatchToSubscribers(options: DispatchToSubscribersOptions): void {
        const { entry, resource, tunerId, sseText } = options;

        for (const [, subscriber] of entry.subscribers) {
            const isWildcard = subscriber.resource === WILDCARD_RESOURCE;
            const isMatch = subscriber.resource === resource && subscriber.tunerId === tunerId;

            if (isWildcard || isMatch) {
                this.enqueueToController(subscriber.controller, sseText);
            }
        }
    }

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

let pollerInstance: SignalPollingManager | null = null;

/**
 * Get the singleton SignalPollingManager instance.
 *
 * Module-level caching ensures one instance per Next.js server process.
 */
export function getSignalPoller(): SignalPollingManager {
    pollerInstance ??= new SignalPollingManager();
    return pollerInstance;
}
