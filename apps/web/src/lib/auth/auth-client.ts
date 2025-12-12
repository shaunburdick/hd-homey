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
 * Get the base URL for auth endpoints
 * - Client-side: Use window.location.origin (works for any domain)
 * - Server-side: Use environment variable (for SSR/build time)
 */
const getAuthBaseURL = (): string => {
    if (typeof window !== 'undefined') {
        return window.location.origin;
    }
    return process.env.BETTER_AUTH_URL
        ?? process.env.NEXTAUTH_URL
        ?? 'http://localhost:3000';
};

export const authClient = createAuthClient({
    baseURL: getAuthBaseURL(),
});

/**
 * Export commonly used hooks and functions for convenience
 */
export const { useSession, signIn, signOut, signUp } = authClient;
