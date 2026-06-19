'use server';

import crypto from 'node:crypto';
import { redirect } from 'next/navigation';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { revalidatePath } from 'next/cache';
import { eq } from 'drizzle-orm';
import type { DB } from '@/lib/database/db';
import { getDb } from '@/lib/database/db';
import { user, account } from '@/lib/database/schema';
import { requireAdmin } from '@/lib/auth/helpers';
import { generateHashPassword } from '@/lib/user';
import { AuthRoles } from '@/lib/auth-roles';
import type { ValidationError } from '@/lib/errors';

/** Minimum length for usernames and names */
const MIN_NAME_LENGTH = 3;
/** Minimum length for passwords */
const MIN_PASSWORD_LENGTH = 8;

/**
 * Update user password in account table
 */
async function updateUserPassword({
    db,
    userId,
    password,
}: {
    db: DB;
    userId: string;
    password: string;
}): Promise<void> {
    const hashedPassword = await generateHashPassword(password);

    // Find account for this user
    const userAccount = db.select()
        .from(account)
        .where(eq(account.userId, userId))
        .limit(1)
        .get();

    if (userAccount === undefined) {
        throw new Error('User account not found - cannot update password');
    }

    await db.update(account)
        .set({
            password: hashedPassword,
            updatedAt: new Date()
        })
        .where(eq(account.id, userAccount.id));
}

/**
 * Validate basic string fields (username, name, password)
 */
function validateStringFields(
    fields: { username?: string; name?: string; password?: string }
): ValidationError[] {
    const errors: ValidationError[] = [];

    if ((fields.username?.length ?? 0) < MIN_NAME_LENGTH) {
        errors.push({ path: 'username', message: `Username must be at least ${MIN_NAME_LENGTH} characters` });
    }

    if ((fields.name?.length ?? 0) < MIN_NAME_LENGTH) {
        errors.push({ path: 'name', message: `Name must be at least ${MIN_NAME_LENGTH} characters` });
    }

    if ((fields.password?.length ?? 0) < MIN_PASSWORD_LENGTH) {
        errors.push({ path: 'password', message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    return errors;
}

/**
 * Validate the role field for user creation
 */
function validateRoleField(role: string | undefined): ValidationError[] {
    if (role === undefined || (role !== AuthRoles.Admin && role !== AuthRoles.Viewer)) {
        return [{ path: 'role', message: 'Invalid role' }];
    }
    return [];
}

/**
 * Validate create user form data
 */
function validateCreateUser({
    username,
    name,
    password,
    role,
}: {
    username?: string;
    name?: string;
    password?: string;
    role?: string;
}): ValidationError[] {
    return [
        ...validateStringFields({ username, name, password }),
        ...validateRoleField(role),
    ];
}

/**
 * Validate update user form data
 */
function validateUpdateUser(
    name: string | undefined,
    password: string | undefined
): ValidationError[] {
    const errors: ValidationError[] = [];

    if ((name?.length ?? 0) < MIN_NAME_LENGTH) {
        errors.push({ path: 'name', message: `Name must be at least ${MIN_NAME_LENGTH} characters` });
    }

    if (password !== undefined && password.length > 0 && password.length < MIN_PASSWORD_LENGTH) {
        errors.push({ path: 'password', message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters` });
    }

    return errors;
}

/**
 * Create new user and account records in the database
 * Returns 'USERNAME_EXISTS' sentinel if the username is already taken
 */
async function insertNewUser({
    db,
    username,
    name,
    password,
    role,
}: {
    db: DB;
    username: string;
    name: string;
    password: string;
    role: string;
}): Promise<string> {
    const normalizedUsername = username.toLowerCase();
    const existingUser = await db.query.user.findFirst({
        where: eq(user.username, normalizedUsername)
    });

    if (existingUser !== undefined) {
        return 'USERNAME_EXISTS';
    }

    const userId = crypto.randomUUID();
    const accountId = crypto.randomUUID();

    // Note: Better-Auth username plugin normalizes usernames to lowercase
    await db.insert(user).values({
        id: userId,
        username: normalizedUsername,
        displayUsername: username, // Preserve original case
        email: `${normalizedUsername}@local.hdhomey.app`,
        emailVerified: false,
        name,
        role: role as AuthRoles,
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

    return userId;
}

/**
 * Apply user updates to the database
 */
async function applyUserUpdate({
    db,
    userId,
    name,
    isActive,
    password,
}: {
    db: DB;
    userId: string;
    name: string | undefined;
    isActive: boolean;
    password: string | undefined;
}): Promise<void> {
    await db.update(user)
        .set({ name, isActive, updatedAt: new Date() })
        .where(eq(user.id, userId));

    const trimmedPassword = password?.trim();
    if (trimmedPassword !== undefined && trimmedPassword.length > 0) {
        await updateUserPassword({ db, userId, password: trimmedPassword });
    }
}

/**
 * Re-throw redirect errors and wrap other errors as validation errors
 */
function handleActionError(error: unknown, actionLabel: string): ValidationError[] {
    if (error !== null && error !== undefined && isRedirectError(error)) {
        throw error;
    }
    return [{ path: 'form', message: error instanceof Error ? error.message : `Failed to ${actionLabel}` }];
}

/**
 * Verify admin authorization; return authorization error if unauthorized
 */
async function checkAdmin(): Promise<ValidationError[] | null> {
    try {
        await requireAdmin();
        return null;
    } catch (error) {
        return [{ path: 'authorization', message: error instanceof Error ? error.message : 'Unauthorized' }];
    }
}

/**
 * Create a new user via Better-Auth API
 */
export async function createUser(prevState: unknown, formData: FormData) {
    void prevState;
    const authError = await checkAdmin();
    if (authError !== null) {
        return authError;
    }

    const username = formData.get('username')?.toString();
    const name = formData.get('name')?.toString();
    const password = formData.get('password')?.toString();
    const role = formData.get('role')?.toString();

    const errors = validateCreateUser({ username, name, password, role });
    if (errors.length > 0) {
        return errors;
    }

    try {
        const db = await getDb();
        const userId = await insertNewUser({
            db,
            username: username as string,
            name: name as string,
            password: password as string,
            role: role as string,
        });

        if (userId === 'USERNAME_EXISTS') {
            return [{ path: 'username', message: 'Username already exists' }];
        }

        revalidatePath('/users');
        redirect(`/users/${userId}`);
    } catch (error) {
        return handleActionError(error, 'create user');
    }
}

/**
 * Update an existing user
 * Note: Better-Auth doesn't have a direct API for admin updates,
 * so we update the database directly
 */
export async function updateUser(prevState: unknown, formData: FormData) {
    void prevState;
    const authError = await checkAdmin();
    if (authError !== null) {
        return authError;
    }

    const userId = formData.get('id')?.toString();
    const name = formData.get('name')?.toString();
    const password = formData.get('password')?.toString();

    if (userId === undefined || userId === '') {
        return [{ path: 'id', message: 'Invalid user ID' }];
    }

    const isActive = formData.get('is_active') === 'true';
    const errors = validateUpdateUser(name, password);
    if (errors.length > 0) {
        return errors;
    }

    try {
        const db = await getDb();
        await applyUserUpdate({ db, userId, name, isActive, password });

        revalidatePath('/users');
        revalidatePath(`/users/${userId}`);
        redirect(`/users/${userId}`);
    } catch (error) {
        return handleActionError(error, 'update user');
    }
}

/**
 * Soft delete a user (marks as inactive and sets deletedAt timestamp)
 *
 * Note: This performs a soft delete by setting isActive=false and deletedAt timestamp.
 * The user record and associated account remain in the database but the user cannot sign in.
 * This preserves referential integrity and audit trails.
 *
 * @param prevState - Previous form state (unused)
 * @param formData - Form data containing user ID
 * @returns Validation errors or redirects to users list
 */
export async function deleteUser(prevState: unknown, formData: FormData) {
    void prevState;
    const authError = await checkAdmin();
    if (authError !== null) {
        return authError;
    }

    const userId = formData.get('id')?.toString();
    if (userId === undefined || userId === '') {
        return [{ path: 'id', message: 'Invalid user ID' }];
    }

    try {
        const db = await getDb();

        await db.update(user)
            .set({ isActive: false, deletedAt: new Date(), updatedAt: new Date() })
            .where(eq(user.id, userId));

        revalidatePath('/users');
        redirect('/users');
    } catch (error) {
        return handleActionError(error, 'delete user');
    }
}
