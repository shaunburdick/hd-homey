/**
 * HDHomeRun Native Control Protocol — TLV encoder, decoder, and TCP client.
 *
 * Implements the binary control protocol exposed on TCP port 65001 of all
 * HDHomeRun devices. The protocol uses a fixed 4-byte header followed by a
 * TLV (tag-length-value) payload and a CRC32 checksum.
 *
 * Protocol reference: libhdhomerun/hdhomerun_pkt.h and hdhomerun_pkt.c
 * (https://github.com/Silicondust/libhdhomerun)
 *
 * CRC32 uses the Node.js built-in `zlib.crc32()` (available from Node.js 22+),
 * eliminating the need for a hand-rolled table implementation.
 *
 * @module native-protocol
 */

import * as net from 'node:net';
import { crc32 } from 'node:zlib';

// =============================================================================
// Protocol Constants (from hdhomerun_pkt.h)
// =============================================================================

/** HDHomeRun native control protocol TCP port */
const NATIVE_PROTOCOL_PORT = 65001;

/** Maximum packet size in bytes (HDHOMERUN_MAX_PACKET_SIZE) */
const MAX_PACKET_SIZE = 1460;

/** Default connection/operation timeout in milliseconds (libhdhomerun default) */
const DEFAULT_TIMEOUT_MS = 2500;

/** Packet type: get/set request (HDHOMERUN_TYPE_GETSET_REQ) */
const PACKET_TYPE_GETSET_REQ = 0x0004;

/** Packet header length: 2 bytes type + 2 bytes payload length */
const HEADER_LENGTH = 4;

/** CRC32 trailer length in bytes */
const CRC_LENGTH = 4;

/** TLV tag: variable name in a get/set request (HDHOMERUN_TAG_GETSET_NAME) */
const TAG_GETSET_NAME = 0x03;

/** TLV tag: returned variable value (HDHOMERUN_TAG_GETSET_VALUE) */
const TAG_GETSET_VALUE = 0x04;

/** TLV tag: device error message (HDHOMERUN_TAG_ERROR_MESSAGE) */
const TAG_ERROR_MESSAGE = 0x05;

/** Maximum single-byte TLV length value (7-bit field, MSB reserved) */
const TLV_SINGLE_BYTE_MAX = 127;

/** Mask bit indicating a 2-byte TLV length encoding (MSB set) */
const TLV_LENGTH_MULTIBYTE_FLAG = 0x80;

/** Mask for extracting the 7 low-order bits of the first TLV length byte */
const TLV_LENGTH_LOW_7_BITS = 0x7F;

/** Shift count for the high-order bits in a 2-byte TLV length */
const TLV_LENGTH_HIGH_SHIFT = 7;

/** Hex radix for error message formatting */
const HEX_RADIX = 16;

// =============================================================================
// Error Type
// =============================================================================

/**
 * Error codes for native protocol failures.
 *
 * - `TIMEOUT`: TCP connection or read timed out
 * - `CRC_MISMATCH`: Received packet has invalid CRC32
 * - `DEVICE_ERROR`: Device responded with an error message (tag 0x05)
 * - `CONNECTION_REFUSED`: TCP connect was refused (device not listening)
 * - `INVALID_RESPONSE`: Packet format is malformed or incomplete
 */
export type NativeProtocolErrorCode =
    | 'TIMEOUT'
    | 'CRC_MISMATCH'
    | 'DEVICE_ERROR'
    | 'CONNECTION_REFUSED'
    | 'INVALID_RESPONSE';

/**
 * Error thrown by {@link nativeGet} on protocol-level failures.
 * The `code` field identifies the specific failure mode.
 */
export interface NativeProtocolError extends Error {
    code: NativeProtocolErrorCode;
}

/**
 * Create a NativeProtocolError with the given code and message.
 *
 * @param code - Machine-readable error code
 * @param message - Human-readable description
 * @returns NativeProtocolError instance
 */
function makeNativeError(code: NativeProtocolErrorCode, message: string): NativeProtocolError {
    const error = new Error(message) as NativeProtocolError;
    error.name = 'NativeProtocolError';
    error.code = code;
    return error;
}

// =============================================================================
// TLV Length Encoding Helpers
// =============================================================================

/**
 * Options for {@link writeTlvLength}.
 */
interface WriteTlvLengthOptions {
    buf: Buffer;
    offset: number;
    length: number;
}

/**
 * Encode a TLV length field into a buffer at the given offset.
 *
 * HDHomeRun uses a variable-length encoding:
 * - Length ≤ 127: single byte, MSB clear
 * - Length ≥ 128: two bytes — first byte is `(low 7 bits | 0x80)`, second is `length >> 7`
 *
 * @param options - Buffer, offset, and length to encode
 * @returns Number of bytes written (1 or 2)
 */
function writeTlvLength(options: WriteTlvLengthOptions): number {
    const { buf, offset, length } = options;
    if (length <= TLV_SINGLE_BYTE_MAX) {
        buf.writeUInt8(length, offset);
        return 1;
    }
    buf.writeUInt8((length & TLV_LENGTH_LOW_7_BITS) | TLV_LENGTH_MULTIBYTE_FLAG, offset);
    buf.writeUInt8(length >> TLV_LENGTH_HIGH_SHIFT, offset + 1);
    return 2;
}

/**
 * Decode a TLV length field from a buffer at the given offset.
 *
 * @param buf - Source buffer to read from
 * @param offset - Byte offset of the length field
 * @returns Decoded length value and the number of bytes consumed (1 or 2)
 * @throws {NativeProtocolError} If offset is past the end of the buffer
 */
function readTlvLength(buf: Buffer, offset: number): { length: number; consumed: number } {
    if (offset >= buf.length) {
        throw makeNativeError('INVALID_RESPONSE', 'Buffer truncated reading TLV length');
    }

    const first = buf.readUInt8(offset);
    if ((first & TLV_LENGTH_MULTIBYTE_FLAG) === 0) {
        return { length: first, consumed: 1 };
    }

    if (offset + 1 >= buf.length) {
        throw makeNativeError('INVALID_RESPONSE', 'Buffer truncated reading 2-byte TLV length');
    }

    const second = buf.readUInt8(offset + 1);
    return {
        length: (first & TLV_LENGTH_LOW_7_BITS) | (second << TLV_LENGTH_HIGH_SHIFT),
        consumed: 2,
    };
}

// =============================================================================
// Packet Encoder
// =============================================================================

/**
 * Encode a GETSET_REQ packet for a single named variable query.
 *
 * The encoded packet has the following layout:
 * ```
 * [0-1]  Packet type: 0x0004 (GETSET_REQ), big-endian uint16
 * [2-3]  Payload length, big-endian uint16
 * [4]    Tag: 0x03 (GETSET_NAME)
 * [5]    TLV length: len(variable) + 1 (for null terminator)
 * [6+]   Variable name string, null-terminated (UTF-8)
 * [last 4 bytes] CRC32 of all preceding bytes, little-endian uint32
 * ```
 *
 * @param variable - Variable name to query, e.g. "/tuner0/streaminfo"
 * @returns Encoded request packet as a Buffer
 */
export function encodeGetRequest(variable: string): Buffer {
    const nameBytes = Buffer.from(variable, 'utf8');
    const valueLength = nameBytes.length + 1; // +1 for null terminator

    // Calculate TLV length bytes needed (1 or 2)
    const tlvLengthBytes = valueLength <= TLV_SINGLE_BYTE_MAX ? 1 : 2;

    // Payload = tag(1) + length(1 or 2) + value(nameBytes.length + 1 for null)
    const payloadLength = 1 + tlvLengthBytes + valueLength;

    const buf = Buffer.alloc(MAX_PACKET_SIZE);
    let offset = 0;

    // Header
    buf.writeUInt16BE(PACKET_TYPE_GETSET_REQ, offset); offset += 2;
    buf.writeUInt16BE(payloadLength, offset); offset += 2;

    // TLV: tag
    buf.writeUInt8(TAG_GETSET_NAME, offset); offset += 1;

    // TLV: length (variable encoding)
    offset += writeTlvLength({ buf, offset, length: valueLength });

    // TLV: value (variable name + null terminator)
    nameBytes.copy(buf, offset); offset += nameBytes.length;
    buf.writeUInt8(0, offset); offset += 1; // null terminator

    // CRC32 over header + payload, appended as little-endian uint32
    const crcValue = crc32(buf.subarray(0, offset));
    buf.writeUInt32LE(crcValue, offset); offset += CRC_LENGTH;

    return buf.subarray(0, offset);
}

// =============================================================================
// Packet Decoder
// =============================================================================

/**
 * Verify the CRC32 of a complete response packet.
 *
 * @param data - Complete response packet buffer
 * @throws {NativeProtocolError} On CRC mismatch
 */
function verifyPacketCrc(data: Buffer): void {
    const payloadEnd = data.length - CRC_LENGTH;
    const computed = crc32(data.subarray(0, payloadEnd));
    const received = data.readUInt32LE(payloadEnd);

    if (computed !== received) {
        const computedHex = computed.toString(HEX_RADIX);
        const receivedHex = received.toString(HEX_RADIX);
        throw makeNativeError(
            'CRC_MISMATCH',
            `CRC32 mismatch: computed 0x${computedHex}, received 0x${receivedHex}`,
        );
    }
}

/**
 * Options for {@link extractTlvString}.
 */
interface ExtractTlvOptions {
    data: Buffer;
    payloadLimit: number;
    targetTag: number;
}

/**
 * Extract the string value of a specific TLV tag from a packet payload.
 * Unknown tags are skipped silently for forward compatibility.
 * Returns undefined if the target tag is not present.
 *
 * @param options - Buffer, payload limit, and target tag to search for
 * @returns Null-stripped string value, or undefined if tag not found
 */
function extractTlvString(options: ExtractTlvOptions): string | undefined {
    const { data, payloadLimit, targetTag } = options;
    let offset = HEADER_LENGTH;

    while (offset < payloadLimit && offset < data.length - CRC_LENGTH) {
        const tag = data.readUInt8(offset);
        offset += 1;

        const { length: tlvLen, consumed } = readTlvLength(data, offset);
        offset += consumed;

        if (offset + tlvLen > payloadLimit) {
            break;
        }

        if (tag === targetTag) {
            // Null-terminated string: strip trailing null if present
            const rawLen = tlvLen > 0 && data[offset + tlvLen - 1] === 0
                ? tlvLen - 1
                : tlvLen;
            return data.toString('utf8', offset, offset + rawLen);
        }

        // Skip unknown or non-matching tags — forward compatibility
        offset += tlvLen;
    }

    return undefined;
}

/**
 * Decode a GETSET_RPY response packet.
 *
 * Verifies the CRC32 of the complete packet, then iterates the TLV payload.
 * Unknown tags are silently skipped (unlike `node-hdhomerun` which throws).
 * Returns the first value or error string found.
 *
 * @param data - Complete response packet buffer (header + payload + CRC)
 * @returns Decoded value and/or error string. Both may be undefined on empty payload.
 * @throws {NativeProtocolError} On CRC mismatch or truncated buffer
 */
export function decodeResponse(data: Buffer): { value?: string; error?: string } {
    if (data.length < HEADER_LENGTH + CRC_LENGTH) {
        throw makeNativeError('INVALID_RESPONSE', `Response too short: ${data.length} bytes`);
    }

    verifyPacketCrc(data);

    const payloadLength = data.readUInt16BE(2);
    const payloadLimit = HEADER_LENGTH + payloadLength;

    return {
        value: extractTlvString({ data, payloadLimit, targetTag: TAG_GETSET_VALUE }),
        error: extractTlvString({ data, payloadLimit, targetTag: TAG_ERROR_MESSAGE }),
    };
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
// TCP Native Get Client
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
            state.socket?.write(encodeGetRequest(variable));
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
