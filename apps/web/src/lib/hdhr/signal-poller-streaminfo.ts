/**
 * Streaminfo dispatch utilities for SignalPollingManager.
 *
 * Extracted from signal-poller.ts to keep that file within the 500-line limit.
 * All functions here are pure async functions — they receive all needed state
 * as parameters rather than relying on `this`.
 *
 * @module signal-poller-streaminfo
 */

import {
    parseStreamInfo,
    groupStreamInfoByProgram,
    createLineupFallbackProgram,
    formatSseEvent,
} from './signal-parsers';
import type { StreamInfoSseEvent } from './signal-parsers';
import type { ChannelInfo } from './types';
import {
    dispatchToSubscribers,
    fetchWithTimeout,
} from './sse-dispatch';
import type { SseSubscriber } from './sse-dispatch';
import { nativeGet } from './native-protocol';
import Logger from '@/lib/logger';

/** Fetch timeout in milliseconds — shared constant for all streaminfo fetches */
const FETCH_TIMEOUT_MS = 3_000;

/**
 * Minimal subset of DevicePollEntry needed for streaminfo dispatch operations.
 * Avoids circular imports by not requiring the full type from signal-poller.ts.
 */
export interface StreamInfoEntry {
    deviceUrl: string;
    subscribers: Map<string, SseSubscriber>;
    lastVctNumber: Map<string, string | undefined>;
    lineupCache: ChannelInfo[] | null;
    setLineupCache: (data: ChannelInfo[]) => void;
}

/** Options for {@link dispatchStreamInfoIfChanged} */
export interface StreamInfoDispatchOptions {
    /** The minimal entry state needed for streaminfo dispatch */
    entry: StreamInfoEntry;
    /** Resource name, e.g. "tuner0" */
    resource: string;
    /** Current VctNumber from status.json */
    currentVct: string | undefined;
    /** Current VctName from status.json */
    vctName: string | undefined;
    /** HD Homey database tuner ID */
    tunerId: number;
    /** Full device URL, e.g. "http://192.168.1.100" */
    deviceUrl: string;
    /** Encoder for SSE output */
    encoder: TextEncoder;
}

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

/**
 * Dispatch a streaminfo SSE event with the given programs.
 *
 * @param opts - Dispatch target and program data
 */
function dispatchStreamInfoEvent(opts: {
    entry: StreamInfoEntry;
    resource: string;
    tunerId: number;
    vctName: string | undefined;
    rawText: string;
    encoder: TextEncoder;
}): void {
    const { entry, resource, tunerId, vctName, rawText, encoder } = opts;
    const event: StreamInfoSseEvent = {
        event: 'streaminfo',
        tunerId,
        programs: groupStreamInfoByProgram(parseStreamInfo(rawText), vctName),
    };
    dispatchToSubscribers({
        subscribers: entry.subscribers,
        resource,
        tunerId,
        sseText: formatSseEvent('streaminfo', event),
        encoder,
    });
}

/** Options for the native TCP streaminfo fallback. */
interface NativeStreamInfoOptions {
    deviceUrl: string;
    tunerNum: string;
    resource: string;
    tunerId: number;
    vctName: string | undefined;
    entry: StreamInfoEntry;
    encoder: TextEncoder;
}

/**
 * Attempt to fetch streaminfo via native TCP protocol (port 65001).
 *
 * @param options - Native streaminfo fetch context
 * @returns True if native succeeded and SSE was dispatched; false on any failure
 */
async function tryNativeStreamInfo(options: NativeStreamInfoOptions): Promise<boolean> {
    const { deviceUrl, tunerNum, resource, tunerId, vctName, entry, encoder } = options;
    const deviceHostname = extractHostname(deviceUrl);
    try {
        const nativeText = await nativeGet({ deviceIp: deviceHostname, variable: `/tuner${tunerNum}/streaminfo` });
        dispatchStreamInfoEvent({ entry, resource, tunerId, vctName, rawText: nativeText, encoder });
        return true;
    } catch (nativeError) {
        Logger.warn(
            { deviceUrl, resource, nativeError },
            'Native protocol streaminfo failed; trying lineup fallback',
        );
        return false;
    }
}

/** Options for the lineup.json fallback. */
interface LineupFallbackOptions {
    entry: StreamInfoEntry;
    tunerId: number;
    resource: string;
    deviceUrl: string;
    currentVct: string;
    vctName: string | undefined;
    encoder: TextEncoder;
}

/**
 * Attempt to build synthetic stream-info from lineup.json when streaminfo is unavailable.
 * Caches the lineup per device; silently swallows fetch/parse failures.
 *
 * @param options - Dispatch context and current virtual channel number
 */
async function tryLineupFallback(options: LineupFallbackOptions): Promise<void> {
    const { entry, tunerId, resource, deviceUrl, currentVct, vctName, encoder } = options;

    try {
        let lineupData: ChannelInfo[];
        if (entry.lineupCache !== null) {
            lineupData = entry.lineupCache;
        } else {
            const lineupResponse = await fetchWithTimeout(`${deviceUrl}/lineup.json`, FETCH_TIMEOUT_MS);
            lineupData = await lineupResponse.json() as ChannelInfo[];
            entry.setLineupCache(lineupData);
        }

        const programs = createLineupFallbackProgram({ guideNumber: currentVct, vctName, lineupData });
        if (programs.length > 0) {
            const event: StreamInfoSseEvent = { event: 'streaminfo', tunerId, programs };
            dispatchToSubscribers({
                subscribers: entry.subscribers,
                resource,
                tunerId,
                sseText: formatSseEvent('streaminfo', event),
                encoder,
            });
        }
    } catch (lineupError) {
        Logger.debug({ deviceUrl, lineupError }, 'Lineup fallback unavailable');
    }
}

/**
 * Fetch and dispatch streaminfo for a tuner when VctNumber changes.
 *
 * Tries HTTP first, then native TCP protocol, then lineup.json — each
 * step only reached when the previous one fails.
 *
 * @param options - All context needed to fetch and dispatch streaminfo
 */
export async function dispatchStreamInfoIfChanged(options: StreamInfoDispatchOptions): Promise<void> {
    const { entry, resource, currentVct, vctName, tunerId, deviceUrl, encoder } = options;

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
        const response = await fetchWithTimeout(`${deviceUrl}/tuner${tunerNum}/streaminfo`, FETCH_TIMEOUT_MS);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: streaminfo unavailable`);
        }
        dispatchStreamInfoEvent({ entry, resource, tunerId, vctName, rawText: await response.text(), encoder });
    } catch (error) {
        Logger.warn({ deviceUrl, resource, error }, 'Failed to fetch streaminfo');
        const deviceHostname = extractHostname(deviceUrl);
        const nativeOk = deviceHostname !== '' && await tryNativeStreamInfo({
            deviceUrl, tunerNum, resource, tunerId, vctName, entry, encoder,
        });
        if (!nativeOk) {
            await tryLineupFallback({ entry, tunerId, resource, deviceUrl, currentVct, vctName, encoder });
        }
    }
}
