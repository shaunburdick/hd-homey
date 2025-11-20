#!/usr/bin/env node

/* eslint-disable no-console */
/* eslint-disable no-undef */

/**
 * Generate version.json file for production builds
 * Reads version from package.json and creates a version.json file
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

try {
    const packageJsonPath = join(__dirname, '..', 'package.json');
    const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

    const version = packageJson.version || '1.0.0-unknown';

    const versionData = {
        version,
        buildDate: new Date().toISOString(),
    };

    const versionJsonPath = join(__dirname, '..', 'version.json');
    writeFileSync(versionJsonPath, JSON.stringify(versionData, null, 2), 'utf8');

    console.log(`Generated version.json: ${version}`);
} catch (error) {
    console.error('Failed to generate version.json:', error);
    process.exit(1);
}
