/**
 * Unit tests for native-protocol.ts
 *
 * Pure-function tests (crc32, encodeGetRequest, decodeResponse) exercise
 * encoding and decoding logic directly with known byte sequences.
 *
 * nativeGet tests use a module-level `vi.mock('node:net')` to replace
 * `net.createConnection` with a factory that returns a mock EventEmitter
 * socket. No real TCP connections are made — all network behaviour is
 * simulated by emitting events on the mock socket after each test arranges it.
 */

import { EventEmitter } from 'node:events';
import { crc32 } from 'node:zlib';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
    decodeResponse,
    encodeGetRequest,
    nativeGet,
} from './native-protocol';
import type { NativeProtocolError } from './native-protocol';

// =============================================================================
// Module-level mock for node:net
//
// We mock only `createConnection`. The factory below stores the last created
// mock socket so individual tests can emit events on it after calling nativeGet.
// =============================================================================

/** A minimal mock socket: EventEmitter + stubs for the methods nativeGet calls */
interface MockSocket extends EventEmitter {
    setTimeout: ReturnType<typeof vi.fn>;
    write: ReturnType<typeof vi.fn>;
    end: ReturnType<typeof vi.fn>;
    destroy: ReturnType<typeof vi.fn>;
}

/** Shared slot — set by the mock factory, consumed by each test */
let currentMockSocket: MockSocket;

vi.mock('node:net', () => ({
    createConnection: vi.fn((): MockSocket => {
        const socket = new EventEmitter() as MockSocket;
        socket.setTimeout = vi.fn();
        socket.write = vi.fn();
        socket.end = vi.fn();
        socket.destroy = vi.fn();
        currentMockSocket = socket;
        return socket;
    }),
}));

// =============================================================================
// Shared Test Constants
// =============================================================================

/** Variable name used across encode/TCP tests */
const VAR_STREAMINFO = '/tuner0/streaminfo';

// TLV length encoding constants — mirrors hdhomerun_pkt.h definitions used in
// the production writeTlvLength function. Duplicated here so test packet
// builders remain self-contained without coupling to private module internals.

/** Maximum value encodable in a single TLV length byte (7-bit field, MSB reserved) */
const TEST_TLV_SINGLE_BYTE_MAX = 127;

/** Mask bit indicating a 2-byte TLV length encoding (MSB set) */
const TEST_TLV_LENGTH_MULTIBYTE_FLAG = 0x80;

/** Mask for extracting the 7 low-order bits of the first TLV length byte */
const TEST_TLV_LENGTH_LOW_7_BITS = 0x7F;

/** Shift count for the high-order bits in a 2-byte TLV length */
const TEST_TLV_LENGTH_HIGH_SHIFT = 7;

/** Device IP address used for all nativeGet mock tests */
const MOCK_DEVICE_IP = '192.168.1.1';

/** Error message used in error-response decode/nativeGet tests */
const DEVICE_ERROR_MSG = 'not recording';

// =============================================================================
// Test Helpers — packet builders (pure functions, no I/O)
// =============================================================================

/** Compute TLV length bytes needed for a payload of the given size */
function tlvLengthBytes(tlvLen: number): number {
    return tlvLen <= TEST_TLV_SINGLE_BYTE_MAX ? 1 : 2;
}

/** Options for {@link writeTlvLen} */
interface WriteTlvLenOptions {
    buf: Buffer;
    offset: number;
    tlvLen: number;
}

/** Write a TLV length field into a buffer at the given offset */
function writeTlvLen(options: WriteTlvLenOptions): number {
    const { buf, offset, tlvLen } = options;
    if (tlvLen <= TEST_TLV_SINGLE_BYTE_MAX) {
        buf.writeUInt8(tlvLen, offset);
        return 1;
    }
    // TLV 2-byte encoding: first byte = (low 7 bits | 0x80), second = length >> 7.
    // This mirrors the HDHomeRun native protocol variable-length format (hdhomerun_pkt.h).
    // Bitwise operations are the only way to implement this wire-format algorithm.
    // eslint-disable-next-line no-bitwise -- TLV 2-byte length: mask low 7 bits then OR in the MSB continuation flag
    buf.writeUInt8((tlvLen & TEST_TLV_LENGTH_LOW_7_BITS) | TEST_TLV_LENGTH_MULTIBYTE_FLAG, offset);
    // eslint-disable-next-line no-bitwise -- TLV 2-byte length encoding: right-shift to extract high bits
    buf.writeUInt8(tlvLen >> TEST_TLV_LENGTH_HIGH_SHIFT, offset + 1);
    return 2;
}

/** Build a valid GETSET_RPY response packet (tag 0x04 = GETSET_VALUE) */
function buildValueResponsePacket(value: string): Buffer {
    const valueBytes = Buffer.from(value, 'utf8');
    const tlvLen = valueBytes.length + 1; // +1 for null terminator

    const lenBytes = tlvLengthBytes(tlvLen);
    const payloadLength = 1 + lenBytes + tlvLen;

    const buf = Buffer.alloc(4 + payloadLength + 4);
    let offset = 0;

    buf.writeUInt16BE(0x0005, offset); offset += 2; // GETSET_RPY
    buf.writeUInt16BE(payloadLength, offset); offset += 2;

    buf.writeUInt8(0x04, offset); offset += 1; // TAG_GETSET_VALUE

    offset += writeTlvLen({ buf, offset, tlvLen });

    valueBytes.copy(buf, offset); offset += valueBytes.length;
    buf.writeUInt8(0, offset); offset += 1; // null terminator

    const crcVal = crc32(buf.subarray(0, offset));
    buf.writeUInt32LE(crcVal, offset);

    return buf;
}

/** Build a valid GETSET_RPY response packet with error message (tag 0x05) */
function buildErrorResponsePacket(errorMsg: string): Buffer {
    const msgBytes = Buffer.from(errorMsg, 'utf8');
    const tlvLen = msgBytes.length + 1;
    const payloadLength = 1 + 1 + tlvLen; // tag + single-byte length + value

    const buf = Buffer.alloc(4 + payloadLength + 4);
    let offset = 0;

    buf.writeUInt16BE(0x0005, offset); offset += 2;
    buf.writeUInt16BE(payloadLength, offset); offset += 2;

    buf.writeUInt8(0x05, offset); offset += 1; // TAG_ERROR_MESSAGE
    buf.writeUInt8(tlvLen, offset); offset += 1;
    msgBytes.copy(buf, offset); offset += msgBytes.length;
    buf.writeUInt8(0, offset); offset += 1;

    const crcVal = crc32(buf.subarray(0, offset));
    buf.writeUInt32LE(crcVal, offset);

    return buf;
}

// =============================================================================
// CRC32 Tests
// =============================================================================

describe('crc32', () => {
    it('returns 0x00000000 for an empty buffer', () => {
        expect(crc32(Buffer.alloc(0))).toBe(0x00000000);
    });

    it('produces the known CRC32 for ASCII "hello"', () => {
        // Standard CRC32/ISO-HDLC of "hello" = 0x3610A686
        expect(crc32(Buffer.from('hello', 'ascii'))).toBe(0x3610A686);
    });

    it('produces the known CRC32 for a single 0x00 byte', () => {
        // CRC32 of [0x00] = 0xD202EF8D
        expect(crc32(Buffer.from([0x00]))).toBe(0xD202EF8D);
    });

    it('produces a valid unsigned 32-bit integer for any input', () => {
        const buf = Buffer.from([0x01, 0x02, 0x03, 0x04, 0x05]);
        const result = crc32(buf);
        expect(result).toBeGreaterThanOrEqual(0);
        expect(result).toBeLessThanOrEqual(0xFFFFFFFF);
    });

    it('is deterministic — same input always yields same output', () => {
        const buf = Buffer.from('HDHomeRun native protocol test vector', 'utf8');
        expect(crc32(buf)).toBe(crc32(buf));
    });

    it('is sensitive to byte order', () => {
        expect(crc32(Buffer.from([0x01, 0x02]))).not.toBe(crc32(Buffer.from([0x02, 0x01])));
    });
});

// =============================================================================
// encodeGetRequest Tests
// =============================================================================

describe('encodeGetRequest', () => {
    it('writes the GETSET_REQ type (0x0004) in the first two bytes', () => {
        const buf = encodeGetRequest(VAR_STREAMINFO);
        expect(buf.readUInt16BE(0)).toBe(0x0004);
    });

    it('writes tag 0x03 (GETSET_NAME) at byte 4', () => {
        const buf = encodeGetRequest(VAR_STREAMINFO);
        expect(buf.readUInt8(4)).toBe(0x03);
    });

    it('encodes the variable name as null-terminated string in the TLV value', () => {
        const variable = VAR_STREAMINFO;
        const buf = encodeGetRequest(variable);

        // TLV length at byte 5 (single byte since 19 ≤ 127)
        expect(buf.readUInt8(5)).toBe(variable.length + 1);

        // Variable name at bytes 6..(6 + variable.length)
        const extracted = buf.toString('utf8', 6, 6 + variable.length);
        expect(extracted).toBe(variable);

        // Null terminator
        expect(buf.readUInt8(6 + variable.length)).toBe(0);
    });

    it('appends a CRC32 that matches independently computed CRC', () => {
        const variable = '/tuner0/debug';
        const buf = encodeGetRequest(variable);

        const payloadEnd = buf.length - 4;
        const expectedCrc = crc32(buf.subarray(0, payloadEnd));
        expect(buf.readUInt32LE(payloadEnd)).toBe(expectedCrc);
    });

    it('payload length field matches actual payload byte count', () => {
        const buf = encodeGetRequest(VAR_STREAMINFO);

        const declaredLength = buf.readUInt16BE(2);
        const actualLength = buf.length - 4 - 4; // subtract header and CRC
        expect(declaredLength).toBe(actualLength);
    });

    it('handles an empty variable string without throwing', () => {
        expect(() => encodeGetRequest('')).not.toThrow();
    });

    it('produces a valid CRC for a long variable name requiring 2-byte TLV length encoding', () => {
        // Name length = 128 → TLV value length = 129 → needs 2-byte encoding
        const longVar = `/tuner0/${'x'.repeat(120)}`;
        const buf = encodeGetRequest(longVar);
        const payloadEnd = buf.length - 4;
        const expectedCrc = crc32(buf.subarray(0, payloadEnd));
        expect(buf.readUInt32LE(payloadEnd)).toBe(expectedCrc);
    });
});

// =============================================================================
// decodeResponse Tests
// =============================================================================

describe('decodeResponse', () => {
    it('decodes a value response (tag 0x04)', () => {
        const packet = buildValueResponsePacket('481: mpeg2video v 1\n');
        const result = decodeResponse(packet);
        expect(result.value).toBe('481: mpeg2video v 1\n');
        expect(result.error).toBeUndefined();
    });

    it('decodes an error response (tag 0x05)', () => {
        const packet = buildErrorResponsePacket(DEVICE_ERROR_MSG);
        const result = decodeResponse(packet);
        expect(result.error).toBe(DEVICE_ERROR_MSG);
        expect(result.value).toBeUndefined();
    });

    it('throws NativeProtocolError with code CRC_MISMATCH on bad CRC', () => {
        const packet = buildValueResponsePacket('test value');
        // Corrupt the last CRC byte by flipping all its bits — the only way to
        // reliably corrupt a specific byte for CRC mismatch testing.
        // eslint-disable-next-line no-bitwise -- XOR bit-flip is the only way to corrupt a single byte for CRC testing
        packet[packet.length - 1] ^= 0xFF; // corrupt last CRC byte

        let caught: NativeProtocolError | undefined;
        try {
            decodeResponse(packet);
        } catch (err) {
            caught = err as NativeProtocolError;
        }

        expect(caught).toBeDefined();
        expect(caught?.code).toBe('CRC_MISMATCH');
    });

    it('throws NativeProtocolError with code INVALID_RESPONSE for truncated data', () => {
        const truncated = Buffer.from([0x00, 0x05, 0x00]); // only 3 bytes

        let caught: NativeProtocolError | undefined;
        try {
            decodeResponse(truncated);
        } catch (err) {
            caught = err as NativeProtocolError;
        }

        expect(caught).toBeDefined();
        expect(caught?.code).toBe('INVALID_RESPONSE');
    });

    it('skips unknown tags without throwing and still finds the value tag', () => {
        // Build packet: [unknown tag 0xFF, 2 bytes data] + [value tag 0x04, "hello\0"]
        const valuePart = 'hello';
        const valueBytes = Buffer.from(valuePart, 'utf8');
        const unknownData = Buffer.from([0xAA, 0xBB]);

        const payloadLength =
            1 + 1 + unknownData.length +   // tag(1) + len(1) + data(2)
            1 + 1 + (valueBytes.length + 1); // tag(1) + len(1) + value+null

        const buf = Buffer.alloc(4 + payloadLength + 4);
        let offset = 0;

        buf.writeUInt16BE(0x0005, offset); offset += 2;
        buf.writeUInt16BE(payloadLength, offset); offset += 2;

        buf.writeUInt8(0xFF, offset); offset += 1; // unknown tag
        buf.writeUInt8(unknownData.length, offset); offset += 1;
        unknownData.copy(buf, offset); offset += unknownData.length;

        buf.writeUInt8(0x04, offset); offset += 1; // value tag
        buf.writeUInt8(valueBytes.length + 1, offset); offset += 1;
        valueBytes.copy(buf, offset); offset += valueBytes.length;
        buf.writeUInt8(0, offset); offset += 1; // null terminator

        const crcVal = crc32(buf.subarray(0, offset));
        buf.writeUInt32LE(crcVal, offset);

        const result = decodeResponse(buf);
        expect(result.value).toBe(valuePart);
    });
});

// =============================================================================
// nativeGet Tests — mocked net.createConnection, zero real TCP I/O
//
// How the mock works:
//   1. `vi.mock('node:net')` replaces `createConnection` at module load time.
//   2. Each call to `createConnection` creates a fresh EventEmitter with
//      stub methods (setTimeout, write, end, destroy) and stores it in
//      `currentMockSocket`.
//   3. Tests call `nativeGet(...)` — nativeGet calls createConnection
//      synchronously, wiring up its event handlers to the new mock socket.
//   4. The test then emits events on `currentMockSocket` (e.g. 'connect',
//      'data', 'error', 'timeout', 'close') to drive nativeGet's state machine.
//   5. nativeGet resolves or rejects; the test asserts on the outcome.
// =============================================================================

/** Streaminfo response returned by the mock device for success tests */
const MOCK_STREAMINFO_RESPONSE = '481: mpeg2video v 1\n482: ac3 a 1\n';

describe('nativeGet', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('resolves with the value string when the mock socket sends a valid response', async () => {
        const responsePacket = buildValueResponsePacket(MOCK_STREAMINFO_RESPONSE);

        // Start nativeGet — it wires event handlers onto currentMockSocket
        const resultPromise = nativeGet({
            deviceIp: MOCK_DEVICE_IP,
            variable: VAR_STREAMINFO,
            timeoutMs: 2500,
        });

        // Simulate TCP connection established → nativeGet will write the request
        currentMockSocket.emit('connect');

        // Simulate device sending the full response packet in one chunk
        currentMockSocket.emit('data', responsePacket);

        const result = await resultPromise;
        expect(result).toBe(MOCK_STREAMINFO_RESPONSE);
    });

    it('resolves correctly when the mock device sends the response in two TCP chunks', async () => {
        const expectedValue = 'lock=qam256\nss=84\n';
        const responsePacket = buildValueResponsePacket(expectedValue);

        // Split the packet at an arbitrary byte boundary to simulate TCP fragmentation
        const splitAt = Math.floor(responsePacket.length / 2);
        const chunk1 = responsePacket.subarray(0, splitAt);
        const chunk2 = responsePacket.subarray(splitAt);

        const resultPromise = nativeGet({
            deviceIp: MOCK_DEVICE_IP,
            variable: '/tuner0/status',
            timeoutMs: 2500,
        });

        currentMockSocket.emit('connect');

        // First chunk arrives — packet is incomplete, nativeGet keeps accumulating
        currentMockSocket.emit('data', chunk1);

        // Second chunk completes the packet — nativeGet resolves
        currentMockSocket.emit('data', chunk2);

        const result = await resultPromise;
        expect(result).toBe(expectedValue);
    });

    it('throws NativeProtocolError with code DEVICE_ERROR when device sends an error tag', async () => {
        const errorPacket = buildErrorResponsePacket(DEVICE_ERROR_MSG);

        const resultPromise = nativeGet({
            deviceIp: MOCK_DEVICE_IP,
            variable: VAR_STREAMINFO,
            timeoutMs: 2500,
        });

        currentMockSocket.emit('connect');
        currentMockSocket.emit('data', errorPacket);

        let caught: NativeProtocolError | undefined;
        try {
            await resultPromise;
        } catch (err) {
            caught = err as NativeProtocolError;
        }

        expect(caught).toBeDefined();
        expect(caught?.code).toBe('DEVICE_ERROR');
        expect(caught?.message).toContain(DEVICE_ERROR_MSG);
    });

    it('throws NativeProtocolError with code TIMEOUT when the socket timeout fires', async () => {
        const resultPromise = nativeGet({
            deviceIp: MOCK_DEVICE_IP,
            variable: VAR_STREAMINFO,
            timeoutMs: 2500,
        });

        // Simulate the socket timeout event — no 'connect' or 'data' emitted
        currentMockSocket.emit('timeout');

        let caught: NativeProtocolError | undefined;
        try {
            await resultPromise;
        } catch (err) {
            caught = err as NativeProtocolError;
        }

        expect(caught).toBeDefined();
        expect(caught?.code).toBe('TIMEOUT');
    });

    it('throws NativeProtocolError with code CONNECTION_REFUSED when ECONNREFUSED error fires', async () => {
        const resultPromise = nativeGet({
            deviceIp: MOCK_DEVICE_IP,
            variable: VAR_STREAMINFO,
            timeoutMs: 2500,
        });

        // Simulate OS-level connection refused
        const connRefusedError = Object.assign(new Error(`connect ECONNREFUSED ${MOCK_DEVICE_IP}:65001`), {
            code: 'ECONNREFUSED',
        });
        currentMockSocket.emit('error', connRefusedError);

        let caught: NativeProtocolError | undefined;
        try {
            await resultPromise;
        } catch (err) {
            caught = err as NativeProtocolError;
        }

        expect(caught).toBeDefined();
        expect(caught?.code).toBe('CONNECTION_REFUSED');
    });

    it('throws NativeProtocolError with code CRC_MISMATCH when the response has a bad CRC', async () => {
        const corruptedPacket = buildValueResponsePacket('some value');
        // Flip the last byte of the CRC to corrupt it — the only reliable way
        // to corrupt a single byte for CRC mismatch testing.
        // eslint-disable-next-line no-bitwise -- XOR bit-flip is the only way to corrupt a single byte for CRC testing
        corruptedPacket[corruptedPacket.length - 1] ^= 0xFF;

        const resultPromise = nativeGet({
            deviceIp: MOCK_DEVICE_IP,
            variable: VAR_STREAMINFO,
            timeoutMs: 2500,
        });

        currentMockSocket.emit('connect');
        currentMockSocket.emit('data', corruptedPacket);

        let caught: NativeProtocolError | undefined;
        try {
            await resultPromise;
        } catch (err) {
            caught = err as NativeProtocolError;
        }

        expect(caught).toBeDefined();
        expect(caught?.code).toBe('CRC_MISMATCH');
    });

    it('throws NativeProtocolError with code INVALID_RESPONSE when connection closes with no data', async () => {
        const resultPromise = nativeGet({
            deviceIp: MOCK_DEVICE_IP,
            variable: VAR_STREAMINFO,
            timeoutMs: 2500,
        });

        // Connect but then close without sending any data
        currentMockSocket.emit('connect');
        currentMockSocket.emit('close');

        let caught: NativeProtocolError | undefined;
        try {
            await resultPromise;
        } catch (err) {
            caught = err as NativeProtocolError;
        }

        expect(caught).toBeDefined();
        expect(caught?.code).toBe('INVALID_RESPONSE');
    });

    it('calls setTimeout on the socket with the configured timeoutMs', () => {
        // Fire-and-forget — we only want to verify setTimeout was wired up
        void nativeGet({
            deviceIp: MOCK_DEVICE_IP,
            variable: VAR_STREAMINFO,
            timeoutMs: 1234,
        });

        expect(currentMockSocket.setTimeout).toHaveBeenCalledWith(1234);
    });

    it('writes the encoded request to the socket on connect', () => {
        const expectedPacket = encodeGetRequest(VAR_STREAMINFO);

        void nativeGet({
            deviceIp: MOCK_DEVICE_IP,
            variable: VAR_STREAMINFO,
            timeoutMs: 2500,
        });

        currentMockSocket.emit('connect');

        // The write call should have received a Buffer matching the encoded request
        expect(currentMockSocket.write).toHaveBeenCalledOnce();
        const writtenArg: Buffer = currentMockSocket.write.mock.calls[0][0] as Buffer;
        expect(Buffer.compare(writtenArg, expectedPacket)).toBe(0);
    });
});
