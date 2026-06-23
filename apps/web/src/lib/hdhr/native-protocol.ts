/**
 * HDHomeRun Native Control Protocol — TCP client for get/set operations.
 *
 * Provides `nativeGet` and `nativeSet` — the public API for querying and
 * setting HDHomeRun device variables over the native TCP control protocol
 * (port 65001).
 *
 * Packet encoding/decoding is handled by `native-protocol-codec.ts`.
 * This module owns only the TCP lifecycle: connect, send, accumulate, parse,
 * settle, and tear down.
 *
 * Protocol reference: libhdhomerun/hdhomerun_pkt.h and hdhomerun_pkt.c
 * (https://github.com/Silicondust/libhdhomerun)
 *
 * @module native-protocol
 */

import * as net from 'node:net';
import {
    MAX_PACKET_SIZE,
    HEADER_LENGTH,
    CRC_LENGTH,
    makeNativeError,
    encodeGetRequest,
    encodeSetRequest,
    decodeResponse,
} from './native-protocol-codec';

export type { NativeProtocolErrorCode, NativeProtocolError } from './native-protocol-codec';
export {
    encodeGetRequest,
    encodeSetRequest,
    decodeResponse,
    extractHostname,
    writeTlvLength,
    readTlvLength,
} from './native-protocol-codec';

import type { NativeProtocolError } from './native-protocol-codec';

// =============================================================================
// Protocol Constants
// =============================================================================

/** HDHomeRun native control protocol TCP port */
const NATIVE_PROTOCOL_PORT = 65001;

/** Default connection/operation timeout in milliseconds (libhdhomerun default) */
const DEFAULT_TIMEOUT_MS = 2500;

// =============================================================================
// Public Options Interfaces
// =============================================================================

/**
 * Options for {@link nativeGet}.
 */
export interface NativeGetOptions {
    /** Device IP address (without protocol or port) */
    deviceIp: string;
    /** Variable name to query, e.g. "/tuner0/streaminfo" */
    variable: string;
    /** Connection and read timeout in milliseconds (default: 2500 ms) */
    timeoutMs?: number;
    /** TCP port to connect to (default: 65001). Exposed for testing. */
    port?: number;
}

/**
 * Options for {@link nativeSet}.
 */
export interface NativeSetOptions {
    /** Device IP address (without protocol or port) */
    deviceIp: string;
    /** Variable name to set, e.g. "/tuner2/channel" */
    variable: string;
    /** Value to write, e.g. "auto:5.1" or "none" */
    value: string;
    /** Connection and read timeout in milliseconds (default: 2500 ms) */
    timeoutMs?: number;
    /** TCP port to connect to (default: 65001). Exposed for testing. */
    port?: number;
}

// =============================================================================
// TCP Accumulation Helper
// =============================================================================

/**
 * Attempt to parse a complete packet from an accumulated byte buffer.
 * Returns the decoded result if a complete packet is available, or null
 * if more bytes are needed.
 *
 * @param accumulated - Buffer containing all received bytes so far
 * @param accumulatedLength - Number of valid bytes in the buffer
 * @returns Decoded result, or null if incomplete
 * @throws {NativeProtocolError} On CRC mismatch or protocol error
 */
function tryParseAccumulated(
    accumulated: Buffer,
    accumulatedLength: number,
): { value?: string; error?: string } | null {
    if (accumulatedLength < HEADER_LENGTH) {
        return null;
    }

    const payloadLength = accumulated.readUInt16BE(2);
    const totalExpected = HEADER_LENGTH + payloadLength + CRC_LENGTH;

    if (accumulatedLength < totalExpected) {
        return null; // Still accumulating
    }

    return decodeResponse(accumulated.subarray(0, totalExpected));
}

// =============================================================================
// Shared TCP Client Infrastructure
// =============================================================================

/**
 * Internal state shared between TCP socket event handlers.
 */
interface SocketState {
    socket: net.Socket | null;
    settled: boolean;
    accumulated: Buffer;
    accumulatedLength: number;
}

/**
 * Options for {@link settleSocket}.
 */
interface SettleSocketOptions {
    state: SocketState;
    resolve: (value: string) => void;
    reject: (reason: NativeProtocolError) => void;
    err: NativeProtocolError | null;
    value?: string;
}

/**
 * Resolve or reject the promise once, then destroy the socket.
 *
 * @param options - State, promise callbacks, and outcome
 */
function settleSocket(options: SettleSocketOptions): void {
    const { state, resolve, reject, err, value } = options;

    if (state.settled) {
        return;
    }
    state.settled = true;

    if (state.socket !== null) {
        state.socket.destroy();
        state.socket = null;
    }

    if (err !== null) {
        reject(err);
    } else {
        resolve(value as string);
    }
}

/**
 * Options for {@link handleSocketData}.
 */
interface HandleSocketDataOptions {
    chunk: Buffer;
    state: SocketState;
    settle: (err: NativeProtocolError | null, value?: string) => void;
}

/**
 * Handle received TCP data: accumulate bytes and attempt packet parsing.
 *
 * @param options - Chunk, socket state, and settle callback
 */
function handleSocketData(options: HandleSocketDataOptions): void {
    const { chunk, state, settle } = options;
    chunk.copy(state.accumulated, state.accumulatedLength);
    state.accumulatedLength += chunk.length;

    try {
        const decoded = tryParseAccumulated(state.accumulated, state.accumulatedLength);
        if (decoded === null) {
            return; // Still accumulating — wait for more data
        }

        if (decoded.error !== undefined) {
            settle(makeNativeError('DEVICE_ERROR', `Device error: ${decoded.error}`));
        } else if (decoded.value !== undefined) {
            settle(null, decoded.value);
        } else {
            settle(makeNativeError('INVALID_RESPONSE', 'Response contains no value or error tag'));
        }
    } catch (parseError) {
        const nativeErr = parseError as Partial<NativeProtocolError>;
        if (nativeErr.name === 'NativeProtocolError') {
            settle(parseError as NativeProtocolError);
        } else {
            settle(makeNativeError('INVALID_RESPONSE', String(parseError)));
        }
    }
}

/**
 * Factory function that returns the request packet to send on connect.
 * Allows both nativeGet and nativeSet to share the TCP lifecycle.
 */
type TcpRequestFn = () => Buffer;

/**
 * Options for {@link nativeTcpRequest}.
 */
interface NativeTcpRequestOptions {
    deviceIp: string;
    timeoutMs: number;
    port: number;
    buildRequest: TcpRequestFn;
}

/**
 * Core TCP lifecycle for a single HDHomeRun native protocol exchange.
 *
 * Opens a TCP connection to `{deviceIp}:{port}`, sends the packet returned by
 * `buildRequest()` on connect, accumulates incoming bytes until a complete
 * response packet is parsed, then resolves with the value string.
 *
 * A fresh TCP connection is used per call. This is intentional: queries are
 * infrequent (on channel-change for streaminfo; ~2 s polling for debug), and
 * persistent connections would require lifecycle management that adds
 * complexity without meaningful latency benefit on a LAN.
 *
 * @param options - Connection parameters and request builder
 * @returns The variable value string returned by the device
 * @throws {NativeProtocolError} On timeout, CRC mismatch, device error, or connection failure
 */
async function nativeTcpRequest(options: NativeTcpRequestOptions): Promise<string> {
    const { deviceIp, timeoutMs, port, buildRequest } = options;

    return await new Promise<string>((resolve, reject) => {
        const state: SocketState = {
            socket: null,
            settled: false,
            accumulated: Buffer.alloc(MAX_PACKET_SIZE * 2),
            accumulatedLength: 0,
        };

        const settle = (err: NativeProtocolError | null, value?: string): void => {
            settleSocket({ state, resolve, reject, err, value });
        };

        state.socket = net.createConnection({ host: deviceIp, port });
        state.socket.setTimeout(timeoutMs);

        state.socket.on('connect', () => {
            state.socket?.write(buildRequest());
        });

        state.socket.on('data', (chunk: Buffer) => {
            handleSocketData({ chunk, state, settle });
        });

        state.socket.on('timeout', () => {
            settle(makeNativeError(
                'TIMEOUT',
                `Connection to ${deviceIp}:${port} timed out after ${timeoutMs}ms`,
            ));
        });

        state.socket.on('error', (err: NodeJS.ErrnoException) => {
            if (err.code === 'ECONNREFUSED') {
                settle(makeNativeError('CONNECTION_REFUSED', `Connection refused at ${deviceIp}:${port}`));
            } else {
                settle(makeNativeError('INVALID_RESPONSE', `Socket error: ${err.message}`));
            }
        });

        state.socket.on('close', () => {
            if (!state.settled) {
                settle(makeNativeError(
                    'INVALID_RESPONSE',
                    'Connection closed before a complete response was received',
                ));
            }
        });
    });
}

// =============================================================================
// TCP Native Get Client
// =============================================================================

/**
 * Query a named variable from an HDHomeRun device via the native TCP protocol.
 *
 * Opens a fresh TCP connection to `{options.deviceIp}:{options.port ?? 65001}`, sends a
 * GETSET_REQ packet for `options.variable`, accumulates the TCP stream until a complete
 * packet is received, verifies CRC32, and returns the value string.
 *
 * TCP does not guarantee that a single read returns a complete packet, so
 * this function implements an accumulation loop identical to the one in
 * `hdhomerun_control_recv_sock` from libhdhomerun.
 *
 * A fresh TCP connection is used per call. This is intentional: queries are
 * infrequent (on channel-change for streaminfo; ~2 s polling for debug), and
 * persistent connections would require lifecycle management that adds
 * complexity without meaningful latency benefit on a LAN.
 *
 * @param options - Device IP, variable name, and optional timeout/port overrides
 * @returns The variable value string returned by the device
 * @throws {NativeProtocolError} On timeout, CRC mismatch, device error, or connection failure
 */
export async function nativeGet(options: NativeGetOptions): Promise<string> {
    const { deviceIp, variable } = options;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const port = options.port ?? NATIVE_PROTOCOL_PORT;

    return await nativeTcpRequest({
        deviceIp,
        timeoutMs,
        port,
        buildRequest: () => encodeGetRequest(variable),
    });
}

// =============================================================================
// TCP Native Set Client
// =============================================================================

/**
 * Set a named variable on an HDHomeRun device via the native TCP protocol.
 *
 * Opens a fresh TCP connection to `{options.deviceIp}:{options.port ?? 65001}`, sends a
 * GETSET_REQ packet containing both the variable name and the desired value,
 * then waits for the device's GETSET_RPY acknowledgement.
 *
 * This is the only correct way to tune or clear an HDHomeRun tuner slot —
 * the device firmware does NOT expose an HTTP `/tuner{N}/set` endpoint;
 * all channel changes must go through the native TCP protocol.
 *
 * @param options - Device IP, variable name, value, and optional timeout/port overrides
 * @returns The value string echoed back by the device on success
 * @throws {NativeProtocolError} On timeout, CRC mismatch, device error, or connection failure
 */
export async function nativeSet(options: NativeSetOptions): Promise<string> {
    const { deviceIp, variable, value } = options;
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const port = options.port ?? NATIVE_PROTOCOL_PORT;

    return await nativeTcpRequest({
        deviceIp,
        timeoutMs,
        port,
        buildRequest: () => encodeSetRequest(variable, value),
    });
}
