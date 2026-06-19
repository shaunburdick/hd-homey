import Link from 'next/link';
import RedemptionForm from './redemption-form';
import { getDb } from '@/lib/database/db';
import { validateInvitation } from '@/lib/invitations/invitations';
import type { Invitation } from '@/lib/database/schema';

export const dynamic = 'force-dynamic';

interface InvitePageProps {
    params: Promise<{
        token: string;
    }>;
}

/**
 * Render the error state when an invitation is invalid.
 */
function InvalidInvitationView({ error }: { error: string | undefined }) {
    const errorMessages: Record<string, string> = {
        not_found: 'This invitation link is invalid or does not exist.',
        expired: 'This invitation has expired. Please contact an administrator for a new invitation.',
        already_used: 'This invitation has already been used.',
        revoked: 'This invitation has been revoked by an administrator.',
    };

    const message = error !== undefined ? (errorMessages[error] ?? '') : '';

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: 'var(--space-4)' }}>
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
                <p style={{ margin: 0, color: 'var(--color-error)' }}>{message}</p>
            </div>
            <Link href="/" style={{ color: 'var(--color-accent)' }}>
                Return to Home
            </Link>
        </div>
    );
}

/**
 * Render the invitation details summary card.
 */
function InvitationDetailsCard({ invitation }: { invitation: Invitation }) {
    return (
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
    );
}

/**
 * Public page for redeeming user invitations.
 * Validates the invitation token and displays a signup form.
 */
export default async function InvitePage({ params }: InvitePageProps) {
    const { token } = await params;

    const db = await getDb();
    const validation = await validateInvitation(db, token);

    if (!validation.valid || !validation.invitation) {
        return <InvalidInvitationView error={validation.error} />;
    }

    const { invitation } = validation;

    return (
        <div style={{ maxWidth: '600px', margin: '0 auto', padding: 'var(--space-4)' }}>
            <h1>Create Your Account</h1>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                You&apos;ve been invited to join HD Homey!
            </p>
            <InvitationDetailsCard invitation={invitation} />
            <RedemptionForm token={token} />
        </div>
    );
}
