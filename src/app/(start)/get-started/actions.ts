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

    if (!username || username.length < 3) {
        errors.push({ path: 'username', message: 'Username must be at least 3 characters' });
    }

    if (!name || name.length < 1) {
        errors.push({ path: 'name', message: 'Name is required' });
    }

    if (!password || password.length < 8) {
        errors.push({ path: 'password', message: 'Password must be at least 8 characters' });
    }

    if (errors.length > 0) {
        return errors;
    }

    try {
        // Create admin user via Better-Auth
        // Note: Better-Auth uses email field for username
        await auth.api.signUpEmail({
            body: {
                email: username!,
                password: password!,
                name: name!,
                role: AuthRoles.Admin, // First user is always admin
            },
        });

        // Redirect to signin page after successful creation
        redirect('/users/signin');
    } catch (error) {
        console.error('Error creating first user:', error);
        return [{ path: 'form', message: 'Failed to create user. Please try again.' }];
    }
}
