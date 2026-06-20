/**
 * Unit tests for native-protocol.ts and crc32.ts
 *
 * Tests the CRC32 implementation, TLV packet encoder/decoder, and
 * nativeGet TCP client using real local net.Server instances to simulate
 * HDHomeRun device responses.
 */

import * as net from 'node:net';
import { describe, expect, it } from 'vitest';
import { crc32 } from './crc32';
import {
    decodeResponse,
    encodeGetRequest,
    nativeGet,
} from './native-protocol';
import type { NativeProtocolError } from './native-protocol';

// =============================================================================
// Shared Test Constants
// =============================================================================

/** Loopback address used for all test TCP connections */
const TEST_HOST = '127.0.0.1';

/** Variable name used across encode/TCP tests */
const VAR_STREAMINFO = '/tuner0/streaminfo';

/** Error message used in error-response decode/nativeGet tests */
const DEVICE_ERROR_MSG = 'not recording';

// =============================================================================
// Test Helpers
// =============================================================================

/** Compute TLV length bytes needed for a payload of the given size */
function tlvLengthBytes(tlvLen: number): number {
    return tlvLen <= 127 ? 1 : 2;
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
    if (tlvLen <= 127) {
        buf.writeUInt8(tlvLen, offset);
        return 1;
    }
    buf.writeUInt8((tlvLen & 0x7F) | 0x80, offset);
    buf.writeUInt8(tlvLen >> 7, offset + 1);
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

/** Sentinel type for server with tracked socket set */
type TrackableServer = net.Server & { _trackedSockets: Set<net.Socket> };

/**
 * Spin up a TCP server on an ephemeral port.
 *
 * Tracks all server-side sockets so `stopServer()` can destroy them before
 * calling `server.close()` — preventing `server.close()` from hanging when a
 * client socket was destroyed uncleanly (e.g., after a timeout).
 *
 * @param handler - Called with each new socket. Null means server accepts but never replies.
 * @returns Server and its listening port
 */
async function startTcpServer(
    handler: ((socket: net.Socket) => void) | null,
): Promise<{ server: TrackableServer; port: number }> {
    return await new Promise((resolve, reject) => {
        const trackedSockets = new Set<net.Socket>();

        const server = net.createServer((socket) => {
            trackedSockets.add(socket);
            socket.on('close', () => {
                trackedSockets.delete(socket);
            });

            if (handler !== null) {
                handler(socket);
            }
            // If handler is null, do nothing — simulates a device that accepts but never replies
        }) as TrackableServer;

        server._trackedSockets = trackedSockets;

        server.listen(0, TEST_HOST, () => {
            const addr = server.address();
            if (addr === null || typeof addr === 'string') {
                reject(new Error('Failed to get server port'));
                return;
            }
            resolve({ server, port: addr.port });
        });

        server.on('error', reject);
    });
}

/** Stop a TCP server, destroying all lingering server-side connections first */
async function stopServer(server: TrackableServer): Promise<void> {
    // Destroy any server-side sockets that weren't cleanly closed (e.g., after
    // a client-side timeout + destroy). Without this, server.close() hangs
    // waiting for those connections to finish.
    for (const socket of server._trackedSockets) {
        socket.destroy();
    }
    server._trackedSockets.clear();

    return await new Promise((resolve, reject) => {
        server.close((err) => {
            if (err !== undefined && err !== null) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
}

// =============================================================================
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
// nativeGet Tests — real TCP sockets on ephemeral ports
// =============================================================================

/** Streaminfo response returned by the mock device for success tests */
const MOCK_STREAMINFO_RESPONSE = '481: mpeg2video v 1\n482: ac3 a 1\n';

describe('nativeGet', () => {
    it('resolves with the value string when the mock device sends a valid response', async () => {
        const responsePacket = buildValueResponsePacket(MOCK_STREAMINFO_RESPONSE);

        // Server: send the full response packet immediately on data receipt
        const { server, port } = await startTcpServer((socket) => {
            socket.once('data', () => {
                socket.write(responsePacket);
                socket.end();
            });
        });

        try {
            const result = await nativeGet({ deviceIp: TEST_HOST, variable: VAR_STREAMINFO, timeoutMs: 3000, port });
            expect(result).toBe(MOCK_STREAMINFO_RESPONSE);
        } finally {
            await stopServer(server);
        }
    }, 10000);

    it('resolves correctly when the mock device sends the response in two TCP chunks', async () => {
        const expectedValue = 'lock=qam256\nss=84\n';
        const responsePacket = buildValueResponsePacket(expectedValue);

        // Split the packet into two halves to simulate TCP fragmentation
        const half = Math.floor(responsePacket.length / 2);
        const chunk1 = responsePacket.subarray(0, half);
        const chunk2 = responsePacket.subarray(half);

        const { server, port } = await startTcpServer((socket) => {
            socket.once('data', () => {
                socket.write(chunk1);
                // Delay second chunk slightly to force accumulation
                setTimeout(() => {
                    socket.write(chunk2);
                    socket.end();
                }, 10);
            });
        });

        try {
            const result = await nativeGet({ deviceIp: TEST_HOST, variable: '/tuner0/status', timeoutMs: 3000, port });
            expect(result).toBe(expectedValue);
        } finally {
            await stopServer(server);
        }
    }, 10000);

    it('throws NativeProtocolError with code DEVICE_ERROR when device sends an error tag', async () => {
        const errorPacket = buildErrorResponsePacket(DEVICE_ERROR_MSG);

        const { server, port } = await startTcpServer((socket) => {
            socket.once('data', () => {
                socket.write(errorPacket);
                socket.end();
            });
        });

        let caught: NativeProtocolError | undefined;
        try {
            await nativeGet({ deviceIp: TEST_HOST, variable: VAR_STREAMINFO, timeoutMs: 3000, port });
        } catch (err) {
            caught = err as NativeProtocolError;
        } finally {
            await stopServer(server);
        }

        expect(caught).toBeDefined();
        expect(caught?.code).toBe('DEVICE_ERROR');
        expect(caught?.message).toContain(DEVICE_ERROR_MSG);
    }, 10000);

    it('throws NativeProtocolError with code TIMEOUT when device does not respond', async () => {
        // Server accepts connection but never sends data
        const { server, port } = await startTcpServer(null);

        let caught: NativeProtocolError | undefined;
        try {
            await nativeGet({ deviceIp: TEST_HOST, variable: VAR_STREAMINFO, timeoutMs: 300, port }); // 300ms timeout
        } catch (err) {
            caught = err as NativeProtocolError;
        } finally {
            await stopServer(server);
        }

        expect(caught).toBeDefined();
        expect(caught?.code).toBe('TIMEOUT');
    }, 10000);

    it('throws NativeProtocolError with code CONNECTION_REFUSED when no listener on port', async () => {
        // Find a port that is definitely not in use by starting and immediately stopping a server
        const { server, port } = await startTcpServer(null);
        await stopServer(server);
        // Now port is free (and closed) — connection will be refused

        let caught: NativeProtocolError | undefined;
        try {
            await nativeGet({ deviceIp: TEST_HOST, variable: VAR_STREAMINFO, timeoutMs: 2000, port });
        } catch (err) {
            caught = err as NativeProtocolError;
        }

        expect(caught).toBeDefined();
        expect(caught?.code).toBe('CONNECTION_REFUSED');
    }, 10000);
});
