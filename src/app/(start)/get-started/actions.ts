'use server';

import { redirect } from 'next/navigation';
import { auth } from '@/lib/auth/auth';
import { AuthRoles } from '@/lib/auth-roles';

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
        // Create admin user via Better-Auth
        // Note: Better-Auth uses email field for username
        await auth.api.signUpEmail({
            body: {
                email: validUsername,
                password: validPassword,
                name: validName,
                role: AuthRoles.Admin, // First user is always admin
            },
        });

        // Redirect to signin page after successful creation
        redirect('/users/signin');
    } catch (error) {
        // eslint-disable-next-line no-console
        console.error('Error creating first user:', error);
        return [{ path: 'form', message: 'Failed to create user. Please try again.' }];
    }
}
