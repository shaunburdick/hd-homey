/**
 * Device URL validation for HDHomeRun signal polling.
 *
 * Provides SSRF-defence-in-depth validation applied before any outbound fetch
 * to a device URL. Extracted to keep signal-poller.ts within the file-length
 * budget while keeping the validation logic independently testable.
 *
 * @module device-url
 */

/** Loopback and link-local hostnames/addresses that must not be polled */
const BLOCKED_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

/**
 * Validate that a device URL is a safe HTTP URL targeting an HDHomeRun device.
 *
 * Defense-in-depth check applied before any outbound fetch. Ensures:
 * - URL is parseable
 * - Protocol is `http:` (HDHomeRun devices are HTTP-only)
 * - Hostname is not a loopback or link-local address
 *
 * @param url - Device URL to validate
 * @throws {Error} If the URL fails any validation check
 */
export function validateDeviceUrl(url: string): void {
    let parsed: URL;
    try {
        parsed = new URL(url);
    } catch {
        throw new Error(`Invalid device URL: "${url}" is not a valid URL`);
    }

    if (parsed.protocol !== 'http:') {
        throw new Error(
            `Invalid device URL protocol: expected "http:", got "${parsed.protocol}". ` +
            'HDHomeRun devices only support HTTP.',
        );
    }

    if (BLOCKED_HOSTNAMES.has(parsed.hostname)) {
        throw new Error(
            `Blocked device URL: "${parsed.hostname}" is a loopback address and cannot be used as a device URL.`,
        );
    }

    // Block link-local IPv4 (169.254.x.x) and IPv6 link-local (fe80::)
    if (parsed.hostname.startsWith('169.254.') || parsed.hostname.toLowerCase().startsWith('fe80')) {
        throw new Error(
            `Blocked device URL: "${parsed.hostname}" is a link-local address and cannot be used as a device URL.`,
        );
    }
}
