/**
 * Simple health check endpoint for Docker and monitoring
 * Returns 200 OK if the application is running
 * No authentication required - this is a public endpoint for infrastructure
 */

import { getVersionMetadata } from '@/lib/version';

export const dynamic = 'force-dynamic';

export async function GET() {
    const version = getVersionMetadata();

    return Response.json(
        {
            status: 'ok',
            timestamp: new Date().toISOString(),
            version: version.version,
            commit: version.commit,
            branch: version.branch,
            buildDate: version.buildDate,
            environment: version.environment,
        },
        {
            status: 200,
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        }
    );
}
