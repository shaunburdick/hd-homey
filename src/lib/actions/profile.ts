'use server';

import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { getDb } from '@/lib/database/db';
import { users } from '@/lib/database/schema';
import { generateHashPassword, verifyPassword } from '@/lib/user';

export interface FormState {
    errors: Record<string, string[]>;
    success?: boolean;
}

/**
 * Change user's password
 * Users can only change their own password
 */
export async function changePassword(
    prevState: FormState,
    formData: FormData
): Promise<FormState> {
    const session = await auth();

    if (session?.user === undefined) {
        return {
            errors: {
                _form: ['You must be logged in to change your password'],
            },
        };
    }

    const userId = Number(formData.get('userId'));
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    // Verify user can only change their own password
    if (userId !== session.user.id) {
        return {
            errors: {
                _form: ['You can only change your own password'],
            },
        };
    }

    // Validate input
    const errors: Record<string, string[]> = {};

    if (currentPassword.length === 0) {
        errors.currentPassword = ['Current password is required'];
    }

    if (newPassword.length === 0) {
        errors.newPassword = ['New password is required'];
    } else if (newPassword.length < 8) {
        errors.newPassword = ['Password must be at least 8 characters'];
    }

    if (confirmPassword.length === 0) {
        errors.confirmPassword = ['Please confirm your new password'];
    } else if (newPassword !== confirmPassword) {
        errors.confirmPassword = ['Passwords do not match'];
    }

    if (Object.keys(errors).length > 0) {
        return { errors };
    }

    try {
        const db = await getDb();

        // Get user's current password hash
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
        });

        if (user === undefined) {
            return {
                errors: {
                    _form: ['User not found'],
                },
            };
        }

        // Verify current password
        const isValid = await verifyPassword(user.passHash, currentPassword);
        if (!isValid) {
            return {
                errors: {
                    currentPassword: ['Current password is incorrect'],
                },
            };
        }

        // Hash new password
        const newPassHash = await generateHashPassword(newPassword);

        // Update password
        await db
            .update(users)
            .set({
                passHash: newPassHash,
            })
            .where(eq(users.id, userId))
            .run();

        return {
            errors: {},
            success: true,
        };
    } catch {
        return {
            errors: {
                _form: ['Failed to change password. Please try again.'],
            },
        };
    }
}
