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

/** Loopback and link-local hostnames/addresses that must not be polled */
const BLOCKED_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

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
 * Validate that a device URL is a safe HTTP URL targeting an HDHomeRun device.
 *
 * Defense-in-depth check applied before any outbound fetch. Ensures:
 * - URL is parseable
 * - Protocol is `http:` (HDHomeRun devices are HTTP-only)
 * - Hostname is not a loopback or link-local address
 *
 * @param url - Device URL to validate
 * @throws {Error} If the URL fails any validation check
 */
export function validateDeviceUrl(url: string): void {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        throw new Error(`Invalid device URL: "${url}" is not a valid URL`);
    }

    if (parsed.protocol !== 'http:') {
        throw new Error(
            `Invalid device URL protocol: expected "http:", got "${parsed.protocol}". ` +
            'HDHomeRun devices only support HTTP.',
        );
    }

    if (BLOCKED_HOSTNAMES.has(parsed.hostname)) {
        throw new Error(
            `Blocked device URL: "${parsed.hostname}" is a loopback address and cannot be used as a device URL.`,
        );
    }

    // Block link-local IPv4 (169.254.x.x) and IPv6 link-local (fe80::)
    if (parsed.hostname.startsWith('169.254.') || parsed.hostname.toLowerCase().startsWith('fe80')) {
        throw new Error(
            `Blocked device URL: "${parsed.hostname}" is a link-local address and cannot be used as a device URL.`,
        );
    }
}

/**
 * Singleton manager for HDHomeRun device signal polling.
 *
 * Maintains one poll timer per device and fans events to all subscribers.
 * Auto-discovers all physical tuners from /status.json on each poll cycle,
 * ensuring all tuner slots (tuner0–tuner3) are tracked even when the DB
 * only has one record per device.
 */
export class SignalPollingManager {
    private readonly devices = new Map<string, DevicePollEntry>();
    private readonly encoder = new TextEncoder();
    /** Global counter for synthetic tuner IDs assigned to auto-discovered resources */
    private nextSyntheticId = -1;

    /**
     * Subscribe a single-tuner SSE client.
     *
     * @param options - Subscribe options including device URL, tuner ID, resource, and controller
     * @throws {Error} If `deviceUrl` fails SSRF validation
     * @returns subscriberId — pass to unsubscribe() on disconnect
     */
    public subscribe(options: SubscribeOptions): string {
        const { deviceUrl, tunerDbId, resource, controller } = options;
        validateDeviceUrl(deviceUrl);
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
     * @param options - Subscribe-all options including device URL, tuners to track, and controller
     * @throws {Error} If `deviceUrl` fails SSRF validation
     * @returns subscriberId
     */
    public subscribeAll(options: SubscribeAllOptions): string {
        const { deviceUrl, tunersToTrack, controller } = options;
        validateDeviceUrl(deviceUrl);
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
     *
     * @param deviceUrl - Device base URL the subscriber is registered for
     * @param subscriberId - ID returned by subscribe() or subscribeAll()
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
     *
     * @param deviceUrl - Device base URL to check
     * @returns Number of active subscribers (0 if device is unknown)
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

    /**
     * Discover untracked tuner slots from /status.json and add them to trackedTuners
     * with globally unique synthetic IDs (negative). Handles variable-slot devices.
     */
    private autoDiscoverTuners(entry: DevicePollEntry, statusJson: TunerStatusResponse): void {
        for (const statusEntry of statusJson) {
            const { Resource: resource } = statusEntry;
            if (resource === undefined || entry.trackedTuners.has(resource)) {
                continue;
            }

            const match = /^tuner(\d+)$/.exec(resource);
            if (match === null) {
                Logger.warn({ deviceUrl: entry.deviceUrl, resource }, 'Skipping unknown resource');
                continue;
            }

            const syntheticId = this.nextSyntheticId--;
            entry.trackedTuners.set(resource, { tunerId: syntheticId, resource });
            Logger.debug(
                { deviceUrl: entry.deviceUrl, resource, syntheticId },
                'Auto-discovered tuner slot',
            );
        }
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

        // Auto-discover any untracked tuner slots from /status.json (handles 1/2/4 tuner devices).
        this.autoDiscoverTuners(entry, statusJson);

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

        const match = /^tuner(\d+)$/.exec(resource);
        const tunerNum = match !== null ? match[1] : '0';

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
        const match = /^tuner(\d+)$/.exec(resource);
        const tunerNum = match !== null ? match[1] : '0';

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
            controller.enqueue(this.encoder.encode(text));
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
