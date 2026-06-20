/**
 * SSE dispatch utilities for HDHomeRun signal polling.
 *
 * Low-level helpers for encoding and routing Server-Sent Events to subscriber
 * controllers, plus a timeout-aware fetch wrapper. Extracted from signal-poller
 * to keep that module within the 500-line file-length budget.
 *
 * @module sse-dispatch
 */

import { formatSseEvent, parseAtsc3Plp, parseAtsc3L1 } from './signal-parsers';
import type { Atsc3PlpSseEvent, Atsc3L1SseEvent } from './signal-parsers';
import Logger from '@/lib/logger';

/** Sentinel resource value used by antenna-mode (wildcard) subscribers */
export const WILDCARD_RESOURCE = '*';

/**
 * A single SSE subscriber for one device.
 * Identified by `id` (UUID), routes events by `resource` and `tunerId`.
 * Wildcard subscribers have `resource === WILDCARD_RESOURCE`.
 */
export interface SseSubscriber {
    id: string;
    controller: ReadableStreamDefaultController<Uint8Array>;
    tunerId: number;
    resource: string;
}

/**
 * Options for {@link enqueueToController}.
 */
export interface EnqueueOptions {
    /** The stream controller to write to */
    controller: ReadableStreamDefaultController<Uint8Array>;
    /** UTF-8 text to encode and enqueue */
    text: string;
    /** Shared TextEncoder instance */
    encoder: TextEncoder;
}

/**
 * Encode `text` and enqueue it to a ReadableStream controller.
 * Silently swallows errors caused by already-closed streams.
 *
 * @param options - Controller, text, and encoder
 */
export function enqueueToController(options: EnqueueOptions): void {
    const { controller, text, encoder } = options;
    try {
        controller.enqueue(encoder.encode(text));
    } catch (error) {
        Logger.debug({ error }, 'Failed to enqueue SSE data — stream may be closed');
    }
}

/**
 * Options for {@link dispatchToSubscribers}.
 */
export interface DispatchToSubscribersOptions {
    /** Subscriber map for the device — iterated to find matching recipients */
    subscribers: Map<string, SseSubscriber>;
    /** HDHomeRun resource name (e.g. "tuner0") — used for routing */
    resource: string;
    /** DB tuner ID — used for routing non-wildcard subscribers */
    tunerId: number;
    /** Pre-formatted SSE wire text to enqueue */
    sseText: string;
    /** Encoder shared with the caller (avoid allocating a new one per call) */
    encoder: TextEncoder;
}

/**
 * Enqueue an SSE event to every subscriber that matches `resource`/`tunerId`,
 * plus all wildcard subscribers. Silently ignores closed streams.
 *
 * @param options - Dispatch context including subscriber map, routing info, and payload
 */
export function dispatchToSubscribers(options: DispatchToSubscribersOptions): void {
    const { subscribers, resource, tunerId, sseText, encoder } = options;

    for (const [, subscriber] of subscribers) {
        const isWildcard = subscriber.resource === WILDCARD_RESOURCE;
        const isMatch = subscriber.resource === resource && subscriber.tunerId === tunerId;

        if (isWildcard || isMatch) {
            enqueueToController({ controller: subscriber.controller, text: sseText, encoder });
        }
    }
}

/**
 * Dispatch a keepalive ping event to every subscriber for a device.
 *
 * @param subscribers - Subscriber map for the device
 * @param encoder - Shared TextEncoder instance
 */
export function dispatchPing(
    subscribers: Map<string, SseSubscriber>,
    encoder: TextEncoder,
): void {
    const text = formatSseEvent('ping', {});

    for (const [, subscriber] of subscribers) {
        enqueueToController({ controller: subscriber.controller, text, encoder });
    }
}

/**
 * Perform a `fetch` that aborts automatically after `timeoutMs` milliseconds.
 *
 * @param url - URL to fetch
 * @param timeoutMs - Abort timeout in milliseconds
 * @returns The fetch Response
 * @throws {DOMException} With `name === "AbortError"` if the timeout fires first
 */
export async function fetchWithTimeout(url: string, timeoutMs: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
        return await fetch(url, { signal: controller.signal });
    } finally {
        clearTimeout(timer);
    }
}

/**
 * Options for {@link fetchAtsc3Plp} and {@link fetchAtsc3L1}.
 */
export interface Atsc3FetchDispatchOptions {
    /** Subscriber map for the device — passed to dispatchToSubscribers */
    subscribers: Map<string, SseSubscriber>;
    /** HDHomeRun resource name (e.g. "tuner0") — used for event routing */
    resource: string;
    /** DB tuner ID — used for event routing */
    tunerId: number;
    /** Fully-qualified URL to fetch (plpinfo or l1info endpoint) */
    url: string;
    /** Fetch timeout in milliseconds */
    timeoutMs: number;
    /** Shared TextEncoder instance */
    encoder: TextEncoder;
}

/**
 * Fetch `/tuner{N}/atsc3/plpinfo` and dispatch an `atsc3plp` SSE event.
 * Silently swallows fetch and parse errors (endpoint absent on non-ATSC3 devices).
 *
 * @param options - Dispatch context plus plpinfo endpoint URL
 */
export async function fetchAtsc3Plp(options: Atsc3FetchDispatchOptions): Promise<void> {
    const { subscribers, resource, tunerId, url, timeoutMs, encoder } = options;
    try {
        const response = await fetchWithTimeout(url, timeoutMs);
        const event: Atsc3PlpSseEvent = {
            event: 'atsc3plp',
            tunerId,
            ...parseAtsc3Plp(await response.text()),
        };
        dispatchToSubscribers({
            subscribers, resource, tunerId,
            sseText: formatSseEvent('atsc3plp', event),
            encoder,
        });
    } catch (fetchError) {
        Logger.debug({ url, fetchError }, 'ATSC 3.0 PLP endpoint not available');
    }
}

/**
 * Fetch `/tuner{N}/atsc3/l1info` and dispatch an `atsc3l1` SSE event.
 * Silently swallows fetch and parse errors (endpoint absent on non-ATSC3 devices).
 *
 * @param options - Dispatch context plus l1info endpoint URL
 */
export async function fetchAtsc3L1(options: Atsc3FetchDispatchOptions): Promise<void> {
    const { subscribers, resource, tunerId, url, timeoutMs, encoder } = options;
    try {
        const response = await fetchWithTimeout(url, timeoutMs);
        const event: Atsc3L1SseEvent = {
            event: 'atsc3l1',
            tunerId,
            ...parseAtsc3L1(await response.text()),
        };
        dispatchToSubscribers({
            subscribers, resource, tunerId,
            sseText: formatSseEvent('atsc3l1', event),
            encoder,
        });
    } catch (fetchError) {
        Logger.debug({ url, fetchError }, 'ATSC 3.0 L1 endpoint not available');
    }
}
