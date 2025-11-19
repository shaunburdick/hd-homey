import { AuthRoles } from './auth-roles';
import { auth } from '@/auth';

export { AuthRoles };

/**
 * Require a specific role for server actions
 *
 * @param role - The required role
 * @returns The session if authorized
 * @throws Error if unauthorized
 */
export async function requireRole(role: AuthRoles) {
    const session = await auth();

    if (session === null || session === undefined || !session.user) {
        throw new Error('Not authenticated');
    }

    if (session.user.role !== role) {
        throw new Error(`Unauthorized: requires ${role} role`);
    }

    return session;
}

/**
 * Require admin role for server actions
 *
 * @returns The session if user is admin
 * @throws Error if not admin
 */
export async function requireAdmin() {
    return await requireRole(AuthRoles.Admin);
}
