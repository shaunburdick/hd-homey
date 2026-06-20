/**
 * Signal Polling Manager — Singleton for HDHomeRun device signal polling.
 * One poll timer per device IP; fanned out to all SSE subscribers.
 *
 * @module signal-poller
 */

import {
    parseStatusJson,
    parseStreamInfo,
    groupStreamInfoByProgram,
    parseTunerLockStatus,
    formatSseEvent,
    createLineupFallbackProgram,
} from './signal-parsers';
import type { SignalSseEvent, StreamInfoSseEvent } from './signal-parsers';
import type { TunerStatusResponse, ChannelInfo } from './types';
import { validateDeviceUrl } from './device-url';
import {
    WILDCARD_RESOURCE,
    dispatchToSubscribers,
    dispatchPing,
    fetchWithTimeout,
    fetchAtsc3Plp,
    fetchAtsc3L1,
} from './sse-dispatch';
import type { SseSubscriber } from './sse-dispatch';
import Logger from '@/lib/logger';

const POLL_INTERVAL_MS = 2_000;
const PING_INTERVAL_MS = 30_000;
const FETCH_TIMEOUT_MS = 3_000;

export { validateDeviceUrl } from './device-url';

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
    /** Cached lineup.json response. Null until first successful fetch. */
    lineupCache: ChannelInfo[] | null;
}

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

interface DispatchStreamInfoOptions extends DispatchEventOptions {
    statusEntry: NonNullable<ReturnType<typeof parseStatusJson>>;
    deviceUrl: string;
}

interface LineupFallbackDispatchOptions extends DispatchEventOptions {
    resource: string;
    deviceUrl: string;
    currentVct: string;
    vctName: string | undefined;
}

/** Reuse DispatchStreamInfoOptions — same shape as DispatchAtsc3Options */
type DispatchAtsc3Options = DispatchStreamInfoOptions;

interface SubscribeAllOptions {
    deviceUrl: string;
    tunersToTrack: TrackedTuner[];
    controller: ReadableStreamDefaultController<Uint8Array>;
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
            lineupCache: null,
        };
        this.devices.set(deviceUrl, entry);
        return entry;
    }

    /** Discover untracked tuner slots from /status.json and register them with synthetic IDs. */
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
            dispatchPing(entry.subscribers, this.encoder);
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
            const response = await fetchWithTimeout(`${deviceUrl}/status.json`, FETCH_TIMEOUT_MS);
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
                dispatchToSubscribers({
                    subscribers: entry.subscribers,
                    resource: tuner.resource,
                    tunerId: tuner.tunerId,
                    sseText: formatSseEvent('signal', errorEvent),
                    encoder: this.encoder,
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

        dispatchToSubscribers({
            subscribers: entry.subscribers,
            resource: statusEntry.Resource,
            tunerId,
            sseText: formatSseEvent('signal', event),
            encoder: this.encoder,
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
            const response = await fetchWithTimeout(
                `${deviceUrl}/tuner${tunerNum}/streaminfo`,
                FETCH_TIMEOUT_MS,
            );

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: streaminfo unavailable`);
            }

            const event: StreamInfoSseEvent = {
                event: 'streaminfo',
                tunerId,
                programs: groupStreamInfoByProgram(parseStreamInfo(await response.text()), vctName),
            };
            dispatchToSubscribers({
                subscribers: entry.subscribers,
                resource,
                tunerId,
                sseText: formatSseEvent('streaminfo', event),
                encoder: this.encoder,
            });
        } catch (error) {
            Logger.warn({ deviceUrl, resource, error }, 'Failed to fetch streaminfo');
            await this.tryLineupFallback({ entry, tunerId, resource, deviceUrl, currentVct, vctName });
        }
    }

    /**
     * Attempt to build synthetic stream-info from lineup.json when `/tuner{N}/streaminfo`
     * is unavailable. Caches the lineup per device; silently swallows fetch/parse failures.
     *
     * @param options - Dispatch context plus the current virtual channel number
     */
    private async tryLineupFallback(options: LineupFallbackDispatchOptions): Promise<void> {
        const { entry, tunerId, resource, deviceUrl, currentVct, vctName } = options;

        try {
            const lineupData: ChannelInfo[] = entry.lineupCache ?? await (async () => {
                const lineupResponse = await fetchWithTimeout(
                    `${deviceUrl}/lineup.json`,
                    FETCH_TIMEOUT_MS,
                );
                const parsed = await lineupResponse.json() as ChannelInfo[];
                entry.lineupCache = parsed;
                return parsed;
            })();

            const programs = createLineupFallbackProgram({
                guideNumber: currentVct,
                vctName,
                lineupData,
            });

            if (programs.length > 0) {
                const event: StreamInfoSseEvent = {
                    event: 'streaminfo',
                    tunerId,
                    programs,
                };
                dispatchToSubscribers({
                    subscribers: entry.subscribers,
                    resource,
                    tunerId,
                    sseText: formatSseEvent('streaminfo', event),
                    encoder: this.encoder,
                });
            }
        } catch (lineupError) {
            Logger.debug({ deviceUrl, lineupError }, 'Lineup fallback unavailable');
        }
    }

    private async dispatchAtsc3IfLocked(options: DispatchAtsc3Options): Promise<void> {
        const { entry, statusEntry, tunerId, deviceUrl } = options;
        const { Resource: resource } = statusEntry;
        const match = /^tuner(\d+)$/.exec(resource);
        const tunerNum = match !== null ? match[1] : '0';

        let currentLockType: string | null;

        try {
            const response = await fetchWithTimeout(
                `${deviceUrl}/tuner${tunerNum}/status`,
                FETCH_TIMEOUT_MS,
            );
            currentLockType = parseTunerLockStatus(await response.text()).lock;
        } catch {
            return;
        }

        if (currentLockType === entry.lastLockType.get(resource)) {
            return;
        }

        entry.lastLockType.set(resource, currentLockType);

        const lockString = currentLockType ?? '';
        if (!lockString.includes('atsc3')) {
            return;
        }

        await Promise.all([
            fetchAtsc3Plp({
                subscribers: entry.subscribers,
                resource,
                tunerId,
                url: `${deviceUrl}/tuner${tunerNum}/atsc3/plpinfo`,
                timeoutMs: FETCH_TIMEOUT_MS,
                encoder: this.encoder,
            }),
            fetchAtsc3L1({
                subscribers: entry.subscribers,
                resource,
                tunerId,
                url: `${deviceUrl}/tuner${tunerNum}/atsc3/l1info`,
                timeoutMs: FETCH_TIMEOUT_MS,
                encoder: this.encoder,
            }),
        ]);
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
