/**
 * Server Actions for User Invitations (SPEC-010)
 * Admin operations: create and revoke invitations
 */

'use server';

import { eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { getDb } from '@/lib/database/db';
import { invitations } from '@/lib/database/schema';
import { requireAdmin } from '@/lib/auth/helpers';
import { AuthRoles } from '@/lib/auth-roles';
import {
    generateUniqueToken,
    calculateExpirationDate,
    canRevokeInvitation,
    getAllInvitationsWithCreators,
} from '@/lib/invitations/invitations';

/**
 * Form state for invitation actions
 */
export interface InvitationFormState {
    errors: Record<string, string[]>;
    success?: boolean;
    invitation?: {
        token: string;
        url: string;
    };
}

/**
 * Validate invitation creation form data
 *
 * @param role - Role from form data
 * @param note - Optional note from form data
 * @returns Array of validation errors
 */
function validateCreateInvitation(
    role: string | undefined,
    note: string | undefined
): { path: string; message: string }[] {
    const errors: { path: string; message: string }[] = [];

    if (role === undefined || (role !== AuthRoles.Admin && role !== AuthRoles.Viewer)) {
        errors.push({ path: 'role', message: 'Invalid role. Must be admin or viewer.' });
    }

    if (note !== undefined && note.length > 200) {
        errors.push({ path: 'note', message: 'Note must be 200 characters or less.' });
    }

    return errors;
}

/**
 * Convert validation errors to FormState format
 *
 * @param errors - Array of validation errors
 * @returns FormState with errors
 */
function errorsToFormState(errors: { path: string; message: string }[]): InvitationFormState {
    const errorRecord: Record<string, string[]> = {};
    for (const error of errors) {
        errorRecord[error.path] ??= [];
        errorRecord[error.path].push(error.message);
    }
    return { errors: errorRecord, success: false };
}

/**
 * Create a new invitation
 * Admin only
 *
 * @param prevState - Previous form state (unused but required by useActionState)
 * @param formData - Form data containing role and optional note
 * @returns Form state with success status and invitation URL
 */
export async function createInvitation(
    _prevState: InvitationFormState,
    formData: FormData
): Promise<InvitationFormState> {
    // 1. Verify admin session
    try {
        await requireAdmin();
    } catch (error) {
        return {
            errors: {
                authorization: [error instanceof Error ? error.message : 'Unauthorized']
            },
            success: false
        };
    }

    // 2. Extract and validate form data
    const role = formData.get('role')?.toString();
    const note = formData.get('note')?.toString();

    const validationErrors = validateCreateInvitation(role, note);
    if (validationErrors.length > 0) {
        return errorsToFormState(validationErrors);
    }

    // 3. Generate secure token and create invitation
    try {
        const db = await getDb();
        const session = await requireAdmin(); // Get session again for user ID

        // Generate unique token
        const token = await generateUniqueToken(db);

        // Calculate expiration (30 days from now)
        const expiresAt = calculateExpirationDate();

        // Insert invitation
        const [invitation] = await db.insert(invitations).values({
            token,
            role: role as AuthRoles,
            note: note !== undefined && note.length > 0 ? note : null,
            createdBy: session.user.id,
            createdAt: new Date(),
            expiresAt,
        }).returning();

        // 4. Build full invitation URL
        const baseUrl = process.env.BETTER_AUTH_URL ?? process.env.NEXTAUTH_URL ?? 'http://localhost:3000';
        const invitationUrl = `${baseUrl}/invite/${token}`;

        // 5. Revalidate the invitations page
        revalidatePath('/settings/invitations');

        return {
            errors: {},
            success: true,
            invitation: {
                token: invitation.token,
                url: invitationUrl
            }
        };
    } catch (error) {
        return {
            errors: {
                form: [error instanceof Error ? error.message : 'Failed to create invitation']
            },
            success: false
        };
    }
}

/**
 * Revoke an unused invitation
 * Admin only
 *
 * @param invitationId - ID of the invitation to revoke
 * @returns Success status with optional error message
 */
export async function revokeInvitation(
    invitationId: number
): Promise<{ success: boolean; error?: string }> {
    // 1. Verify admin session
    let adminUserId: string;
    try {
        const session = await requireAdmin();
        adminUserId = session.user.id;
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unauthorized'
        };
    }

    // 2. Check invitation exists and can be revoked
    try {
        const db = await getDb();

        const invitation = await db.query.invitations.findFirst({
            where: eq(invitations.id, invitationId)
        });

        if (invitation === undefined) {
            return {
                success: false,
                error: 'Invitation not found'
            };
        }

        // Verify invitation can be revoked (only PENDING invitations)
        if (!canRevokeInvitation(invitation)) {
            return {
                success: false,
                error: 'Invitation cannot be revoked. It may already be used, expired, or revoked.'
            };
        }

        // 3. Update invitation with revoked timestamp
        await db.update(invitations)
            .set({
                revokedAt: new Date(),
                revokedBy: adminUserId
            })
            .where(eq(invitations.id, invitationId));

        // 4. Revalidate the invitations page
        revalidatePath('/settings/invitations');

        return { success: true };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to revoke invitation'
        };
    }
}

/**
 * List all invitations with creator information
 * Admin only
 *
 * @returns Array of invitations with status and creator info, or error
 */
export async function listInvitations(): Promise<
    { success: true; invitations: Awaited<ReturnType<typeof getAllInvitationsWithCreators>> } |
    { success: false; error: string }
> {
    // 1. Verify admin session
    try {
        await requireAdmin();
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Unauthorized'
        };
    }

    // 2. Fetch all invitations with creator info
    try {
        const db = await getDb();
        const invitationsList = await getAllInvitationsWithCreators(db);

        return {
            success: true,
            invitations: invitationsList
        };
    } catch (error) {
        return {
            success: false,
            error: error instanceof Error ? error.message : 'Failed to fetch invitations'
        };
    }
}
