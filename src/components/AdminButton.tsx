'use client';

import RoleGuard from './RoleGuard';
import { AuthRoles } from '@/lib/auth-roles';

interface AdminButtonProps {
    children: React.ReactNode;
    type?: 'button' | 'submit' | 'reset';
    onClick?: () => void;
}

/**
 * A button that only shows for admin users
 */
export function AdminButton({ children, type = 'button', onClick }: AdminButtonProps) {
    return (
        <RoleGuard allowedRoles={[AuthRoles.Admin]}>
            <button type={type} onClick={onClick}>
                {children}
            </button>
        </RoleGuard>
    );
}
