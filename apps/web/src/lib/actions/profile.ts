'use server';

import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { auth } from '@/lib/auth/auth';
import { getDb } from '@/lib/database/db';
import { account } from '@/lib/database/schema';
import { generateHashPassword, verifyPassword } from '@/lib/user';
import type { FormState } from '@/lib/errors';

/** Minimum password length */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Options for validatePasswordFields
 */
interface ValidatePasswordOptions {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
}

/**
 * Validate password change fields
 *
 * @param options - currentPassword, newPassword, and confirmPassword values
 * @returns Record of field errors, or empty object if valid
 */
function validatePasswordFields({
    currentPassword,
    newPassword,
    confirmPassword,
}: ValidatePasswordOptions): Record<string, string[]> {
    const errors: Record<string, string[]> = {};

    if (currentPassword.length === 0) {
        errors.currentPassword = ['Current password is required'];
    }

    if (newPassword.length === 0) {
        errors.newPassword = ['New password is required'];
    } else if (newPassword.length < MIN_PASSWORD_LENGTH) {
        errors.newPassword = ['Password must be at least 8 characters'];
    }

    if (confirmPassword.length === 0) {
        errors.confirmPassword = ['Please confirm your new password'];
    } else if (newPassword !== confirmPassword) {
        errors.confirmPassword = ['Passwords do not match'];
    }

    return errors;
}

/**
 * Options for verifyAndUpdatePassword
 */
interface VerifyAndUpdatePasswordOptions {
    userId: string;
    currentPassword: string;
    newPassword: string;
}

/**
 * Verify the current password and update to the new one
 *
 * @param options - userId, currentPassword, and newPassword
 * @returns Form state with success or error
 */
async function verifyAndUpdatePassword({
    userId,
    currentPassword,
    newPassword,
}: VerifyAndUpdatePasswordOptions): Promise<FormState> {
    const db = await getDb();

    const userAccount = await db.query.account.findFirst({
        where: eq(account.userId, userId),
    });

    if (userAccount?.password === null || userAccount?.password === undefined || userAccount.password === '') {
        return {
            errors: {
                _form: ['User not found or no password set'],
            },
        };
    }

    const isValid = await verifyPassword(userAccount.password, currentPassword);
    if (!isValid) {
        return {
            errors: {
                currentPassword: ['Current password is incorrect'],
            },
        };
    }

    const newPassHash = await generateHashPassword(newPassword);

    db
        .update(account)
        .set({
            password: newPassHash,
        })
        .where(eq(account.userId, userId))
        .run();

    return {
        errors: {},
        success: true,
    };
}

/**
 * Change user's password
 * Users can only change their own password
 */
export async function changePassword(
    prevState: FormState,
    formData: FormData
): Promise<FormState> {
    const session = await auth.api.getSession({
        headers: await headers()
    });

    if (session?.user === null || session?.user === undefined) {
        return {
            errors: {
                _form: ['You must be logged in to change your password'],
            },
        };
    }

    const userId = formData.get('userId') as string;
    const currentPassword = formData.get('currentPassword') as string;
    const newPassword = formData.get('newPassword') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    if (userId !== session.user.id) {
        return {
            errors: {
                _form: ['You can only change your own password'],
            },
        };
    }

    const errors = validatePasswordFields({ currentPassword, newPassword, confirmPassword });
    if (Object.keys(errors).length > 0) {
        return { errors };
    }

    try {
        return await verifyAndUpdatePassword({ userId, currentPassword, newPassword });
    } catch {
        return {
            errors: {
                _form: ['Failed to change password. Please try again.'],
            },
        };
    }
}
