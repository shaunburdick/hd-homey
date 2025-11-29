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

export async function proxy(req: NextRequest) {
    const { pathname } = req.nextUrl;

    // ==========================================
    // PUBLIC ROUTES (No authentication required)
    // ==========================================
    const publicRoutes = [
        '/users/signin',      // Login page
        '/get-started',       // Initial setup wizard
        '/api/auth',          // Better-Auth API routes
    ];

    const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route));
    if (isPublicRoute) {
        return NextResponse.next();
    }

    // ==========================================
    // TOKEN-AUTHENTICATED ROUTES
    // ==========================================
    // These routes validate HMAC tokens in their handlers.
    // We let them through here and they handle auth themselves.

    const tokenAuthenticatedRoutes = [
        '/api/transcode/',  // HLS playlists and segments
    ];

    const isTokenRoute = tokenAuthenticatedRoutes.some(route => pathname.startsWith(route));
    if (isTokenRoute) {
        // Token validation happens in route handler
        return NextResponse.next();
    }

    // Stream route under (protected) directory also uses token auth
    // Path pattern: /tuners/[id]/channel/[channel_id]/stream
    if (pathname.includes('/channel/') && pathname.includes('/stream')) {
        // Token validation happens in route handler
        return NextResponse.next();
    }

    // ==========================================
    // STATIC ASSETS (Always allow)
    // ==========================================
    // These are handled by Next.js directly
    if (pathname.startsWith('/_next/') ||
        pathname.startsWith('/icons/') ||
        pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico)$/) !== null) {
        return NextResponse.next();
    }

    // ==========================================
    // SESSION-AUTHENTICATED ROUTES
    // ==========================================
    // All other routes require a valid Better-Auth session

    // Note: getSession() works on Edge Runtime because Better-Auth uses JWT sessions.
    // It only needs to verify the JWT signature (crypto API), no database access.
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (session?.user === undefined) {
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
        const getStartedUrl = new URL('/get-started', req.url);
        getStartedUrl.searchParams.set('callbackUrl', pathname);
        return NextResponse.redirect(getStartedUrl);
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
