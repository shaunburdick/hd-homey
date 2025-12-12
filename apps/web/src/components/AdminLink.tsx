'use client';

import Link from 'next/link';
import RoleGuard from './RoleGuard';
import { AuthRoles } from '@/lib/auth-roles';

interface AdminLinkProps {
    href: string;
    children: React.ReactNode;
}

/**
 * A Link component that only shows for admin users
 */
export function AdminLink({ href, children }: AdminLinkProps) {
    return (
        <RoleGuard allowedRoles={[AuthRoles.Admin]}>
            <Link href={href}>{children}</Link>
        </RoleGuard>
    );
}
