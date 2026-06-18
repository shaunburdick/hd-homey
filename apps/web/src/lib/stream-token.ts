import crypto from 'node:crypto';
import Config from './config';
import { getStreamSecret } from './settings';

export interface StreamTokenData {
    tunerId: number;
    channelId: number;
    expiresAt: number;
}

/** Number of hex characters to use from the HMAC digest (16 bytes = 32 hex chars) */
const SIGNATURE_HEX_CHARS = 32;

/** Milliseconds per second, used to convert Date.now() to Unix timestamp */
const MS_PER_SECOND = 1000;

/** Radix for decimal integer parsing */
const DECIMAL_RADIX = 10;

/**
 * Generate a signed token for streaming
 */
export async function generateStreamToken(tunerId: number, channelId: number): Promise<string> {
    const secret = await getStreamSecret();
    const expiresAt = Math.floor(Date.now() / MS_PER_SECOND) + Config.streamTokenExpiry;

    // Create signature (truncated to 16 bytes / 128 bits for shorter tokens)
    const data = `${tunerId}:${channelId}:${expiresAt}`;
    const signature = crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('hex')
        .slice(0, SIGNATURE_HEX_CHARS); // 16 bytes = 32 hex chars

    // Combine and encode
    const token = `${tunerId}:${channelId}:${expiresAt}:${signature}`;
    return Buffer.from(token).toString('base64url');
}

/**
 * Verify and parse a stream token
 */
export async function verifyStreamToken(token: string): Promise<StreamTokenData | null> {
    try {
        const secret = await getStreamSecret();

        // Decode token
        const decoded = Buffer.from(token, 'base64url').toString('utf-8');
        const [tunerId, channelId, expiresAt, signature] = decoded.split(':');

        // Check expiration
        const now = Math.floor(Date.now() / MS_PER_SECOND);
        const expiresAtNum = parseInt(expiresAt, DECIMAL_RADIX);
        if (expiresAtNum < now) {
            return null; // Expired
        }

        // Verify signature (truncated to match generation)
        const data = `${tunerId}:${channelId}:${expiresAt}`;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(data)
            .digest('hex')
            .slice(0, SIGNATURE_HEX_CHARS); // 16 bytes = 32 hex chars

        // Use timing-safe comparison
        if (!crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        )) {
            return null; // Invalid signature
        }

        return {
            tunerId: parseInt(tunerId, DECIMAL_RADIX),
            channelId: parseInt(channelId, DECIMAL_RADIX),
            expiresAt: expiresAtNum
        };
    } catch {
        return null; // Invalid token format
    }
}
