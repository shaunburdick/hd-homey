'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/database/db';
import { users } from '@/lib/database/schema';
import { getUserErrors, isUserValid } from '@/lib/database/validate';
import { generateHashPassword } from '@/lib/user';
import { requireAdmin } from '@/lib/auth';

export async function createUser(prevState: unknown, formData: FormData) {
    // Check authorization
    try {
        await requireAdmin();
    } catch (error) {
        return [{ path: 'authorization', message: error instanceof Error ? error.message : 'Unauthorized' }];
    }

    const db = await getDb();

    const newUser = {
        username: formData.get('username'),
        name: formData.get('name'),
        passHash: await generateHashPassword(formData.get('password')?.toString() || ''),
        role: formData.get('role')
    };

    if (isUserValid(newUser)) {
        const result = await db.insert(users).values(newUser).returning();
        revalidatePath('/users');
        redirect(`/users/${result[0].id}`);
    } else {
        const errors = getUserErrors(newUser);
        return [...errors].map(e => ({ path: e.path, message: e.message }));
    }
}

export async function updateUser(prevState: unknown, formData: FormData) {
    // Check authorization
    try {
        await requireAdmin();
    } catch (error) {
        return [{ path: 'authorization', message: error instanceof Error ? error.message : 'Unauthorized' }];
    }

    const userId = parseInt(formData.get('id')?.toString() || '0', 10);
    if (!userId) {
        return [{ path: 'id', message: 'Invalid user ID' }];
    }

    const db = await getDb();
    const password = formData.get('password')?.toString();

    // Build update object - only include password if provided
    const updateData: {
        name?: string;
        passHash?: string;
        is_active?: boolean;
    } = {
        name: formData.get('name')?.toString(),
        is_active: formData.get('is_active') === 'true'
    };

    // Only update password if a new one is provided
    if (password && password.trim() !== '') {
        updateData.passHash = await generateHashPassword(password);
    }

    await db.update(users)
        .set(updateData)
        .where(eq(users.id, userId));

    revalidatePath('/users');
    revalidatePath(`/users/${userId}`);
    redirect(`/users/${userId}`);
}

