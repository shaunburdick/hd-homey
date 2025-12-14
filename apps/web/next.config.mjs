import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    serverExternalPackages: ['pino', 'bcrypt', 'better-sqlite3'],
    turbopack: {
        // Point to monorepo root (two levels up from apps/web)
        root: join(__dirname, '..', '..'),
    },
};

export default nextConfig;
