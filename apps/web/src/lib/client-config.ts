/**
 * Client-side runtime configuration for HD Homey.
 *
 * Values here are injected into the page at request time by the root layout
 * (a Server Component), not baked in at build time. This means the Docker
 * image does not need to be rebuilt when changing deployment configuration
 * such as HD_HOMEY_BASE_PATH.
 *
 * In the browser:  reads from a <meta name="hd-homey-base-path"> tag set by layout.tsx
 * During SSR:      reads from process.env.HD_HOMEY_BASE_PATH (server env var)
 */

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
 * Read the base path from the <meta name="hd-homey-base-path"> tag
 * injected by the root layout at request time.
 * Falls back to an SSR-compatible value if the element is missing.
 */
function readBasePathMeta(): string {
    const meta = document.querySelector('meta[name="hd-homey-base-path"]');
    return meta?.getAttribute('content') ?? '';
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
        ? readBasePathMeta()
        : normalizeBasePath(process.env.HD_HOMEY_BASE_PATH);
