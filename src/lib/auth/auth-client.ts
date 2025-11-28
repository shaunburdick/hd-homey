'use client';

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
export const authClient = createAuthClient({
    baseURL: typeof window !== 'undefined' 
        ? window.location.origin 
        : process.env.NEXT_PUBLIC_BETTER_AUTH_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000',
});

/**
 * Export commonly used hooks and functions for convenience
 */
export const { useSession, signIn, signOut, signUp } = authClient;
