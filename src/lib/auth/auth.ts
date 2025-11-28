import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "@/lib/database/db";
import { AuthRoles } from "@/lib/auth-roles";
import Config from "@/lib/config";

/**
 * Better-Auth instance for HD Homey
 * 
 * Configured with:
 * - Username/password authentication (via emailAndPassword)
 * - JWT/Stateless sessions (7-day expiry, same as NextAuth)
 * - Custom user fields: role, isActive, deletedAt
 * - SQLite database via Drizzle adapter
 * 
 * Session Strategy: JWT/Stateless
 * - Sessions stored in signed JWT cookies (no session table)
 * - Session validation requires only signature check (no DB query)
 * - Edge Runtime compatible
 * - Cannot revoke individual sessions (change version to invalidate all)
 */
export const auth = betterAuth({
    database: async () => {
        const db = await getDb();
        return drizzleAdapter(db, {
            provider: "sqlite",
        });
    },
    
    // Username/password authentication
    emailAndPassword: {
        enabled: true,
        requireEmailVerification: false, // No email verification for now
    },
    
    // JWT/Stateless sessions (same as NextAuth)
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 60 * 60 * 24 * 7, // 7 days (JWT cache duration)
        },
        // Stateless JWT sessions
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // Refresh session every 24 hours
    },
    
    // Custom user fields for HD Homey
    user: {
        additionalFields: {
            role: {
                type: "string",
                required: true,
                defaultValue: AuthRoles.Viewer,
                input: true, // Allow setting during signup
            },
            isActive: {
                type: "boolean",
                required: true,
                defaultValue: true,
            },
            deletedAt: {
                type: "date",
                required: false,
            },
        },
    },
    
    // Use AUTH_SECRET from config
    secret: Config.AUTH_SECRET,
    
    // Base URL for auth endpoints
    baseURL: process.env.BETTER_AUTH_URL || process.env.NEXTAUTH_URL || "http://localhost:3000",
    
    // Trust proxy headers (for Docker/reverse proxy)
    trustedOrigins: process.env.BETTER_AUTH_URL ? [process.env.BETTER_AUTH_URL] : [],
});

/**
 * Type exports for Better-Auth session and user
 * 
 * Note: Better-Auth inferred types include our custom fields (role, isActive, deletedAt)
 * that we defined in the user.additionalFields configuration above.
 */
export type Session = typeof auth.$Infer.Session.session & {
    user: typeof auth.$Infer.Session.user & {
        role: string;
        isActive: boolean;
        deletedAt?: Date | null;
    };
};

export type BetterAuthUser = typeof auth.$Infer.Session.user & {
    role: string;
    isActive: boolean;
    deletedAt?: Date | null;
};
