'use server';

import crypto from 'node:crypto';
import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { getDb } from '@/lib/database/db';
import { user, account } from '@/lib/database/schema';
import { generateHashPassword } from '@/lib/user';
import { AuthRoles } from '@/lib/auth-roles';
import logger from '@/lib/logger';

export async function createFirstUser(prevState: unknown, formData: FormData) {
    const username = formData.get('username')?.toString();
    const name = formData.get('name')?.toString();
    const password = formData.get('password')?.toString();

    // Validation
    const errors: { path: string; message: string }[] = [];

    if ((username?.length ?? 0) < 3) {
        errors.push({ path: 'username', message: 'Username must be at least 3 characters' });
    }

    if ((name?.length ?? 0) < 1) {
        errors.push({ path: 'name', message: 'Name is required' });
    }

    if ((password?.length ?? 0) < 8) {
        errors.push({ path: 'password', message: 'Password must be at least 8 characters' });
    }

    if (errors.length > 0) {
        return errors;
    }

    // TypeScript now knows these are defined because validation passed
    const validUsername = username as string;
    const validName = name as string;
    const validPassword = password as string;

    try {
        const db = await getDb();

        // Check if username already exists to prevent race conditions
        const existingUser = await db.query.user.findFirst({
            where: eq(user.username, validUsername)
        });

        if (existingUser !== undefined) {
            return [{ path: 'username', message: 'Username already exists' }];
        }

        // Generate Better-Auth compatible user ID
        const userId = crypto.randomUUID();
        const accountId = crypto.randomUUID();

        // Create user record
        await db.insert(user).values({
            id: userId,
            username: validUsername,
            email: `${validUsername}@local.hdhomey.app`, // Username plugin requires email
            emailVerified: false,
            name: validName,
            role: AuthRoles.Admin, // First user is always admin
            isActive: true,
        });

        // Create account record with password
        const hashedPassword = await generateHashPassword(validPassword);
        await db.insert(account).values({
            id: accountId,
            userId,
            accountId: userId,
            providerId: 'credential',
            password: hashedPassword,
        });

        // Redirect to signin page after successful creation
        redirect('/users/signin');
    } catch (error) {
        // Re-throw redirect errors (this is expected behavior)
        if (isRedirectError(error)) {
            throw error;
        }

        logger.error({ error }, 'Error creating first user');
        return [{ path: 'form', message: 'Failed to create user. Please try again.' }];
    }
}
