'use server';

import crypto from 'node:crypto';
import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/database/db';
import { user, account } from '@/lib/database/schema';
import { generateHashPassword } from '@/lib/user';
import { AuthRoles } from '@/lib/auth-roles';
import logger from '@/lib/logger';
import type { ValidationError } from '@/lib/errors';

/** Minimum username length */
const MIN_USERNAME_LENGTH = 3;

/** Minimum password length */
const MIN_PASSWORD_LENGTH = 8;

interface FirstUserFormInputs {
    username: string | undefined;
    name: string | undefined;
    password: string | undefined;
}

/**
 * Validate the form inputs for first-user creation.
 * Returns a list of validation errors (empty if valid).
 */
function validateFirstUserInputs({ username, name, password }: FirstUserFormInputs): ValidationError[] {
    const errors: ValidationError[] = [];

    if ((username?.length ?? 0) < MIN_USERNAME_LENGTH) {
        errors.push({ path: 'username', message: 'Username must be at least 3 characters' });
    }

    if ((name?.length ?? 0) < 1) {
        errors.push({ path: 'name', message: 'Name is required' });
    }

    if ((password?.length ?? 0) < MIN_PASSWORD_LENGTH) {
        errors.push({ path: 'password', message: 'Password must be at least 8 characters' });
    }

    return errors;
}

interface FirstUserData {
    username: string;
    name: string;
    password: string;
}

/**
 * Persist a new admin user account to the database.
 * Both the user and credential account records are created together.
 */
async function persistFirstUser({ username, name, password }: FirstUserData): Promise<void> {
    const db = await getDb();
    const normalizedUsername = username.toLowerCase();

    const existingUser = await db.query.user.findFirst({
        where: eq(user.username, normalizedUsername)
    });

    if (existingUser !== undefined) {
        throw new Error('USERNAME_EXISTS');
    }

    const userId = crypto.randomUUID();
    const accountId = crypto.randomUUID();

    await db.insert(user).values({
        id: userId,
        username: normalizedUsername,
        displayUsername: username,
        email: `${normalizedUsername}@local.hdhomey.app`,
        emailVerified: false,
        name,
        role: AuthRoles.Admin,
        isActive: true,
    });

    const hashedPassword = await generateHashPassword(password);
    await db.insert(account).values({
        id: accountId,
        userId,
        accountId: userId,
        providerId: 'credential',
        password: hashedPassword,
    });
}

export async function createFirstUser(prevState: unknown, formData: FormData) {
    const username = formData.get('username')?.toString();
    const name = formData.get('name')?.toString();
    const password = formData.get('password')?.toString();

    const errors = validateFirstUserInputs({ username, name, password });
    if (errors.length > 0) {
        return errors;
    }

    // TypeScript now knows these are defined because validation passed
    const validUsername = username as string;
    const validName = name as string;
    const validPassword = password as string;

    try {
        await persistFirstUser({ username: validUsername, name: validName, password: validPassword });
        redirect('/users/signin');
    } catch (error) {
        if (isRedirectError(error)) {
            throw error;
        }

        if (error instanceof Error && error.message === 'USERNAME_EXISTS') {
            return [{ path: 'username', message: 'Username already exists' }];
        }

        logger.error({ error }, 'Error creating first user');
        return [{ path: 'form', message: 'Failed to create user. Please try again.' }];
    }
}
