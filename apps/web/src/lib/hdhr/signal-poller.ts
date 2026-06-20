/**
 * Signal Polling Manager — Singleton for HDHomeRun device signal polling.
 * One poll timer per device IP; fanned out to all SSE subscribers.
 *
 * Streaminfo dispatch (HTTP + native TCP + lineup fallback) is extracted
 * into `signal-poller-streaminfo.ts` to keep this file within the 500-line limit.
 *
 * @module signal-poller
 */

import {
    parseStatusJson,
    parseTunerLockStatus,
    formatSseEvent,
    parseDebugStatus,
} from './signal-parsers';
import type { SignalSseEvent, DebugSseEvent } from './signal-parsers';
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
import { nativeGet } from './native-protocol';
import type { NativeProtocolError } from './native-protocol';
import {
    dispatchStreamInfoIfChanged,
} from './signal-poller-streaminfo';
import type { StreamInfoEntry } from './signal-poller-streaminfo';
import Logger from '@/lib/logger';

const POLL_INTERVAL_MS = 2_000;
const PING_INTERVAL_MS = 30_000;
const FETCH_TIMEOUT_MS = 3_000;

export { validateDeviceUrl } from './device-url';

/**
 * Extract the bare hostname/IP from a device URL string.
 *
 * @param deviceUrl - Full device URL (e.g. "http://192.168.1.100")
 * @returns Hostname or IP string, or empty string if parsing fails
 */
function extractHostname(deviceUrl: string): string {
    try {
        return new URL(deviceUrl).hostname;
    } catch {
        return '';
    }
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

interface DispatchStatusOptions extends DispatchEventOptions {
    statusEntry: NonNullable<ReturnType<typeof parseStatusJson>>;
    deviceUrl: string;
}

/** Reuse DispatchStatusOptions — same shape as DispatchAtsc3Options */
type DispatchAtsc3Options = DispatchStatusOptions;

interface SubscribeAllOptions {
    deviceUrl: string;
    tunersToTrack: TrackedTuner[];
    controller: ReadableStreamDefaultController<Uint8Array>;
}

/**
 * Adapt a DevicePollEntry to the StreamInfoEntry interface required by
 * the streaminfo dispatch module.
 *
 * @param entry - Full device poll entry
 * @returns Minimal StreamInfoEntry view
 */
function asStreamInfoEntry(entry: DevicePollEntry): StreamInfoEntry {
    return {
        deviceUrl: entry.deviceUrl,
        subscribers: entry.subscribers,
        lastVctNumber: entry.lastVctNumber,
        lineupCache: entry.lineupCache,
        setLineupCache: (data) => {
            entry.lineupCache = data;
        },
    };
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

    /**
     * Dispatch error signal events to all tracked tuners when the device status fetch fails.
     *
     * @param entry - Device poll entry with subscriber and tuner state
     * @param errorType - Error classification: 'timeout' or 'unreachable'
     */
    private dispatchFetchError(entry: DevicePollEntry, errorType: 'timeout' | 'unreachable'): void {
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
            this.dispatchFetchError(entry, errorType);
            return;
        }

        this.autoDiscoverTuners(entry, statusJson);

        for (const [, tuner] of entry.trackedTuners) {
            const statusEntry = parseStatusJson(statusJson, tuner.resource);
            if (statusEntry === null) {
                continue;
            }

            this.dispatchSignalEvent({ entry, statusEntry, tunerId: tuner.tunerId });
            await dispatchStreamInfoIfChanged({
                entry: asStreamInfoEntry(entry),
                resource: statusEntry.Resource,
                currentVct: statusEntry.VctNumber,
                vctName: statusEntry.VctName,
                tunerId: tuner.tunerId,
                deviceUrl,
                encoder: this.encoder,
            });
            await this.dispatchAtsc3IfLocked({ entry, statusEntry, tunerId: tuner.tunerId, deviceUrl });

            // Best-effort debug polling — void to avoid blocking the poll cycle.
            if (statusEntry.VctNumber !== undefined) {
                void this.dispatchDebugEvent({ entry, statusEntry, tunerId: tuner.tunerId, deviceUrl });
            }
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

    /**
     * Query `/tuner{N}/debug` via the native protocol and dispatch a `debug` SSE event.
     * Best-effort — failures are logged at DEBUG level and silently swallowed.
     * Only called for active (non-idle) tuners.
     *
     * @param options - Dispatch context including device URL, status entry, and tuner ID
     */
    private async dispatchDebugEvent(options: DispatchStatusOptions): Promise<void> {
        const { entry, statusEntry, tunerId, deviceUrl } = options;
        const { Resource: resource } = statusEntry;
        const match = /^tuner(\d+)$/.exec(resource);
        const tunerNum = match !== null ? match[1] : '0';

        const deviceHostname = extractHostname(deviceUrl);
        if (deviceHostname === '') {
            return;
        }

        try {
            const debugText = await nativeGet({ deviceIp: deviceHostname, variable: `/tuner${tunerNum}/debug` });
            const event: DebugSseEvent = {
                event: 'debug',
                tunerId,
                debug: parseDebugStatus(debugText),
            };
            dispatchToSubscribers({
                subscribers: entry.subscribers,
                resource,
                tunerId,
                sseText: formatSseEvent('debug', event),
                encoder: this.encoder,
            });
        } catch (debugError) {
            const nativeErr = debugError as Partial<NativeProtocolError>;
            Logger.debug(
                { deviceUrl, resource, code: nativeErr.code, message: nativeErr.message },
                'Debug native query failed — skipping debug event for this cycle',
            );
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
