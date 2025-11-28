'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/database/db';
import { user, account } from '@/lib/database/schema';
import { requireAdmin } from '@/lib/auth/helpers';
import { auth } from '@/lib/auth/auth';
import { generateHashPassword } from '@/lib/user';

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
        // Create user via Better-Auth API (uses email field for username)
        const result = await auth.api.signUpEmail({
            body: {
                email: username as string,
                password: password as string,
                name: name as string,
                role: role as string,
            },
        });

        if (result?.user === undefined) {
            return [{ path: 'form', message: 'Failed to create user' }];
        }

        revalidatePath('/users');
        redirect(`/users/${result.user.id}`);
    } catch (error) {
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

    if (!userId) {
        return [{ path: 'id', message: 'Invalid user ID' }];
    }

    const isActive = formData.get('is_active') === 'true';

    // Validation
    const errors: { path: string; message: string }[] = [];

    if ((name?.length ?? 0) < 3) {
        errors.push({ path: 'name', message: 'Name must be at least 3 characters' });
    }

    if (password && password.length < 8) {
        errors.push({ path: 'password', message: 'Password must be at least 8 characters' });
    }

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
        if (password?.trim()) {
            const hashedPassword = await generateHashPassword(password);

            // Find account for this user
            const userAccount = await db.select()
                .from(account)
                .where(eq(account.userId, userId))
                .limit(1)
                .get();

            if (userAccount) {
                await db.update(account)
                    .set({
                        password: hashedPassword,
                        updatedAt: new Date()
                    })
                    .where(eq(account.id, userAccount.id));
            }
        }

        revalidatePath('/users');
        revalidatePath(`/users/${userId}`);
        redirect(`/users/${userId}`);
    } catch (error) {
        return [{ path: 'form', message: error instanceof Error ? error.message : 'Failed to update user' }];
    }
}

