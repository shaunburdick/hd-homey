/**
 * Server Actions for Invitation Redemption (SPEC-010)
 * Public operations: redeem invitation and create user account
 */

'use server';

import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getDb } from '@/lib/database/db';
import { user, account, invitations } from '@/lib/database/schema';
import type { Invitation } from '@/lib/database/schema';
import { generateHashPassword } from '@/lib/user';
import { validateInvitation } from '@/lib/invitations/invitations';
import { InvitationValidationError } from '@/lib/invitations/types';

/** Maximum character length for display names */
const MAX_NAME_LENGTH = 100;

/** Minimum character length for display names */
const MIN_NAME_LENGTH = 2;

/** Maximum character length for usernames */
const MAX_USERNAME_LENGTH = 50;

/** Minimum character length for usernames */
const MIN_USERNAME_LENGTH = 3;

/** Minimum character length for passwords */
const MIN_PASSWORD_LENGTH = 8;

/** Maximum character length for passwords */
const MAX_PASSWORD_LENGTH = 100;

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
 */
function validateName(name: string | undefined): string | null {
    if (name === undefined || name.length === 0) {
        return 'Display name is required';
    }

    if (name.length < MIN_NAME_LENGTH) {
        return 'Display name must be at least 2 characters';
    }

    if (name.length > MAX_NAME_LENGTH) {
        return 'Display name must be 100 characters or less';
    }

    return null;
}

/**
 * Validate username format and length
 */
function validateUsername(username: string | undefined): string | null {
    if (username === undefined || username.length === 0) {
        return 'Username is required';
    }

    if (username.length < MIN_USERNAME_LENGTH) {
        return 'Username must be at least 3 characters';
    }

    if (username.length > MAX_USERNAME_LENGTH) {
        return 'Username must be 50 characters or less';
    }

    if (!/^[a-zA-Z0-9_-]+$/.test(username)) {
        return 'Username can only contain letters, numbers, underscores, and hyphens';
    }

    return null;
}

/**
 * Validate password strength
 */
function validatePassword(password: string | undefined): string | null {
    if (password === undefined || password.length === 0) {
        return 'Password is required';
    }

    if (password.length < MIN_PASSWORD_LENGTH) {
        return 'Password must be at least 8 characters';
    }

    if (password.length > MAX_PASSWORD_LENGTH) {
        return 'Password must be 100 characters or less';
    }

    return null;
}

/** Shared error message for password mismatch */
const PASSWORD_MISMATCH_ERROR = 'Passwords do not match';

/**
 * Validate password confirmation matches the original password.
 * Uses constant-time comparison to prevent timing attacks.
 */
function validatePasswordConfirmation(
    password: string | undefined,
    passwordConfirm: string | undefined
): string | null {
    if (passwordConfirm === undefined || passwordConfirm.length === 0) {
        return 'Password confirmation is required';
    }

    if (password === undefined || password.length === 0) {
        return 'Password confirmation is required';
    }

    if (password.length !== passwordConfirm.length) {
        return PASSWORD_MISMATCH_ERROR;
    }

    if (
        crypto.timingSafeEqual(Buffer.from(password), Buffer.from(passwordConfirm)) === false
    ) {
        return PASSWORD_MISMATCH_ERROR;
    }

    return null;
}

interface FormInputs {
    name: string | undefined;
    username: string | undefined;
    password: string | undefined;
    passwordConfirm: string | undefined;
}

/**
 * Validate all form inputs for invitation redemption.
 * Returns validation errors keyed by field name (empty if all valid).
 */
function validateFormInputs({ name, username, password, passwordConfirm }: FormInputs): Record<string, string[]> {
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

interface InvitationErrorMessages {
    [InvitationValidationError.NOT_FOUND]: string;
    [InvitationValidationError.EXPIRED]: string;
    [InvitationValidationError.ALREADY_USED]: string;
    [InvitationValidationError.REVOKED]: string;
}

/**
 * Get user-friendly error message for invitation validation errors.
 */
function getInvitationErrorMessage(error: InvitationValidationError): string {
    const messages: InvitationErrorMessages = {
        [InvitationValidationError.NOT_FOUND]: 'Invalid invitation link. Please check the URL and try again.',
        [InvitationValidationError.EXPIRED]:
            'This invitation has expired. Please contact an administrator for a new invitation.',
        [InvitationValidationError.ALREADY_USED]: 'This invitation has already been used.',
        [InvitationValidationError.REVOKED]: 'This invitation has been revoked. Please contact an administrator.',
    };
    return messages[error] ?? 'Invalid invitation. Please contact an administrator.';
}

interface UserCreationParams {
    name: string;
    username: string;
    password: string;
    invitationToken: string;
    invitationRole: string;
}

/**
 * Create a new user account and mark the invitation as used.
 */
async function createUserAccount({
    name,
    username,
    password,
    invitationToken,
    invitationRole,
}: UserCreationParams): Promise<void> {
    const db = await getDb();
    const userId = crypto.randomUUID();
    const accountId = crypto.randomUUID();
    const normalizedUsername = username.toLowerCase();

    await db.insert(user).values({
        id: userId,
        username: normalizedUsername,
        displayUsername: username,
        email: `${normalizedUsername}@local.hdhomey.app`,
        emailVerified: false,
        name,
        role: invitationRole,
        isActive: true,
    });

    const hashedPassword = await generateHashPassword(password);
    await db.insert(account).values({
        id: accountId,
        userId,
        accountId: userId,
        providerId: 'credential',
        password: hashedPassword,
    });

    await db.update(invitations)
        .set({ usedAt: new Date(), usedBy: userId })
        .where(eq(invitations.token, invitationToken));
}

interface ValidationContext {
    name: string | undefined;
    username: string | undefined;
}

/**
 * Build a failed form state with the given errors and preserve form values.
 */
function buildErrorState(
    errors: Record<string, string[]>,
    { name, username }: ValidationContext
): RedeemFormState {
    return {
        errors,
        success: false,
        values: {
            name: name ?? undefined,
            username: username ?? undefined,
        }
    };
}

interface ValidateInvitationOptions {
    token: string;
    username: string;
    context: ValidationContext;
}

type InvitationCheckResult =
    | { invitation: Invitation; errorState?: never }
    | { invitation?: never; errorState: RedeemFormState };

/**
 * Validate the invitation token and check username uniqueness.
 * Returns an error state or the valid invitation.
 */
async function validateInvitationAndUsername(
    { token, username, context }: ValidateInvitationOptions
): Promise<InvitationCheckResult> {
    const db = await getDb();
    const validationResult = await validateInvitation(db, token);

    if (!validationResult.valid) {
        const errorMessage = validationResult.error !== undefined
            ? getInvitationErrorMessage(validationResult.error)
            : 'Invalid invitation. Please contact an administrator.';
        return { errorState: buildErrorState({ invitation: [errorMessage] }, context) };
    }

    if (validationResult.invitation === undefined) {
        return { errorState: buildErrorState({ invitation: ['Invitation not found.'] }, context) };
    }

    const normalizedUsername = username.toLowerCase();
    const existingUser = await db.query.user.findFirst({
        where: eq(user.username, normalizedUsername)
    });

    if (existingUser !== undefined) {
        return {
            errorState: buildErrorState(
                { username: ['Username already exists. Please choose a different username.'] },
                context
            )
        };
    }

    return { invitation: validationResult.invitation };
}

/**
 * Redeem an invitation to create a new user account.
 * Public action - no authentication required.
 *
 * @param token - Invitation token from URL
 * @param formData - Form data containing name, username, password, and passwordConfirm
 * @returns Form state with success status or errors
 */
export async function redeemInvitation(
    token: string,
    formData: FormData
): Promise<RedeemFormState> {
    const name = formData.get('name')?.toString();
    const username = formData.get('username')?.toString();
    const password = formData.get('password')?.toString();
    const passwordConfirm = formData.get('passwordConfirm')?.toString();
    const context: ValidationContext = { name, username };

    const errors = validateFormInputs({ name, username, password, passwordConfirm });
    if (Object.keys(errors).length > 0) {
        return buildErrorState(errors, context);
    }

    try {
        const result = await validateInvitationAndUsername(
            { token, username: username as string, context }
        );

        if (result.errorState !== undefined) {
            return result.errorState;
        }

        await createUserAccount({
            name: name as string,
            username: username as string,
            password: password as string,
            invitationToken: token,
            invitationRole: result.invitation.role,
        });

        return { errors: {}, success: true };
    } catch (error: unknown) {
        return buildErrorState(
            {
                form: [error instanceof Error ? error.message : 'Failed to create account. Please try again.']
            },
            context
        );
    }
}
