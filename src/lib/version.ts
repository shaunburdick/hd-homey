/**
 * Get the application version
 *
 * In development: reads from package.json via environment variable
 * In production: reads from version.json generated at build time
 */
export function getVersion(): string {
    // Try environment variable first (development)
    if (process.env.npm_package_version !== undefined && process.env.npm_package_version !== '') {
        return process.env.npm_package_version;
    }

    // Try to read version.json (production)
    try {
        // Using require instead of import for dynamic loading
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const versionData = require('../../version.json');
        return versionData.version;
    } catch {
        // Fallback version if both fail
        return '1.0.0-beta.3';
    }
}
