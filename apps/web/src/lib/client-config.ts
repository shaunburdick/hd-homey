/**
 * Client-side runtime configuration for HD Homey.
 *
 * Values here are injected into the page at request time by the root layout
 * (a Server Component), not baked in at build time. This means the Docker
 * image does not need to be rebuilt when changing deployment configuration
 * such as HD_HOMEY_BASE_PATH.
 *
 * In the browser:  reads from window.__HD_HOMEY_BASE_PATH__ (set by layout.tsx)
 * During SSR:      reads from process.env.HD_HOMEY_BASE_PATH (server env var)
 */

declare global {
    interface Window {
        /**
         * The URL prefix for sub-path deployments (e.g., "/hd-homey").
         * Injected by the root layout server component at request time.
         * Empty string for root deployments.
         */
        __HD_HOMEY_BASE_PATH__: string | undefined;
    }
}

/**
 * Normalize a raw base path string.
 * Ensures a leading "/" and strips any trailing "/".
 * Returns empty string if the input is empty or undefined.
 */
function normalizeBasePath(raw: string | undefined): string {
    if (raw === undefined || raw === '') {
        return '';
    }

    const withLeading = raw.startsWith('/') ? raw : `/${raw}`;

    return withLeading.endsWith('/') ? withLeading.slice(0, -1) : withLeading;
}

/**
 * The URL prefix for HD Homey when deployed at a sub-path (e.g., "/hd-homey").
 * Empty string for root deployments.
 *
 * Consumed by client components that construct fetch() URLs or absolute hrefs —
 * these run in the browser where the full external URL (including the prefix)
 * is visible, unlike server-side code where the proxy has already stripped it.
 */
export const BASE_PATH: string =
    typeof window !== 'undefined'
        ? (window.__HD_HOMEY_BASE_PATH__ ?? '')
        : normalizeBasePath(process.env.HD_HOMEY_BASE_PATH);
