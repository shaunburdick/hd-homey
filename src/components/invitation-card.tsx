'use client';

import { Button } from '@/components';
import type { Invitation } from '@/lib/database/schema';

// Extended invitation type with username fields for display
interface InvitationDisplay extends Invitation {
    creatorUsername?: string | null;
    usedByUsername?: string | null;
}

interface InvitationCardProps {
    invitation: InvitationDisplay;
    onRevoke: (id: number) => Promise<void>;
}

export default function InvitationCard({ invitation, onRevoke }: InvitationCardProps) {
    const isExpired = new Date(invitation.expiresAt) < new Date();
    const isUsed = invitation.usedAt !== null;
    const isRevoked = invitation.revokedAt !== null;

    // Status badge color and text
    const getStatusDisplay = () => {
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
    };

    const status = getStatusDisplay();
    const canRevoke = !isUsed && !isRevoked && !isExpired;

    const handleRevoke = async () => {
        // TODO: Replace with proper modal confirmation (see SPEC-004 UI guidelines)
        // For now, using browser confirm as interim solution
        // eslint-disable-next-line no-alert
        if (window.confirm('Are you sure you want to revoke this invitation?')) {
            await onRevoke(invitation.id);
        }
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
            <div
                style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: 'var(--space-3)',
                }}
            >
                <div style={{ flex: 1 }}>
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
                            {invitation.role}
                        </span>
                    </div>
                    {invitation.note && (
                        <p
                            style={{
                                margin: 0,
                                color: 'var(--color-text-primary)',
                                fontWeight: 500,
                            }}
                        >
                            {invitation.note}
                        </p>
                    )}
                </div>
                {canRevoke && (
                    <Button
                        type="button"
                        onClick={handleRevoke}
                        variant="secondary"
                        style={{ fontSize: '0.875rem' }}
                    >
                        Revoke
                    </Button>
                )}
            </div>

            <div
                style={{
                    fontSize: '0.875rem',
                    color: 'var(--color-text-secondary)',
                }}
            >
                <div style={{ marginBottom: 'var(--space-1)' }}>
                    <strong>Created:</strong>{' '}
                    {new Date(invitation.createdAt).toLocaleString()}
                    {invitation.creatorUsername && ` by ${invitation.creatorUsername}`}
                </div>
                <div style={{ marginBottom: 'var(--space-1)' }}>
                    <strong>Expires:</strong>{' '}
                    {new Date(invitation.expiresAt).toLocaleString()}
                </div>
                {isUsed && invitation.usedAt && (
                    <div style={{ marginBottom: 'var(--space-1)' }}>
                        <strong>Used:</strong>{' '}
                        {new Date(invitation.usedAt).toLocaleString()}
                        {invitation.usedByUsername && ` by ${invitation.usedByUsername}`}
                    </div>
                )}
                {isRevoked && invitation.revokedAt && (
                    <div style={{ marginBottom: 'var(--space-1)' }}>
                        <strong>Revoked:</strong>{' '}
                        {new Date(invitation.revokedAt).toLocaleString()}
                    </div>
                )}
            </div>
        </div>
    );
}
