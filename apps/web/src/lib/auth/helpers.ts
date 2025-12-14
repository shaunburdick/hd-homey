import { headers } from 'next/headers';
import { AuthRoles } from '../auth-roles';
import { auth } from './auth';
import type { Session, User } from './types';

export { AuthRoles };
export type { Session, User };

/**
 * Require a specific role for server actions
 *
 * @param role - The required role
 * @returns The session if authorized
 * @throws Error if unauthorized
 */
export async function requireRole(role: AuthRoles): Promise<Session> {
    const rawSession = await auth.api.getSession({
        headers: await headers()
    });

    // Cast to our custom session type (Better-Auth doesn't infer custom fields properly)
    const session = rawSession as unknown as Session;

    // Check for valid session and user
    if (session?.user === null || session?.user === undefined) {
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
export async function requireAdmin(): Promise<Session> {
    return await requireRole(AuthRoles.Admin);
}
