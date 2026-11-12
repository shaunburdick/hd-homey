#!/usr/bin/env node

/**
 * Generate version.json if it is missing.
 *
 * version.ts imports it statically, so lint, type check, tests and builds all
 * need the file. Regenerating unconditionally would overwrite the metadata a
 * CI or Docker build produced from the real checkout with fallbacks from a
 * context that has no .git.
 */

import { existsSync } from 'node:fs';

const versionPath = new URL('../version.json', import.meta.url);

if (existsSync(versionPath) === false) {
    await import('./generate-version.mjs');
}
