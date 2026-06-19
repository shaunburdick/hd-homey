'use client';

import { useMemo } from 'react';
import { Button } from '@/components';
import type { Invitation } from '@/lib/database/schema';

/** Extended invitation type with username and display name fields for display. */
interface InvitationDisplay extends Invitation {
    creatorUsername?: string | null;
    creatorName?: string | null;
    usedByUsername?: string | null;
    usedByName?: string | null;
}

interface InvitationCardProps {
    invitation: InvitationDisplay;
    onRevoke: (id: number) => Promise<void>;
}

interface StatusDisplay {
    color: string;
    text: string;
}

/**
 * Derives the badge color and text for the invitation based on its current state.
 * Priority: Revoked > Used > Expired > Pending.
 */
function getStatusDisplay({
    isRevoked,
    isUsed,
    isExpired,
}: {
    isRevoked: boolean;
    isUsed: boolean;
    isExpired: boolean;
}): StatusDisplay {
    if (isRevoked) {
        return { color: 'var(--color-error)', text: 'Revoked' };
    }
    if (isUsed) {
        return { color: 'var(--color-success)', text: 'Used' };
    }
    if (isExpired) {
        return { color: 'var(--color-warning)', text: 'Expired' };
    }
    return { color: 'var(--color-info)', text: 'Pending' };
}

/** Status + role badge row displayed at the top of the card. */
function InvitationBadges({
    status,
    role,
}: {
    status: StatusDisplay;
    role: string;
}) {
    return (
        <div
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-2)',
                marginBottom: 'var(--space-2)',
            }}
        >
            <span
                style={{
                    display: 'inline-block',
                    padding: 'var(--space-1) var(--space-2)',
                    backgroundColor: status.color,
                    color: 'white',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                }}
            >
                {status.text}
            </span>
            <span
                style={{
                    display: 'inline-block',
                    padding: 'var(--space-1) var(--space-2)',
                    backgroundColor: 'var(--color-bg-tertiary)',
                    color: 'var(--color-text-primary)',
                    borderRadius: 'var(--radius-sm)',
                    fontSize: '0.875rem',
                    fontWeight: 500,
                    textTransform: 'capitalize',
                }}
            >
                {role}
            </span>
        </div>
    );
}

/** Metadata rows (created, expires, used, revoked timestamps). */
function InvitationMetadata({ invitation, isUsed, isRevoked }: {
    invitation: InvitationDisplay;
    isUsed: boolean;
    isRevoked: boolean;
}) {
    return (
        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
            <div style={{ marginBottom: 'var(--space-1)' }}>
                <strong>Created:</strong>{' '}
                {new Date(invitation.createdAt).toLocaleString()}
                {invitation.creatorName && ` by ${invitation.creatorName}`}
                {invitation.creatorUsername && ` (${invitation.creatorUsername})`}
            </div>
            <div style={{ marginBottom: 'var(--space-1)' }}>
                <strong>Expires:</strong>{' '}
                {new Date(invitation.expiresAt).toLocaleString()}
            </div>
            {isUsed && invitation.usedAt && (
                <div style={{ marginBottom: 'var(--space-1)' }}>
                    <strong>Used:</strong>{' '}
                    {new Date(invitation.usedAt).toLocaleString()}
                    {invitation.usedByName && ` by ${invitation.usedByName}`}
                    {invitation.usedByUsername && ` (${invitation.usedByUsername})`}
                </div>
            )}
            {isRevoked && invitation.revokedAt && (
                <div style={{ marginBottom: 'var(--space-1)' }}>
                    <strong>Revoked:</strong>{' '}
                    {new Date(invitation.revokedAt).toLocaleString()}
                </div>
            )}
        </div>
    );
}

/** Header row: status/role badges, optional note, and the optional Revoke button. */
function InvitationHeader({
    invitation,
    status,
    canRevoke,
    onRevoke,
}: {
    invitation: InvitationDisplay;
    status: StatusDisplay;
    canRevoke: boolean;
    onRevoke: () => Promise<void>;
}) {
    return (
        <div
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: 'var(--space-3)',
            }}
        >
            <div style={{ flex: 1 }}>
                <InvitationBadges status={status} role={invitation.role} />
                {invitation.note && (
                    <p style={{ margin: 0, color: 'var(--color-text-primary)', fontWeight: 500 }}>
                        {invitation.note}
                    </p>
                )}
            </div>
            {canRevoke && (
                <Button
                    type="button"
                    onClick={onRevoke}
                    variant="secondary"
                    style={{ fontSize: '0.875rem' }}
                >
                    Revoke
                </Button>
            )}
        </div>
    );
}

export default function InvitationCard({ invitation, onRevoke }: InvitationCardProps) {
    // Derive expiry state in useMemo so the Date comparison runs only when expiresAt changes
    const isExpired = useMemo(
        () => new Date(invitation.expiresAt) < new Date(),
        [invitation.expiresAt]
    );
    const isUsed = invitation.usedAt !== null;
    const isRevoked = invitation.revokedAt !== null;

    const status = getStatusDisplay({ isRevoked, isUsed, isExpired });
    const canRevoke = !isUsed && !isRevoked && !isExpired;

    const handleRevoke = async () => {
        await onRevoke(invitation.id);
    };

    return (
        <div
            style={{
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)',
                marginBottom: 'var(--space-3)',
                backgroundColor: 'var(--color-bg-secondary)',
            }}
        >
            <InvitationHeader
                invitation={invitation}
                status={status}
                canRevoke={canRevoke}
                onRevoke={handleRevoke}
            />
            <InvitationMetadata invitation={invitation} isUsed={isUsed} isRevoked={isRevoked} />
        </div>
    );
}
