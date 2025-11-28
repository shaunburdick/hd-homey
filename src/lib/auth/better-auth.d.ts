/**
 * Better-Auth type augmentation for HD Homey custom fields
 *
 * This extends Better-Auth types to include custom user fields we defined
 * in src/lib/auth/auth.ts via user.additionalFields configuration.
 */

// Augment Better-Auth's session types to include custom fields
declare module 'better-auth/types' {
    interface User {
        role: string;
        isActive: boolean;
        deletedAt?: Date | null;
    }
}

// Augment React client types
declare module 'better-auth/react' {
    interface Session {
        user: {
            id: string;
            email: string;
            emailVerified: boolean;
            name: string;
            image?: string | null;
            createdAt: Date;
            updatedAt: Date;
            role: string;
            isActive: boolean;
            deletedAt?: Date | null;
        };
    }
}

// Augment server-side API types
declare module 'better-auth' {
    export interface BetterAuthOptions {
        user?: {
            additionalFields?: {
                role?: {
                    type: 'string';
                    required?: boolean;
                    defaultValue?: string;
                    input?: boolean;
                };
                isActive?: {
                    type: 'boolean';
                    required?: boolean;
                    defaultValue?: boolean;
                };
                deletedAt?: {
                    type: 'date';
                    required?: boolean;
                };
            };
        };
    }
}
