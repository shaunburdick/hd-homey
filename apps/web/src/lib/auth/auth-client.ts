'use client';

// Better-Auth uses .d.mts type definition files which TypeScript's standalone tsc cannot
// properly resolve with moduleResolution: "bundler". This is a known TypeScript limitation.
// Next.js bundler handles these correctly. We use @ts-ignore for compatibility with both.
// See: https://github.com/microsoft/TypeScript/issues/54102
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS2305: Module has no exported member (false positive with standalone tsc)
import { createAuthClient } from 'better-auth/react';

/**
 * Better-Auth React client for HD Homey
 *
 * Provides React hooks and client-side auth functions:
 * - useSession() - Get current session (reactive)
 * - signIn.email() - Sign in with email/password (username stored in email field)
 * - signOut() - Sign out current session
 * - signUp.email() - Create new user account
 */
/**
 * Get the base URL for auth endpoints, including any sub-path prefix.
 *
 * - Client-side: Use window.location.origin + NEXT_PUBLIC_BASE_PATH (works for any domain)
 * - Server-side: Use environment variable (for SSR/build time)
 *
 * The basePath must be included here because the auth client runs in the browser
 * where the full external URL (including the basePath prefix) is visible. This is
 * different from server-side Better-Auth which receives requests with the basePath
 * already stripped by Next.js.
 *
 * NEXT_PUBLIC_BASE_PATH is injected at build time from HD_HOMEY_BASE_PATH via
 * the Next.js public env var convention (NEXT_PUBLIC_ prefix).
 */
const getAuthBaseURL = (): string => {
    const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
    if (typeof window !== 'undefined') {
        return `${window.location.origin}${basePath}`;
    }
    return (process.env.BETTER_AUTH_URL
        ?? process.env.NEXTAUTH_URL
        ?? 'http://localhost:3000') + basePath;
};

export const authClient = createAuthClient({
    baseURL: getAuthBaseURL(),
});

/**
 * Export commonly used hooks and functions for convenience
 */
export const { useSession, signIn, signOut, signUp } = authClient;
