#!/usr/bin/env node

/**
 * Generate version.json file for production builds
 * Reads version from package.json and extracts Git metadata
 */

import { execSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Extract Git metadata (commit SHA and branch name)
 *
 * @returns {Object} { commit: string, branch: string | null }
 */
function getGitMetadata() {
    try {
        // Get short commit SHA (7 characters)
        const commit = execSync('git rev-parse --short=7 HEAD', {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'], // Suppress stderr
        }).trim();

        // Get branch name
        let branch = execSync('git rev-parse --abbrev-ref HEAD', {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'], // Suppress stderr
        }).trim();

        // Filter out "HEAD" response (detached HEAD state)
        if (branch === 'HEAD') {
            branch = null;
        }

        // Check for dirty working tree (development only)
        // eslint-disable-next-line no-undef -- 'process' is a Node.js global
        if (process.env.NODE_ENV !== 'production') {
            const status = execSync('git status --porcelain', {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe'], // Suppress stderr
            }).trim();

            if (status.length > 0) {
                return { commit: `${commit}-dirty`, branch };
            }
        }

        return { commit, branch };
    } catch (error) {
        // Git metadata extraction may fail in production Docker builds or CI.
        // eslint-disable-next-line no-console -- Script intentionally logs to stdout
        console.warn('Git metadata extraction failed:', error.message);
        // eslint-disable-next-line no-console -- Script intentionally logs to stdout
        console.warn('Using fallback values (commit: "unknown", branch: null)');

        // Return fallback values explicitly
        return { commit: 'unknown', branch: null };
    }
}

try {
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

    const version = packageJson.version || '1.0.0-unknown';
    const { commit, branch } = getGitMetadata();
    // eslint-disable-next-line no-undef -- 'process' is a Node.js global
    const environment = process.env.NODE_ENV === 'production' ? 'production' : 'development';

    const versionData = {
        version,
        commit,
        branch,
        buildDate: new Date().toISOString(),
        environment,
    };

    const versionJsonPath = join(__dirname, '..', 'version.json');
    writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2), 'utf8');

    // eslint-disable-next-line no-console -- Script intentionally logs to stdout
    console.log(`Generated version.json: ${version} (${commit}${branch ? ` on ${branch}` : ''})`);
} catch (error) {
    // eslint-disable-next-line no-console -- Script intentionally logs to stderr
    console.error('Failed to generate version.json:', error);
    // eslint-disable-next-line no-undef -- 'process' is a Node.js global
    process.exit(1);
}
