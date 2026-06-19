'use server';

import { hashPassword as betterAuthHashPassword, verifyPassword as betterAuthVerifyPassword } from 'better-auth/crypto';
import Logger from './logger';

/** Minimum acceptable password length */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Generates a hashed password using Better-Auth's scrypt implementation
 *
 * Better-Auth uses scrypt (not bcrypt) with format: `salt:hash`
 * This must match the hashing algorithm used by Better-Auth's username plugin
 *
 * @param password - Plain text password to hash (minimum 8 characters)
 * @returns Hashed password in format `salt:hash`
 * @throws {Error} If password is invalid or hashing fails
 */
export async function generateHashPassword(password: string): Promise<string> {
    if (password === '' || password.length < MIN_PASSWORD_LENGTH) {
        throw new Error('Password must be at least 8 characters');
    }

    try {
        return await betterAuthHashPassword(password);
    } catch (error) {
        Logger.error({ error }, 'Failed to hash password');
        throw new Error('Failed to hash password', { cause: error });
    }
}

/**
 * Verifies the attempted password against the stored hash using Better-Auth's scrypt
 *
 * This function never throws - it returns false on any error to prevent information leakage.
 * Invalid inputs or verification errors are logged but not exposed to the caller.
 *
 * @param persistedPassword - The stored password hash (format: `salt:hash`)
 * @param passwordAttempt - The plain text password to verify
 * @returns True if password matches, false otherwise (never throws)
 */
export async function verifyPassword(persistedPassword: string, passwordAttempt: string): Promise<boolean> {
    // Guard against invalid inputs
    if (persistedPassword === '' || passwordAttempt === '') {
        return false;
    }

    try {
        return await betterAuthVerifyPassword({ hash: persistedPassword, password: passwordAttempt });
    } catch (error) {
        Logger.error({ error }, 'Password verification failed');
        return false; // Never throw on verification - just return false
    }
}
