/**
 * Server Actions for Invitation Redemption (SPEC-010)
 * Public operations: redeem invitation and create user account
 */

'use server';

import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/database/db';
import { user, account, invitations } from '@/lib/database/schema';
import { generateHashPassword } from '@/lib/user';
import { validateInvitation } from '@/lib/invitations/invitations';
import { InvitationValidationError } from '@/lib/invitations/types';

/**
 * Form state for invitation redemption
 */
export interface RedeemFormState {
    errors: Record<string, string[]>;
    success?: boolean;
    values?: {
        name?: string;
        username?: string;
    };
}

/**
 * Validate display name format and length
 *
 * @param name - Display name to validate
 * @returns Validation error or null if valid
 */
function validateName(name: string | undefined): string | null {
    if (name === undefined || name.length === 0) {
        return 'Display name is required';
    }

    if (name.length < 2) {
        return 'Display name must be at least 2 characters';
    }

    if (name.length > 100) {
        return 'Display name must be 100 characters or less';
    }

    return null;
}

/**
 * Validate username format and length
 *
 * @param username - Username to validate
 * @returns Validation error or null if valid
 */
function validateUsername(username: string | undefined): string | null {
    if (username === undefined || username.length === 0) {
        return 'Username is required';
    }

    if (username.length < 3) {
        return 'Username must be at least 3 characters';
    }

    if (username.length > 50) {
        return 'Username must be 50 characters or less';
    }

    // Username should only contain alphanumeric, underscore, and hyphen
    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return 'Username can only contain letters, numbers, underscores, and hyphens';
    }

    return null;
}

/**
 * Validate password strength
 *
 * @param password - Password to validate
 * @returns Validation error or null if valid
 */
function validatePassword(password: string | undefined): string | null {
    if (password === undefined || password.length === 0) {
        return 'Password is required';
    }

    if (password.length < 8) {
        return 'Password must be at least 8 characters';
    }

    if (password.length > 100) {
        return 'Password must be 100 characters or less';
    }

    return null;
}

// Error messages
const PASSWORD_MISMATCH_ERROR = 'Passwords do not match';

/**
 * Validate password confirmation matches
 *
 * @param password - Original password
 * @param passwordConfirm - Confirmation password
 * @returns Validation error or null if valid
 */
function validatePasswordConfirmation(
    password: string | undefined,
    passwordConfirm: string | undefined
): string | null {
    if (passwordConfirm === undefined || passwordConfirm.length === 0) {
        return 'Password confirmation is required';
    }

    // Password must be defined to compare
    if (password === undefined || password.length === 0) {
        return 'Password confirmation is required';
    }

    if (password.length !== passwordConfirm.length) {
        return PASSWORD_MISMATCH_ERROR;
    }

    // Use constant-time comparison to prevent timing attacks
    // timingSafeEqual requires equal length buffers
    if (crypto.timingSafeEqual(
        Buffer.from(password),
        Buffer.from(passwordConfirm)
    ) === false) {
        return PASSWORD_MISMATCH_ERROR;
    }

    return null;
}

/**
 * Get user-friendly error message for invitation validation errors
 *
 * @param error - Invitation validation error
 * @returns User-friendly error message
 */
function getInvitationErrorMessage(error: InvitationValidationError): string {
    switch (error) {
        case InvitationValidationError.NOT_FOUND:
            return 'Invalid invitation link. Please check the URL and try again.';
        case InvitationValidationError.EXPIRED:
            return 'This invitation has expired. Please contact an administrator for a new invitation.';
        case InvitationValidationError.ALREADY_USED:
            return 'This invitation has already been used.';
        case InvitationValidationError.REVOKED:
            return 'This invitation has been revoked. Please contact an administrator.';
        default:
            return 'Invalid invitation. Please contact an administrator.';
    }
}

/**
 * Validate all form inputs for invitation redemption
 *
 * @param name - Display name
 * @param username - Username
 * @param password - Password
 * @param passwordConfirm - Password confirmation
 * @returns Validation errors (empty if all valid)
 */
function validateFormInputs(
    name: string | undefined,
    username: string | undefined,
    password: string | undefined,
    passwordConfirm: string | undefined
): Record<string, string[]> {
    const errors: Record<string, string[]> = {};

    const nameError = validateName(name);
    if (nameError !== null) {
        errors.name = [nameError];
    }

    const usernameError = validateUsername(username);
    if (usernameError !== null) {
        errors.username = [usernameError];
    }

    const passwordError = validatePassword(password);
    if (passwordError !== null) {
        errors.password = [passwordError];
    }

    const passwordConfirmError = validatePasswordConfirmation(password, passwordConfirm);
    if (passwordConfirmError !== null) {
        errors.passwordConfirm = [passwordConfirmError];
    }

    return errors;
}

/**
 * Redeem an invitation to create a new user account
 * Public action - no authentication required
 *
 * @param token - Invitation token from URL
 * @param prevState - Previous form state (unused but required by useActionState)
 * @param formData - Form data containing username and password
 * @returns Form state with success status or errors
 */
export async function redeemInvitation(
    token: string,
    _prevState: RedeemFormState,
    formData: FormData
): Promise<RedeemFormState> {
    const name = formData.get('name')?.toString();
    const username = formData.get('username')?.toString();
    const password = formData.get('password')?.toString();
    const passwordConfirm = formData.get('passwordConfirm')?.toString();

    // 1. Validate form inputs
    const errors = validateFormInputs(name, username, password, passwordConfirm);
    if (Object.keys(errors).length > 0) {
        return {
            errors,
            success: false,
            values: {
                name: name ?? undefined,
                username: username ?? undefined,
            }
        };
    }

    // 2. Validate invitation
    try {
        const db = await getDb();

        const validationResult = await validateInvitation(db, token);

        if (!validationResult.valid) {
            const errorMessage = validationResult.error !== undefined
                ? getInvitationErrorMessage(validationResult.error)
                : 'Invalid invitation. Please contact an administrator.';

            return {
                errors: {
                    invitation: [errorMessage]
                },
                success: false,
                values: {
                    name: name ?? undefined,
                    username: username ?? undefined,
                }
            };
        }

        if (validationResult.invitation === undefined) {
            return {
                errors: {
                    invitation: ['Invitation not found.']
                },
                success: false,
                values: {
                    name: name ?? undefined,
                    username: username ?? undefined,
                }
            };
        }

        const { invitation } = validationResult;

        // 3. Check username uniqueness
        const existingUser = await db.query.user.findFirst({
            where: eq(user.username, username as string)
        });

        if (existingUser !== undefined) {
            return {
                errors: {
                    username: ['Username already exists. Please choose a different username.']
                },
                success: false,
                values: {
                    name: name ?? undefined,
                    username: username ?? undefined,
                }
            };
        }

        // 4. Create user account
        // Generate Better-Auth compatible IDs
        const userId = crypto.randomUUID();
        const accountId = crypto.randomUUID();

        // Create user record with role from invitation
        await db.insert(user).values({
            id: userId,
            username: username as string,
            email: `${username}@local.hdhomey.app`, // Username plugin requires email
            emailVerified: false,
            name: name as string,
            role: invitation.role,
            isActive: true,
        });

        // Create account record with hashed password
        const hashedPassword = await generateHashPassword(password as string);
        await db.insert(account).values({
            id: accountId,
            userId,
            accountId: userId,
            providerId: 'credential',
            password: hashedPassword,
        });

        // 5. Mark invitation as used
        await db.update(invitations)
            .set({
                usedAt: new Date(),
                usedBy: userId
            })
            .where(eq(invitations.token, token));

        // 6. Return success - user will be redirected to sign-in page
        return {
            errors: {},
            success: true,
        };
    } catch (error: unknown) {
        // No redirect errors in this flow anymore
        // Return generic error

        return {
            errors: {
                form: [error instanceof Error ? error.message : 'Failed to create account. Please try again.']
            },
            success: false,
            values: {
                name: name ?? undefined,
                username: username ?? undefined,
            }
        };
    }
}
