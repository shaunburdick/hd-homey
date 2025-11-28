'use client';

import { authClient } from '@/lib/auth/auth-client';
import type { ReactNode } from 'react';
import type { AuthRoles } from '@/lib/auth-roles';

interface RoleGuardProps {
    allowedRoles: AuthRoles[];
    children: ReactNode;
    fallback?: ReactNode;
}

/**
 * Client component that conditionally renders children based on user role
 *
 * @param allowedRoles - Array of roles that can see the children
 * @param children - Content to show if user has allowed role
 * @param fallback - Optional content to show if user doesn't have required role (default: hide content)
 */
export default function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
    const { data: session, isPending } = authClient.useSession();

    // Show nothing while loading
    if (isPending) {
        return null;
    }

    // No session or no user - hide content
    if (!session?.user) {
        return fallback;
    }

    // Check if user's role is in allowed roles
    // @ts-expect-error - Better-Auth types don't include custom fields yet
    const hasRole = allowedRoles.includes(session.user.role as AuthRoles);

    // Show children if authorized, otherwise show fallback (default: nothing)
    return hasRole ? children : fallback;
}
