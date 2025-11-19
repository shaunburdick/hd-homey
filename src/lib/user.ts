'use server';

import bcrypt from 'bcrypt';

const SALT_ROUNDS = 10;

/**
 * Generates a hashed password using bcrypt
 */
export async function generateHashPassword(password: string): Promise<string> {
    return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Verifies the attempted password against the stored hash using bcrypt
 */
export async function verifyPassword(persistedPassword: string, passwordAttempt: string): Promise<boolean> {
    return await bcrypt.compare(passwordAttempt, persistedPassword);
}
