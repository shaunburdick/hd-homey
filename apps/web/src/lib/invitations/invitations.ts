/**
 * Core business logic for User Invitations (SPEC-010)
 * Handles token generation, validation, and status determination
 */

import { randomBytes } from 'node:crypto';
import { eq, desc } from 'drizzle-orm';
import { alias } from 'drizzle-orm/sqlite-core';
import {
    InvitationStatus,
    InvitationValidationError
} from './types';
import type { InvitationValidationResult, InvitationWithStatus } from './types';
import type { DB } from '@/lib/database/db';
import { invitations, user } from '@/lib/database/schema';
import type { Invitation } from '@/lib/database/schema';
import Logger from '@/lib/logger';

/** Number of random bytes to use for token generation (256-bit entropy) */
const TOKEN_BYTES = 32;

/** Number of hours in one day */
const HOURS_PER_DAY = 24;
/** Number of minutes in one hour */
const MINUTES_PER_HOUR = 60;
/** Number of seconds in one minute */
const SECONDS_PER_MINUTE = 60;
/** Number of milliseconds in one second */
const MS_PER_SECOND = 1000;
/** Number of milliseconds in one day */
const MS_PER_DAY = HOURS_PER_DAY * MINUTES_PER_HOUR * SECONDS_PER_MINUTE * MS_PER_SECOND;

/**
 * Generate a cryptographically secure invitation token
 * Uses 32 bytes (256 bits) of entropy, encoded as URL-safe base64
 *
 * @returns URL-safe base64 encoded token (~44 characters)
 * @throws Error if token generation fails after 3 retries
 */
export function generateToken(): string {
    try {
        // Generate 32 bytes (256 bits) of cryptographically secure random data
        const buffer = randomBytes(TOKEN_BYTES);

        // Convert to URL-safe base64: replace +/= with -_~ for URLs
        return buffer
            .toString('base64')
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '~');
    } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        throw new Error(`Failed to generate invitation token: ${message}`, { cause: error });
    }
}

/**
 * Generate a unique invitation token with database collision check
 * Retries up to maxRetries times if token already exists
 *
 * @param db Database connection
 * @param maxRetries Maximum number of retry attempts (default: 3)
 * @returns Unique token that doesn't exist in database
 * @throws Error if unable to generate unique token after maxRetries
 */
export async function generateUniqueToken(db: DB, maxRetries = 3): Promise<string> {
    for (let attempt = 0; attempt < maxRetries; attempt++) {
        const token = generateToken();

        // Check if token already exists (extremely unlikely with 256-bit entropy)
        const existing = db
            .select({ id: invitations.id })
            .from(invitations)
            .where(eq(invitations.token, token))
            .limit(1)
            .get();

        if (existing === undefined) {
            return token;
        }

        // Token collision detected (astronomically rare), retry
        Logger.warn(`Invitation token collision detected on attempt ${attempt + 1}, retrying...`);
    }

    throw new Error(`Failed to generate unique invitation token after ${maxRetries} attempts`);
}

/**
 * Determine the current status of an invitation
 * Priority: revoked > used > expired > pending
 *
 * @param invitation Invitation record from database
 * @returns Current status of the invitation
 */
export function getInvitationStatus(invitation: Invitation): InvitationStatus {
    const now = new Date();

    // Check in priority order
    if (invitation.revokedAt !== null) {
        return InvitationStatus.REVOKED;
    }

    if (invitation.usedAt !== null) {
        return InvitationStatus.USED;
    }

    if (invitation.expiresAt !== null && invitation.expiresAt < now) {
        return InvitationStatus.EXPIRED;
    }

    return InvitationStatus.PENDING;
}

/**
 * Add status to an invitation record
 *
 * @param invitation Invitation record from database
 * @returns Invitation with computed status field
 */
export function withStatus(invitation: Invitation): InvitationWithStatus {
    return {
        ...invitation,
        status: getInvitationStatus(invitation),
    };
}

/**
 * Validate an invitation token for redemption
 * Checks: exists, not expired, not used, not revoked
 *
 * @param db Database connection
 * @param token Invitation token to validate
 * @returns Validation result with invitation data or error
 */
export async function validateInvitation(
    db: DB,
    token: string
): Promise<InvitationValidationResult> {
    // Find invitation by token
    const invitation = db
        .select()
        .from(invitations)
        .where(eq(invitations.token, token))
        .limit(1)
        .get();

    if (invitation === undefined) {
        return {
            valid: false,
            error: InvitationValidationError.NOT_FOUND,
        };
    }

    // Check if revoked
    if (invitation.revokedAt !== null) {
        return {
            valid: false,
            invitation,
            error: InvitationValidationError.REVOKED,
        };
    }

    // Check if already used
    if (invitation.usedAt !== null) {
        return {
            valid: false,
            invitation,
            error: InvitationValidationError.ALREADY_USED,
        };
    }

    // Check if expired
    const now = new Date();
    if (invitation.expiresAt !== null && invitation.expiresAt < now) {
        return {
            valid: false,
            invitation,
            error: InvitationValidationError.EXPIRED,
        };
    }

    // All checks passed
    return {
        valid: true,
        invitation,
    };
}

/**
 * Determine if an invitation row is "unused" (pending or expired but not acted on)
 */
function isUnusedInvitation(status: InvitationStatus): boolean {
    return status === InvitationStatus.PENDING || status === InvitationStatus.EXPIRED;
}

/**
 * Sort comparator: unused invitations first, then used/revoked, newest first within each group
 */
function compareInvitationsByUsage(
    invitationA: { status: InvitationStatus },
    invitationB: { status: InvitationStatus }
): number {
    const aIsUnused = isUnusedInvitation(invitationA.status);
    const bIsUnused = isUnusedInvitation(invitationB.status);

    if (aIsUnused && !bIsUnused) {
        return -1;
    }
    if (!aIsUnused && bIsUnused) {
        return 1;
    }

    // Both are same type — maintain existing DESC order from query
    return 0;
}

/**
 * Query all invitations with joined creator and redeemer data
 */
function queryInvitationsWithJoins(db: DB) {
    const creator = alias(user, 'creator');
    const redeemer = alias(user, 'redeemer');

    return db
        .select({
            id: invitations.id,
            token: invitations.token,
            role: invitations.role,
            note: invitations.note,
            createdBy: invitations.createdBy,
            createdAt: invitations.createdAt,
            expiresAt: invitations.expiresAt,
            usedAt: invitations.usedAt,
            usedBy: invitations.usedBy,
            revokedAt: invitations.revokedAt,
            revokedBy: invitations.revokedBy,
            creatorId: creator.id,
            creatorUsername: creator.username,
            creatorName: creator.name,
            creatorDisplayUsername: creator.displayUsername,
            redeemerUsername: redeemer.username,
            redeemerName: redeemer.name,
            redeemerDisplayUsername: redeemer.displayUsername,
        })
        .from(invitations)
        .leftJoin(creator, eq(invitations.createdBy, creator.id))
        .leftJoin(redeemer, eq(invitations.usedBy, redeemer.id))
        .orderBy(desc(invitations.createdAt))
        .all();
}

/**
 * Get all invitations with creator and redeemer information
 * Used for admin UI display
 *
 * @param db Database connection
 * @returns Array of invitations with creator/redeemer details and status
 */
export async function getAllInvitationsWithCreators(db: DB) {
    const results = queryInvitationsWithJoins(db);

    const invitationsWithStatus = results.map((row) => ({
        id: row.id,
        token: row.token,
        role: row.role,
        note: row.note,
        createdBy: row.createdBy,
        createdAt: row.createdAt,
        expiresAt: row.expiresAt,
        usedAt: row.usedAt,
        usedBy: row.usedBy,
        revokedAt: row.revokedAt,
        revokedBy: row.revokedBy,
        creatorUsername: row.creatorUsername,
        creatorName: row.creatorName,
        usedByUsername: row.redeemerUsername,
        usedByName: row.redeemerName,
        creator: {
            id: row.creatorId ?? row.createdBy,
            username: row.creatorUsername,
            name: row.creatorName ?? '[Deleted Admin]',
        },
        status: getInvitationStatus(row as Invitation),
    }));

    return invitationsWithStatus.sort(compareInvitationsByUsage);
}

/**
 * Calculate expiration date for new invitation
 * Default: 30 days from now
 *
 * @param daysFromNow Number of days until expiration (default: 30)
 * @returns Expiration date
 */
export function calculateExpirationDate(daysFromNow = 30): Date {
    const now = new Date();
    return new Date(now.getTime() + daysFromNow * MS_PER_DAY);
}

/**
 * Check if an invitation can be revoked
 * Only pending invitations can be revoked (not used)
 *
 * @param invitation Invitation to check
 * @returns true if invitation can be revoked, false otherwise
 */
export function canRevokeInvitation(invitation: Invitation): boolean {
    const status = getInvitationStatus(invitation);
    return status === InvitationStatus.PENDING;
}

/**
 * Get user-friendly error message for validation error
 *
 * @param error Validation error type
 * @returns Human-readable error message
 */
export function getValidationErrorMessage(error: InvitationValidationError): string {
    switch (error) {
        case InvitationValidationError.NOT_FOUND:
            return 'This invitation link is invalid. Please check the URL and try again.';
        case InvitationValidationError.EXPIRED:
            return 'This invitation has expired. Please request a new invitation from an administrator.';
        case InvitationValidationError.ALREADY_USED:
            return 'This invitation has already been used. Each invitation can only be used once.';
        case InvitationValidationError.REVOKED:
            return 'This invitation has been revoked. Please request a new invitation from an administrator.';
        default:
            return 'This invitation is not valid. Please contact an administrator.';
    }
}
