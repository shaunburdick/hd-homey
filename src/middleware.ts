import { NextResponse } from 'next/server';
import Logger from '@/lib/logger';

export function middleware(req: Request) {
    const response = NextResponse.next();
    Logger.info({
        method: req.method,
        url: req.url,
        status: response.status
    });
    return response;
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
