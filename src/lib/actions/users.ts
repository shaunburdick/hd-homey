'use server';

import crypto from 'node:crypto';
import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import type { DB } from '@/lib/database/db';
import { getDb } from '@/lib/database/db';
import { user, account } from '@/lib/database/schema';
import { requireAdmin } from '@/lib/auth/helpers';
import { generateHashPassword } from '@/lib/user';
import type { AuthRoles } from '@/lib/auth-roles';

/**
 * Update user password in account table
 */
async function updateUserPassword(db: DB, userId: string, password: string): Promise<void> {
    const hashedPassword = await generateHashPassword(password);

    // Find account for this user
    const userAccount = await db.select()
        .from(account)
        .where(eq(account.userId, userId))
        .limit(1)
        .get();

    if (userAccount === undefined) {
        throw new Error('User account not found - cannot update password');
    }

    await db.update(account)
        .set({
            password: hashedPassword,
            updatedAt: new Date()
        })
        .where(eq(account.id, userAccount.id));
}

/**
 * Validate update user form data
 */
function validateUpdateUser(
    name: string | undefined,
    password: string | undefined
): { path: string; message: string }[] {
    const errors: { path: string; message: string }[] = [];

    if ((name?.length ?? 0) < 3) {
        errors.push({ path: 'name', message: 'Name must be at least 3 characters' });
    }

    if (password !== undefined && password.length > 0 && password.length < 8) {
        errors.push({ path: 'password', message: 'Password must be at least 8 characters' });
    }

    return errors;
}

/**
 * Create a new user via Better-Auth API
 */
export async function createUser(prevState: unknown, formData: FormData) {
    // Check authorization
    try {
        await requireAdmin();
    } catch (error) {
        return [{ path: 'authorization', message: error instanceof Error ? error.message : 'Unauthorized' }];
    }

    const username = formData.get('username')?.toString();
    const name = formData.get('name')?.toString();
    const password = formData.get('password')?.toString();
    const role = formData.get('role')?.toString();

    // Validation
    const errors: { path: string; message: string }[] = [];

    if ((username?.length ?? 0) < 3) {
        errors.push({ path: 'username', message: 'Username must be at least 3 characters' });
    }

    if ((name?.length ?? 0) < 3) {
        errors.push({ path: 'name', message: 'Name must be at least 3 characters' });
    }

    if ((password?.length ?? 0) < 8) {
        errors.push({ path: 'password', message: 'Password must be at least 8 characters' });
    }

    if (role === undefined || (role !== 'admin' && role !== 'viewer')) {
        errors.push({ path: 'role', message: 'Invalid role' });
    }

    if (errors.length > 0) {
        return errors;
    }

    try {
        const db = await getDb();

        // Generate Better-Auth compatible IDs
        const userId = crypto.randomUUID();
        const accountId = crypto.randomUUID();

        // Create user record
        await db.insert(user).values({
            id: userId,
            username: username as string,
            email: `${username}@local.hdhomey.app`, // Username plugin requires email
            emailVerified: false,
            name: name as string,
            role: role as AuthRoles,
            isActive: true,
        });

        // Create account record with password
        const hashedPassword = await generateHashPassword(password as string);
        await db.insert(account).values({
            id: accountId,
            userId,
            accountId: userId,
            providerId: 'credential',
            password: hashedPassword,
        });

        revalidatePath('/users');
        redirect(`/users/${userId}`);
    } catch (error) {
        // Re-throw redirect errors (this is expected behavior)
        if (error !== null && error !== undefined && isRedirectError(error)) {
            throw error;
        }
        return [{ path: 'form', message: error instanceof Error ? error.message : 'Failed to create user' }];
    }
}

/**
 * Update an existing user
 * Note: Better-Auth doesn't have a direct API for admin updates,
 * so we update the database directly
 */
export async function updateUser(prevState: unknown, formData: FormData) {
    // Check authorization
    try {
        await requireAdmin();
    } catch (error) {
        return [{ path: 'authorization', message: error instanceof Error ? error.message : 'Unauthorized' }];
    }

    const userId = formData.get('id')?.toString();
    const name = formData.get('name')?.toString();
    const password = formData.get('password')?.toString();

    if (userId === undefined || userId === '') {
        return [{ path: 'id', message: 'Invalid user ID' }];
    }

    const isActive = formData.get('is_active') === 'true';

    // Validation
    const errors = validateUpdateUser(name, password);
    if (errors.length > 0) {
        return errors;
    }

    const db = await getDb();

    try {
        // Update user table
        await db.update(user)
            .set({
                name: name as string,
                isActive,
                updatedAt: new Date()
            })
            .where(eq(user.id, userId));

        // Update password if provided
        const trimmedPassword = password?.trim();
        if (trimmedPassword !== undefined && trimmedPassword.length > 0) {
            await updateUserPassword(db, userId, trimmedPassword);
        }

        revalidatePath('/users');
        revalidatePath(`/users/${userId}`);
        redirect(`/users/${userId}`);
    } catch (error) {
        // Re-throw redirect errors (this is expected behavior)
        if (error !== null && error !== undefined && isRedirectError(error)) {
            throw error;
        }
        return [{ path: 'form', message: error instanceof Error ? error.message : 'Failed to update user' }];
    }
}

/**
 * Soft delete a user (marks as inactive and sets deletedAt timestamp)
 *
 * Note: This performs a soft delete by setting isActive=false and deletedAt timestamp.
 * The user record and associated account remain in the database but the user cannot sign in.
 * This preserves referential integrity and audit trails.
 *
 * @param prevState - Previous form state (unused)
 * @param formData - Form data containing user ID
 * @returns Validation errors or redirects to users list
 */
export async function deleteUser(prevState: unknown, formData: FormData) {
    // Check authorization
    try {
        await requireAdmin();
    } catch (error) {
        return [{ path: 'authorization', message: error instanceof Error ? error.message : 'Unauthorized' }];
    }

    const userId = formData.get('id')?.toString();

    if (userId === undefined || userId === '') {
        return [{ path: 'id', message: 'Invalid user ID' }];
    }

    const db = await getDb();

    try {
        // Soft delete user (account record persists with foreign key)
        await db.update(user)
            .set({
                isActive: false,
                deletedAt: new Date(),
                updatedAt: new Date()
            })
            .where(eq(user.id, userId));

        revalidatePath('/users');
        redirect('/users');
    } catch (error) {
        // Re-throw redirect errors (this is expected behavior)
        if (error !== null && error !== undefined && isRedirectError(error)) {
            throw error;
        }
        return [{ path: 'form', message: error instanceof Error ? error.message : 'Failed to delete user' }];
    }
}

