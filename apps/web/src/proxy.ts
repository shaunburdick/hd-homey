/**
 * Next.js Proxy for Route Protection and Logging
 *
 * This proxy runs on EVERY request and enforces authentication
 * for protected routes. It handles three types of routes:
 *
 * 1. Public routes - No authentication required (signin, get-started, etc.)
 * 2. Token-authenticated routes - Use HMAC stream tokens (streaming endpoints)
 * 3. Session-authenticated routes - Require Better-Auth session (everything else)
 *
 * Note: Better-Auth uses JWT sessions (not database sessions), so getSession()
 * only needs to verify the JWT signature using crypto APIs. This works
 * on Edge Runtime without database access.
 *
 * @see https://nextjs.org/docs/app/api-reference/file-conventions/proxy
 */

import { headers } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';
import Logger from '@/lib/logger';

/**
 * Routes that require no authentication at all
 */
const PUBLIC_ROUTES = [
    '/users/signin',      // Login page
    '/get-started',       // Initial setup wizard
    '/invite/',           // Invitation redemption pages
    '/api/auth',          // Better-Auth API routes
    '/api/health',        // Health check endpoint (for Docker/monitoring)
];

/**
 * Routes that validate HMAC tokens in their own handlers — pass them through here
 */
const TOKEN_AUTHENTICATED_ROUTES = [
    '/api/transcode/',  // HLS playlists and segments
];

/**
 * Check if the request targets a statically served asset
 */
function isStaticAsset(pathname: string): boolean {
    return (
        pathname.startsWith('/_next/') ||
        pathname.startsWith('/icons/') ||
        pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/) !== null
    );
}

/**
 * Check if the route uses HMAC token authentication handled by the route handler itself
 */
function isTokenAuthenticatedRoute(pathname: string): boolean {
    if (TOKEN_AUTHENTICATED_ROUTES.some(route => pathname.startsWith(route))) {
        return true;
    }

    // Stream route under (protected) directory also uses token auth
    // Path pattern: /tuners/[id]/channel/[channel_id]/stream
    return pathname.includes('/channel/') && pathname.includes('/stream');
}

/**
 * Build the redirect or JSON response for unauthenticated requests
 */
function buildUnauthenticatedResponse(pathname: string, requestUrl: string): Response {
    // For API routes, return 401 JSON
    if (pathname.startsWith('/api/')) {
        return Response.json(
            {
                error: 'Unauthorized',
                message: 'Authentication required. Please sign in.'
            },
            { status: 401 }
        );
    }

    // For page routes, redirect to get-started (which will redirect to signin if setup is complete)
    // This allows the initial setup flow to work when there are no users yet
    const getStartedUrl = new URL('/get-started', requestUrl);
    getStartedUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(getStartedUrl);
}

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // Public routes — no authentication required
    if (PUBLIC_ROUTES.some(route => pathname.startsWith(route))) {
        return NextResponse.next();
    }

    // Token-authenticated routes — token validation happens in the route handler
    if (isTokenAuthenticatedRoute(pathname)) {
        return NextResponse.next();
    }

    // Static assets — handled by Next.js directly
    if (isStaticAsset(pathname)) {
        return NextResponse.next();
    }

    // All other routes require a valid Better-Auth session.
    // getSession() works on Edge Runtime because Better-Auth uses JWT sessions.
    // It only needs to verify the JWT signature (crypto API), no database access.
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (session?.user === undefined) {
        Logger.warn({ pathname }, 'Unauthenticated request blocked by proxy');
        return buildUnauthenticatedResponse(pathname, req.url);
    }

    // User is authenticated, allow request to proceed
    return NextResponse.next();
}

/**
 * Proxy Configuration
 *
 * Specifies which routes this proxy should run on.
 * We exclude static assets and Next.js internals.
 */
export const config = {
    matcher: [
        /*
         * Match all request paths EXCEPT:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico (favicon file)
         * - Static assets (png, jpg, jpeg, gif, webp, svg, ico)
         * - manifest.json (PWA manifest)
         */
        '/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico)).*)',
    ],
};
