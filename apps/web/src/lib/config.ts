/** Radix for decimal integer parsing */
const DECIMAL_RADIX = 10;

export default {
    /**
     * Path to the Database
     */
    DB_PATH: process.env.HD_HOMEY_DB_PATH ?? './data/db/hd_homey.db',

    /**
     * App will attempt to rewrite the lineup and other URLs to this proxy.
     * It will do so based on the request headers and such.
     * Sometime it cannot do that, in which case you might want to help it out with the correct value
     */
    PROXY_HOST: process.env.HD_HOMEY_PROXY_HOST ?? '',

    /**
     * The secret key to encrypt auth tokens with
     */
    AUTH_SECRET: process.env.AUTH_SECRET ?? '',

    /**
     * Base URL for Better-Auth endpoints
     * Fallback to NEXTAUTH_URL for backward compatibility during migration
     */
    get AUTH_BASE_URL(): string {
        return process.env.BETTER_AUTH_URL
            ?? process.env.NEXTAUTH_URL
            ?? 'http://localhost:3000';
    },

    /**
     * URL path prefix for sub-path deployments behind a reverse proxy.
     *
     * When set, HD Homey will be served from a sub-path (e.g., "/hd-homey").
     * This is used by Next.js basePath and by Better-Auth for constructing URLs.
     *
     * Must start with "/" and must NOT end with "/" (e.g., "/hd-homey", not "/hd-homey/").
     * Leave empty (default) for root-path deployments.
     *
     * Example: HD_HOMEY_BASE_PATH=/hd-homey
     */
    get BASE_PATH(): string {
        const raw = process.env.HD_HOMEY_BASE_PATH ?? '';
        // Normalize: ensure it starts with "/" if non-empty, strip trailing slash
        if (raw === '') {
            return '';
        }
        const normalized = raw.startsWith('/') ? raw : `/${raw}`;
        return normalized.endsWith('/') ? normalized.slice(0, -1) : normalized;
    },

    /**
     * Stream token expiration in seconds (default: 12 hours)
     */
    get streamTokenExpiry(): number {
        return parseInt(process.env.HD_HOMEY_STREAM_TOKEN_EXPIRY ?? '43200', DECIMAL_RADIX);
    }
};
