import Link from 'next/link';
import RedemptionForm from './redemption-form';
import { getDb } from '@/lib/database/db';
import { validateInvitation } from '@/lib/invitations/invitations';

export const dynamic = 'force-dynamic';

interface InvitePageProps {
    params: Promise<{
        token: string;
    }>;
}

/**
 * Public page for redeeming user invitations
 * Validates the invitation token and displays a signup form
 */
export default async function InvitePage({ params }: InvitePageProps) {
    const { token } = await params;

    // Validate the invitation token
    const db = await getDb();
    const validation = await validateInvitation(db, token);

    // If invalid, show error state
    if (!validation.valid || !validation.invitation) {
        return (
            <div
                style={{
                    maxWidth: '600px',
                    margin: '0 auto',
                    padding: 'var(--space-4)',
                }}
            >
                <h1>Invalid Invitation</h1>
                <div
                    style={{
                        padding: 'var(--space-4)',
                        backgroundColor: 'var(--color-error-bg)',
                        border: '1px solid var(--color-error)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-4)',
                    }}
                >
                    <p style={{ margin: 0, color: 'var(--color-error)' }}>
                        {validation.error === 'not_found' &&
                            'This invitation link is invalid or does not exist.'}
                        {validation.error === 'expired' &&
                            'This invitation has expired. Please contact an administrator for a new invitation.'}
                        {validation.error === 'already_used' &&
                            'This invitation has already been used.'}
                        {validation.error === 'revoked' &&
                            'This invitation has been revoked by an administrator.'}
                    </p>
                </div>
                <Link href="/" style={{ color: 'var(--color-primary)' }}>
                    Return to Home
                </Link>
            </div>
        );
    }

    const { invitation } = validation;

    return (
        <div
            style={{
                maxWidth: '600px',
                margin: '0 auto',
                padding: 'var(--space-4)',
            }}
        >
            <h1>Create Your Account</h1>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                You&apos;ve been invited to join HD Homey!
            </p>

            {/* Invitation details */}
            <div
                style={{
                    padding: 'var(--space-4)',
                    backgroundColor: 'var(--color-bg-secondary)',
                    border: '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-md)',
                    marginBottom: 'var(--space-4)',
                }}
            >
                <h2 style={{ marginTop: 0, fontSize: '1.25rem' }}>Invitation Details</h2>
                <div style={{ fontSize: '0.875rem' }}>
                    <p style={{ marginBottom: 'var(--space-2)' }}>
                        <strong>Role:</strong>{' '}
                        <span
                            style={{
                                display: 'inline-block',
                                padding: 'var(--space-1) var(--space-2)',
                                backgroundColor: 'var(--color-bg-tertiary)',
                                borderRadius: 'var(--radius-sm)',
                                textTransform: 'capitalize',
                                marginLeft: 'var(--space-2)',
                            }}
                        >
                            {invitation.role}
                        </span>
                    </p>
                    {invitation.note && (
                        <p style={{ marginBottom: 'var(--space-2)' }}>
                            <strong>Note:</strong> {invitation.note}
                        </p>
                    )}
                    <p style={{ marginBottom: 0, color: 'var(--color-text-secondary)' }}>
                        <strong>Expires:</strong> {new Date(invitation.expiresAt).toLocaleDateString()}
                    </p>
                </div>
            </div>

            {/* Signup form */}
            <RedemptionForm token={token} />
        </div>
    );
}
