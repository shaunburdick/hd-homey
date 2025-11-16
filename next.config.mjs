/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    serverExternalPackages: ['pino', 'bcrypt', 'better-sqlite3'],
};

export default nextConfig;
