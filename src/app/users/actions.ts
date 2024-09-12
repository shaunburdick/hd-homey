'use server';

import { getDb } from '@/lib/database/db';
import { users } from '@/lib/database/schema';
import { redirect } from 'next/navigation';
import { getUserErrors, isUserValid } from '@/lib/database/validate';
import { revalidatePath } from 'next/cache';
import { generateHashPassword } from '@/lib/user';
import { signIn } from '../../auth';

export async function createUser(prevState: unknown, formData: FormData) {
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

export async function signin(formData: FormData) {
    await signIn('credentials', formData);
}

