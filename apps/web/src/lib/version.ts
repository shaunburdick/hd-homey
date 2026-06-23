/**
 * Build metadata interface
 */
export interface BuildMetadata {
    version: string;
    commit: string;
    branch: string | null;
    buildDate: string;
    environment: 'production' | 'development';
}

/**
 * Get complete build metadata including version, commit, branch, etc.
 *
 * @returns {BuildMetadata} Complete build information
 */
export function getVersionMetadata(): BuildMetadata {
    try {
        // Using require instead of import for dynamic loading at runtime;
        // version.json may not exist at build time so a static import would fail.
        // eslint-disable-next-line @typescript-eslint/no-require-imports -- dynamic load
        const versionData = require('../../version.json');
        return versionData as BuildMetadata;
    } catch {
        // Fallback metadata if version.json not found
        return {
            version: process.env.npm_package_version ?? '0.0.0-unknown',
            commit: 'unknown',
            branch: null,
            buildDate: new Date().toISOString(),
            environment: 'development',
        };
    }
}

/**
 * Get formatted version string with commit SHA
 *
 * Format varies by environment and branch:
 * - Production: "VERSION (COMMIT)" e.g., "X.Y.Z (1ce5e97)"
 * - Development (feature branch): "VERSION (BRANCH@COMMIT)" e.g., "X.Y.Z (013-build-identification@a1b2c3d)"
 * - Development (main/master): "VERSION (COMMIT)" e.g., "X.Y.Z (1ce5e97)"
 *
 * @returns {string} Formatted version string
 */
export function getFormattedVersion(): string {
    const metadata = getVersionMetadata();
    const { version, commit, branch, environment } = metadata;

    // Show branch only for feature branches (not main/master) in development
    const showBranch =
        branch !== null &&
        branch !== 'main' &&
        branch !== 'master' &&
        environment === 'development';

    if (showBranch && branch !== null) {
        return `${version} (${branch}@${commit})`;
    } else {
        return `${version} (${commit})`;
    }
}

/**
 * Get the application version (backward compatible)
 *
 * In development: reads from package.json via environment variable
 * In production: reads from version.json generated at build time
 *
 * @returns {string} Semantic version only (e.g., "X.Y.Z")
 */
export function getVersion(): string {
    const metadata = getVersionMetadata();
    return metadata.version;
}
