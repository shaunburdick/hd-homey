import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import Logger from '@/lib/logger';

// Simple logging middleware - authentication handled by layouts
export function middleware(req: NextRequest) {
    Logger.info({
        method: req.method,
        url: req.url,
        path: req.nextUrl.pathname
    });

    return NextResponse.next();
}

export const config = {
    matcher: [
        /*
         * Match all request paths except for the ones starting with:
         * - _next/static (static files)
         * - _next/image (image optimization files)
         * - favicon.ico, sitemap.xml, robots.txt (metadata files)
         */
        '/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)',
    ]
};
