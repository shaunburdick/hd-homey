'use server';

import { redirect } from 'next/navigation';
import { getDb } from '@/lib/database/db';
import { users } from '@/lib/database/schema';
import { getUserErrors, isUserValid } from '@/lib/database/validate';
import { generateHashPassword } from '@/lib/user';
import { AuthRoles } from '@/lib/auth-roles';

export async function createFirstUser(prevState: unknown, formData: FormData) {
    const db = await getDb();

    const password = formData.get('password');
    const passwordString = password !== null
        ? password.toString()
        : '';

    const newUser = {
        username: formData.get('username'),
        name: formData.get('name'),
        passHash: await generateHashPassword(passwordString),
        role: AuthRoles.Admin // Always create first user as admin
    };

    if (isUserValid(newUser)) {
        await db.insert(users).values(newUser);
        // Redirect to signin page after successful creation
        redirect('/users/signin');
    } else {
        const errors = getUserErrors(newUser);
        return [...errors].map(e => ({ path: e.path, message: e.message }));
    }
}
