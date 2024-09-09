/** @type {import('next').NextConfig} */
const nextConfig = {
    output: 'standalone',
    experimental: {
        instrumentationHook: true,
        // Related to Pino error with RSC: https://github.com/orgs/vercel/discussions/3150
        serverComponentsExternalPackages: ['pino'],
    },
};

export default nextConfig;
