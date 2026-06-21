#!/usr/bin/env node

/**
 * sync-version.mjs
 *
 * Propagates the version from root package.json (source of truth) to
 * all remaining hardcoded files after a version bump.
 *
 * Usage:
 *   # Auto-detect old version from git HEAD (recommended after npm version)
 *   node apps/web/scripts/sync-version.mjs
 *
 *   # Specify old version explicitly
 *   node apps/web/scripts/sync-version.mjs --from 1.0.0-beta.5
 *
 * The canonical version lives in the root package.json.
 * The docs config reads it dynamically at build time; version.ts uses
 * 0.0.0-unknown fallback. This script only updates files with embedded
 * version text in prose or examples.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = resolve(import.meta.dirname, '../../..');
const ROOT_PKG_PATH = resolve(ROOT, 'package.json');

/** Files to update, relative to repo root */
const FILES = [
    'README.md',
    'AGENTS.md',
    'SECURITY.md',
    'apps/docs/index.md',
    'apps/docs/features/index.md',
    'apps/docs/api/index.md',
    'apps/android/SETUP.md',
    'apps/android/MANUAL-TEST-GUIDE.md',
    '.specs/FEATURE-STATUS.md',
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Get the previous version — from --from flag, git HEAD, or null if unknown.
 *
 * @returns {string|null} The old version to replace
 */
function detectOldVersion() {
    // eslint-disable-next-line no-undef -- 'process' is a Node.js global
    const args = process.argv.slice(2);
    const fromFlag = args.indexOf('--from');

    if (fromFlag !== -1 && args[fromFlag + 1]) {
        return args[fromFlag + 1];
    }

    // Try to get previous committed version from git (root package.json is the source of truth)
    try {
        const prevPkg = execSync(
            'git show HEAD:package.json 2>/dev/null || echo ""',
            { encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] },
        ).trim();
        if (prevPkg) {
            const parsed = JSON.parse(prevPkg);
            // eslint-disable-next-line no-console -- Script intentionally logs progress
            console.log(`Detected old version from git HEAD (root package.json): ${parsed.version}`);
            return parsed.version;
        }
    } catch {
        return null; // git not available or no commit yet
    }

    return null;
}

/**
 * Get the current version from the source of truth (root package.json).
 *
 * @returns {string|null}
 */
function readCurrentVersion() {
    try {
        const pkg = JSON.parse(readFileSync(ROOT_PKG_PATH, 'utf8'));
        return pkg.version || null;
    } catch {
        return null;
    }
}

/**
 * Apply version string replacements to file content.
 * Replaces plain, v-prefixed, and URL-escaped variants.
 *
 * @param {{ content: string, oldVersion: string, newVersion: string }} opts
 * @returns {string} Updated content
 */
function replaceVersionInContent({ content, oldVersion, newVersion }) {
    let result = content;

    // 1. v-prefixed version (e.g., "v1.0.0-beta.6")
    result = result.replaceAll(`v${oldVersion}`, `v${newVersion}`);

    // 2. Plain version (e.g., "1.0.0-beta.6")
    result = result.replaceAll(oldVersion, newVersion);

    // 3. URL-escaped version for Shield.io badges (e.g., "1.0.0--beta.6")
    result = result.replaceAll(
        oldVersion.replace(/-/g, '--'),
        newVersion.replace(/-/g, '--'),
    );

    return result;
}

/**
 * Update a single file with version replacements.
 *
 * @param {{ relPath: string, oldVersion: string, newVersion: string }} opts
 * @returns {{updated: boolean, skipped: boolean, error: boolean, message?: string}} Result
 */
function updateFile({ relPath, oldVersion, newVersion }) {
    const fullPath = resolve(ROOT, relPath);

    let content;
    try {
        content = readFileSync(fullPath, 'utf8');
    } catch (err) {
        if (err.code === 'ENOENT') {
            return { updated: false, skipped: true, error: false };
        }
        return { updated: false, skipped: false, error: true, message: err.message };
    }

    const changed = replaceVersionInContent({ content, oldVersion, newVersion });

    if (changed !== content) {
        writeFileSync(fullPath, changed, 'utf8');
        return { updated: true, skipped: false, error: false };
    }

    return { updated: false, skipped: false, error: false };
}

/**
 * Print the count summary and next steps.
 *
 * @param {{updated: number, skipped: number, errors: number}} counts
 */
function printSummary({ updated, skipped, errors }) {
    // eslint-disable-next-line no-console -- Script intentionally prints results
    console.log('');
    // eslint-disable-next-line no-console -- Script intentionally prints results
    console.log(`Done. ${updated} file(s) updated.`);
    if (skipped > 0) {
        // eslint-disable-next-line no-console -- Script output
        console.log(`${skipped} file(s) skipped (not found).`);
    }
    if (errors > 0) {
        // eslint-disable-next-line no-console -- Script output
        console.log(`${errors} file(s) had errors.`);
    }
    // eslint-disable-next-line no-console -- Script output
    console.log('');
    // eslint-disable-next-line no-console -- Script output
    console.log('Next steps:');
    // eslint-disable-next-line no-console -- Script output
    console.log('  1. Update CHANGELOG.md (add release section with notes)');
    // eslint-disable-next-line no-console -- Script output
    console.log('  2. Verify with: git diff');
    // eslint-disable-next-line no-console -- Script output
    console.log('  3. Stage everything: git add -A');
}

/**
 * Walk all target files and apply version replacements.
 *
 * @param {{ oldVersion: string, newVersion: string }} opts
 */
function processFiles({ oldVersion, newVersion }) {
    // eslint-disable-next-line no-console -- Script reports progress
    console.log(`Syncing version: ${oldVersion} → ${newVersion}`);
    // eslint-disable-next-line no-console -- Script output formatting
    console.log('');

    let updatedCount = 0;
    let skippedCount = 0;
    let errorCount = 0;

    for (const relPath of FILES) {
        const result = updateFile({ relPath, oldVersion, newVersion });

        if (result.updated) {
            // eslint-disable-next-line no-console -- Script reports per-file progress
            console.log(`  ✓ ${relPath}`);
            updatedCount++;
        } else if (result.skipped) {
            // eslint-disable-next-line no-console -- Script reports per-file progress
            console.log(`  ~ ${relPath}  (not found, skipping)`);
            skippedCount++;
        } else if (result.error) {
            // eslint-disable-next-line no-console -- Script reports per-file errors
            console.error(`  ✗ ${relPath}  ${result.message}`);
            errorCount++;
        } else {
            // eslint-disable-next-line no-console -- Script reports per-file status
            console.log(`  - ${relPath}  (no changes)`);
        }
    }

    printSummary({ updated: updatedCount, skipped: skippedCount, errors: errorCount });
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

function main() {
    const newVersion = readCurrentVersion();
    if (!newVersion) {
        // eslint-disable-next-line no-console -- Script reports fatal errors to stderr
        console.error('ERROR: Could not read version from root package.json');
        // eslint-disable-next-line no-undef -- 'process' is a Node.js global
        process.exit(1);
    }

    const oldVersion = detectOldVersion();
    if (!oldVersion) {
        // eslint-disable-next-line no-console -- Script reports fatal errors to stderr
        console.error(
            'ERROR: Could not detect old version.\n' +
            '  Provide it with: node apps/web/scripts/sync-version.mjs --from <version>\n' +
            '  e.g., node apps/web/scripts/sync-version.mjs --from 1.0.0-beta.5',
        );
        // eslint-disable-next-line no-undef -- 'process' is a Node.js global
        process.exit(1);
    }

    if (oldVersion === newVersion) {
        // eslint-disable-next-line no-console -- Script reports outcome
        console.log(`Version is already ${oldVersion} — nothing to update.`);
        // eslint-disable-next-line no-undef -- 'process' is a Node.js global
        process.exit(0);
    }

    processFiles({ oldVersion, newVersion });
}

main();
