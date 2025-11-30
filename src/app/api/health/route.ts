/**
 * Simple health check endpoint for Docker and monitoring
 * Returns 200 OK if the application is running
 * No authentication required - this is a public endpoint for infrastructure
 */

export const dynamic = 'force-dynamic';

export async function GET() {
    return Response.json(
        {
            status: 'ok',
            timestamp: new Date().toISOString(),
        },
        {
            status: 200,
            headers: {
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            },
        }
    );
}
