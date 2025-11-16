'use client';

import { SessionProvider as NextAuthSessionProvider } from 'next-auth/react';
import type { ReactNode } from 'react';

interface SessionProviderProps {
    children: ReactNode;
}

export function SessionProvider({ children }: SessionProviderProps) {
    return (
        <NextAuthSessionProvider
            refetchInterval={0}
            refetchOnWindowFocus={true}
        >
            {children}
        </NextAuthSessionProvider>
    );
}
