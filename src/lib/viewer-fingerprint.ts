/**
 * Viewer fingerprinting for session tracking
 * Creates a stable identifier from IP address and User-Agent
 */

import crypto from 'node:crypto';
import type { NextRequest } from 'next/server';

/**
 * Generate a viewer fingerprint from request headers
 * Uses IP address + User-Agent to create a stable identifier
 *
 * This allows the same viewer to be recognized across playlist polls
 * without requiring cookies or client-side code.
 *
 * Note: This is suitable for home/small network usage. In environments
 * where many users share the same IP/User-Agent (e.g., corporate networks),
 * accuracy may be reduced.
 */
export function generateViewerFingerprint(req: NextRequest): string {
    // Get IP address (handle various header formats)
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ip = (forwardedFor !=== null && forwardedFor !== '')
        ? forwardedFor.split(',')[0].trim()
        : (realIp ?? 'unknown');

    // Get User-Agent
    const userAgent = req.headers.get('user-agent') ?? 'unknown';

    // Create a stable hash of IP + User-Agent
    const fingerprint = crypto
        .createHash('sha256')
        .update(`${ip}:${userAgent}`)
        .digest('hex')
        .substring(0, 16); // Use first 16 chars for brevity

    return fingerprint;
}

/**
 * Get human-readable info about a viewer (for logging/debugging)
 */
export function getViewerInfo(req: NextRequest) {
    const forwardedFor = req.headers.get('x-forwarded-for');
    const realIp = req.headers.get('x-real-ip');
    const ip = (forwardedFor !=== null && forwardedFor !== '')
        ? forwardedFor.split(',')[0].trim()
        : (realIp ?? 'unknown');

    const userAgent = req.headers.get('user-agent') ?? 'unknown';

    return {
        ip,
        userAgent: userAgent.substring(0, 50), // Truncate for logging
    };
}
