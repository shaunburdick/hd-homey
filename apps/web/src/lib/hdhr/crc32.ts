/**
 * CRC32/ISO-HDLC checksum for HDHomeRun native protocol packets.
 *
 * Delegates to Node.js 22+'s built-in `zlib.crc32()` (CRC32/ISO-HDLC,
 * polynomial 0xEDB88320) — identical to the algorithm used in
 * `hdhomerun_pkt.c` from libhdhomerun.
 *
 * The built-in is available from Node.js 22.0.0 and is used here to
 * avoid maintaining a hand-rolled table-driven implementation.
 *
 * @module crc32
 */

import { crc32 as zlibCrc32 } from 'node:zlib';

/**
 * Compute the CRC32 checksum of a buffer.
 *
 * Wraps Node.js `zlib.crc32()` to provide the same interface that was
 * previously exported by this module. Used to verify packet integrity
 * in the HDHomeRun native TCP control protocol (port 65001).
 *
 * The checksum covers the packet header and payload — everything before
 * the 4-byte CRC field appended at the end of each packet.
 *
 * @param data - Buffer to compute CRC32 over (header + payload bytes only)
 * @returns CRC32 value as an unsigned 32-bit integer
 */
export function crc32(data: Buffer): number {
    return zlibCrc32(data);
}
