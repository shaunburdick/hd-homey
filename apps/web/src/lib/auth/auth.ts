// Better-Auth uses .d.mts type definition files which TypeScript's standalone tsc cannot
// properly resolve with moduleResolution: "bundler". This is a known TypeScript limitation.
// Next.js bundler handles these correctly. We use @ts-ignore for compatibility with both.
// See: https://github.com/microsoft/TypeScript/issues/54102
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS2305: Module has no exported member (false positive with standalone tsc)
import { betterAuth } from 'better-auth';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS2305: Module has no exported member (false positive with standalone tsc)
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS2305: Module has no exported member (false positive with standalone tsc)
import { username } from 'better-auth/plugins';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import { deviceAuth } from './device-auth-plugin';
import { connection } from '@/lib/database/db';
import * as schema from '@/lib/database/schema';
import { AuthRoles } from '@/lib/auth-roles';
import Config from '@/lib/config';

/**
 * Better-Auth instance for HD Homey
 *
 * Configured with:
 * - Username/password authentication (via username plugin)
 * - JWT/Stateless sessions (7-day expiry)
 * - Custom user fields: role, isActive, deletedAt
 * - SQLite database via Drizzle adapter
 *
 * Session Strategy: JWT/Stateless
 * - Sessions stored in signed JWT cookies
 * - Session validation requires only signature check (no DB query)
 * - Edge Runtime compatible
 * - Cannot revoke individual sessions (must change AUTH_SECRET to invalidate all)
 *
 * Important: When using drizzleAdapter with a schema, do NOT manually map field names
 * in the configuration. The adapter reads field mappings directly from the Drizzle schema.
 *
 * Sub-path deployment note:
 * When HD_HOMEY_BASE_PATH is set, Next.js strips the basePath from the URL before
 * passing requests to route handlers. Therefore, the server-side baseURL must NOT
 * include the basePath — Next.js handles that transparently. The client-side auth
 * client (auth-client.ts) uses the full URL with basePath because the browser sees
 * the full external URL.
 */
const db = drizzle(connection());

export const auth = betterAuth({
    database: drizzleAdapter(db, {
        provider: 'sqlite',
        schema: {
            user: schema.user,
            session: schema.session,
            account: schema.account,
            verification: schema.verification,
        },
    }),

    // Advanced configuration
    advanced: {
        useSecureCookies: process.env.NODE_ENV === 'production',
        crossSubDomainCookies: {
            enabled: false,
        },
    },

    // Session configuration
    session: {
        cookieCache: {
            enabled: true,
            maxAge: 60 * 60 * 24 * 7, // 7 days
        },
        expiresIn: 60 * 60 * 24 * 7, // 7 days
        updateAge: 60 * 60 * 24, // Refresh session every 24 hours
    },

    // User configuration with custom fields
    user: {
        additionalFields: {
            role: {
                type: 'string',
                required: true,
                defaultValue: AuthRoles.Viewer,
                input: false, // Don't allow client to set role
                fieldName: 'role',
            },
            isActive: {
                type: 'boolean',
                required: true,
                defaultValue: true,
                fieldName: 'is_active',
            },
            deletedAt: {
                type: 'date',
                required: false,
                fieldName: 'deleted_at',
            },
        },
    },

    // Authentication plugins
    plugins: [
        username(),
        deviceAuth(), // Device code authentication for Android/TV apps
    ],

    // Security
    secret: Config.AUTH_SECRET,
    // Server-side uses the base URL WITHOUT the basePath because Next.js strips
    // the basePath from incoming requests before they reach the route handler.
    baseURL: Config.AUTH_BASE_URL,
    trustedOrigins: [Config.AUTH_BASE_URL],
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
