/**
 * Types for the User Invitations feature (SPEC-010)
 */

import type { Invitation } from '@/lib/database/schema';

/**
 * Invitation status enum
 * Determines the current state of an invitation
 */
export enum InvitationStatus {
    /** Invitation is valid and can be used */
    PENDING = 'pending',
    /** Invitation has been used to create an account */
    USED = 'used',
    /** Invitation has passed its expiration date */
    EXPIRED = 'expired',
    /** Invitation has been manually revoked by an admin */
    REVOKED = 'revoked',
}

/**
 * Invitation with computed status
 * Extends the base Invitation type with a status field
 */
export interface InvitationWithStatus extends Invitation {
    status: InvitationStatus;
}

/**
 * Invitation with creator information
 * Used for displaying invitations in the admin UI
 */
export interface InvitationWithCreator extends Invitation {
    creator: {
        id: string;
        username: string | null;
        name: string;
    };
    redeemer?: {
        id: string;
        username: string | null;
        name: string;
    };
    revoker?: {
        id: string;
        username: string | null;
        name: string;
    };
    status: InvitationStatus;
}

/**
 * Result of invitation validation
 */
export interface InvitationValidationResult {
    valid: boolean;
    invitation?: Invitation;
    error?: InvitationValidationError;
}

/**
 * Invitation validation error types
 */
export enum InvitationValidationError {
    NOT_FOUND = 'not_found',
    EXPIRED = 'expired',
    ALREADY_USED = 'already_used',
    REVOKED = 'revoked',
}

/**
 * Form state for invitation creation
 */
export interface CreateInvitationFormState {
    errors: {
        role?: string[];
        note?: string[];
        general?: string[];
    };
    success?: boolean;
    invitation?: {
        id: number;
        token: string;
        url: string;
        expiresAt: Date;
    };
}

/**
 * Form state for invitation redemption
 */
export interface RedeemInvitationFormState {
    errors: {
        username?: string[];
        password?: string[];
        invitation?: string[];
        general?: string[];
    };
    success?: boolean;
}

/**
 * Invitation creation data
 */
export interface CreateInvitationData {
    role: 'admin' | 'viewer';
    note?: string;
    createdBy: string; // User ID
}

/**
 * Invitation redemption data
 */
export interface RedeemInvitationData {
    token: string;
    username: string;
    password: string;
}
