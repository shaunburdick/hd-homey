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
 * - Browser: use window.location.origin + window.__HD_HOMEY_BASE_PATH__
 *   The prefix comes from the value injected at request time by the root
 *   layout (a Server Component reading HD_HOMEY_BASE_PATH from the env).
 * - SSR: fall back to BETTER_AUTH_URL / NEXTAUTH_URL + the raw env var.
 *
 * The basePath must be included here because the auth client runs in the
 * browser where the full external URL (including the prefix) is visible.
 * Server-side Better-Auth does NOT need it — the reverse proxy strips the
 * prefix before requests reach Next.js.
 */
const getAuthBaseURL = (): string => {
    if (typeof window !== 'undefined') {
        return `${window.location.origin}${window.__HD_HOMEY_BASE_PATH__ ?? ''}`;
    }

    // SSR fallback: normalize the env var the same way Config.BASE_PATH does
    const raw = process.env.HD_HOMEY_BASE_PATH ?? '';
    const basePath = raw === '' ? '' : (raw.startsWith('/') ? raw : `/${raw}`).replace(/\/$/, '');

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
