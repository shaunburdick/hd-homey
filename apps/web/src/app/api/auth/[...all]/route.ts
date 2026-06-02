import { toNextJsHandler } from 'better-auth/next-js';
import { NextRequest } from 'next/server';
import { auth } from '@/lib/auth/auth';
import Config from '@/lib/config';

export const dynamic = 'force-dynamic';

/**
 * Rewrite a NextRequest to prepend the basePath to its URL.
 *
 * When Next.js is configured with a basePath (e.g., "/hd-homey"), it strips
 * the prefix from the URL before routing requests to handlers. This means a
 * browser request to "/hd-homey/api/auth/sign-in/username" arrives here as
 * "/api/auth/sign-in/username".
 *
 * Better-Auth validates requests against its configured baseURL. Since we
 * configure it with the origin only (e.g., "http://localhost:3000"), its
 * internal paths include the basePath prefix — so we must restore it here
 * to prevent 404 / URL-mismatch errors.
 *
 * @param req - The original NextRequest from Next.js
 * @returns A new NextRequest with the basePath prepended to the URL
 */
function rewriteWithBasePath(req: NextRequest): NextRequest {
    const basePath = Config.BASE_PATH;
    if (basePath === '') {
        return req;
    }

    const { pathname, search } = req.nextUrl;
    const rewrittenUrl = new URL(`${Config.AUTH_BASE_URL}${basePath}${pathname}`);
    rewrittenUrl.search = search;
    return new NextRequest(rewrittenUrl, req);
}

const handlers = toNextJsHandler(auth);

/**
 * GET handler for Better-Auth API routes.
 * Rewrites the request URL to include the basePath when sub-path deployment is active.
 */
export async function GET(req: NextRequest): Promise<Response> {
    return await handlers.GET(rewriteWithBasePath(req));
}

/**
 * POST handler for Better-Auth API routes.
 * Rewrites the request URL to include the basePath when sub-path deployment is active.
 */
export async function POST(req: NextRequest): Promise<Response> {
    return await handlers.POST(rewriteWithBasePath(req));
}
