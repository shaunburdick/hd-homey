'use server';

// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore - TS2305: Module has no exported member (false positive with standalone tsc)
import { hashPassword as betterAuthHashPassword, verifyPassword as betterAuthVerifyPassword } from 'better-auth/crypto';

/**
 * Generates a hashed password using Better-Auth's scrypt implementation
 *
 * Better-Auth uses scrypt (not bcrypt) with format: `salt:hash`
 * This must match the hashing algorithm used by Better-Auth's username plugin
 */
export async function generateHashPassword(password: string): Promise<string> {
    return await betterAuthHashPassword(password);
}

/**
 * Verifies the attempted password against the stored hash using Better-Auth's scrypt
 *
 * @param persistedPassword - The stored password hash (format: `salt:hash`)
 * @param passwordAttempt - The plain text password to verify
 */
export async function verifyPassword(persistedPassword: string, passwordAttempt: string): Promise<boolean> {
    return await betterAuthVerifyPassword({ hash: persistedPassword, password: passwordAttempt });
}
