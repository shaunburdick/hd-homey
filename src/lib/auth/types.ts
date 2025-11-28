/**
 * Type exports for Better-Auth with HD Homey custom fields
 *
 * These types explicitly include our custom user fields (role, isActive, deletedAt)
 * to work around Better-Auth's type inference limitations.
 */

export { AuthRoles } from '../auth-roles';

/**
 * HD Homey user type with custom fields
 */
export interface User {
    id: string;
    email: string;
    emailVerified: boolean;
    name: string;
    image?: string | null;
    createdAt: Date;
    updatedAt: Date;
    // Custom HD Homey fields
    role: string;
    isActive: boolean;
    deletedAt?: Date | null;
}

/**
 * HD Homey session type with custom user fields
 */
export interface Session {
    user: User;
    session: {
        token: string;
        expiresAt: Date;
    };
}

/**
 * Better-Auth API session response type
 */
export interface BetterAuthSession {
    session: {
        token: string;
        expiresAt: Date;
    };
    user: User;
}
