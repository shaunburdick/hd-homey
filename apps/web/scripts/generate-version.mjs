#!/usr/bin/env node

/* eslint-disable no-console */
/* eslint-disable no-undef */

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
    let commit = 'unknown';
    let branch = null;

    try {
        // Get short commit SHA (7 characters)
        commit = execSync('git rev-parse --short=7 HEAD', {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'], // Suppress stderr
        }).trim();

        // Get branch name
        branch = execSync('git rev-parse --abbrev-ref HEAD', {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'], // Suppress stderr
        }).trim();

        // Filter out "HEAD" response (detached HEAD state)
        if (branch === 'HEAD') {
            branch = null;
        }

        // Check for dirty working tree (development only)
        if (process.env.NODE_ENV !== 'production') {
            const status = execSync('git status --porcelain', {
                encoding: 'utf8',
                stdio: ['pipe', 'pipe', 'pipe'], // Suppress stderr
            }).trim();

            if (status.length > 0) {
                commit += '-dirty';
            }
        }
    } catch (error) {
        console.warn('Git metadata extraction failed:', error.message);
        console.warn('Using fallback values (commit: "unknown", branch: null)');
    }

    return { commit, branch };
}

try {
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

    const version = packageJson.version || '1.0.0-unknown';
    const { commit, branch } = getGitMetadata();
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

    console.log(`Generated version.json: ${version} (${commit}${branch ? ` on ${branch}` : ''})`);
} catch (error) {
    console.error('Failed to generate version.json:', error);
    process.exit(1);
}
