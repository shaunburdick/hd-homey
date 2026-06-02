import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { env } from 'node:process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Normalize the base path from the environment variable.
 * Ensures it starts with "/" and does not end with "/".
 * Returns an empty string if unset (root deployment).
 *
 * @param {string | undefined} raw
 * @returns {string}
 */
function normalizeBasePath(raw) {
    if (!raw) {
        return '';
    }    const withLeading = raw.startsWith('/') ? raw : `/${raw}`;
    return withLeading.endsWith('/') ? withLeading.slice(0, -1) : withLeading;
}

const basePath = normalizeBasePath(env.HD_HOMEY_BASE_PATH);

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    serverExternalPackages: ['pino', 'bcrypt', 'better-sqlite3'],
    turbopack: {
        // Point to monorepo root (two levels up from apps/web)
        root: join(__dirname, '..', '..'),
    },
    // Support sub-path deployments behind a reverse proxy.
    // Set HD_HOMEY_BASE_PATH (e.g., "/hd-homey") to serve from a sub-path.
    // Leave empty for root-path deployments (default).
    ...(basePath && {
        basePath,
        assetPrefix: basePath,
    }),
    // Expose the base path to the browser for use in auth-client.ts.
    // NEXT_PUBLIC_ variables are inlined at build time.
    env: {
        NEXT_PUBLIC_BASE_PATH: basePath,
    },
};

export default nextConfig;
