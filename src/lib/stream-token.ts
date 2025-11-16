import crypto from 'crypto';
import Config from './config';
import { getStreamSecret } from './settings';

export interface StreamTokenData {
    tunerId: number;
    channelId: number;
    expiresAt: number;
}

/**
 * Generate a signed token for streaming
 */
export async function generateStreamToken(tunerId: number, channelId: number): Promise<string> {
    const secret = await getStreamSecret();
    const expiresAt = Math.floor(Date.now() / 1000) + Config.streamTokenExpiry;

    // Create signature
    const data = `${tunerId}:${channelId}:${expiresAt}`;
    const signature = crypto
        .createHmac('sha256', secret)
        .update(data)
        .digest('hex');

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
        const now = Math.floor(Date.now() / 1000);
        const expiresAtNum = parseInt(expiresAt, 10);
        if (expiresAtNum < now) {
            return null; // Expired
        }

        // Verify signature
        const data = `${tunerId}:${channelId}:${expiresAt}`;
        const expectedSignature = crypto
            .createHmac('sha256', secret)
            .update(data)
            .digest('hex');

        // Use timing-safe comparison
        if (!crypto.timingSafeEqual(
            Buffer.from(signature),
            Buffer.from(expectedSignature)
        )) {
            return null; // Invalid signature
        }

        return {
            tunerId: parseInt(tunerId, 10),
            channelId: parseInt(channelId, 10),
            expiresAt: expiresAtNum
        };
    } catch {
        return null; // Invalid token format
    }
}
