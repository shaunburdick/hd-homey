import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth/auth';

export const dynamic = 'force-dynamic';

/**
 * Auth API route handler for Better-Auth.
 *
 * When deployed behind a reverse proxy that strips the sub-path prefix
 * (e.g., /hd-homey/ → /), Next.js receives requests at the root path so
 * no URL rewriting is needed here. Better-Auth sees clean paths and works
 * without any modification.
 */
export const { GET, POST } = toNextJsHandler(auth);
