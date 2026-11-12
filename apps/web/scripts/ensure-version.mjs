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
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import process from 'node:process';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const versionPath = join(scriptDir, '..', 'version.json');

if (existsSync(versionPath) === false) {
    execFileSync(process.execPath, [join(scriptDir, 'generate-version.mjs')], { stdio: 'inherit' });
}
