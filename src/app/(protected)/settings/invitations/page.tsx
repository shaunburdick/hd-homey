import { redirect } from 'next/navigation';
import { InvitationForm } from '@/components';
import InvitationList from '@/components/invitation-list';
import { listInvitations } from '@/lib/actions/invitations';
import { auth } from '@/lib/auth/auth';

export const dynamic = 'force-dynamic';

/**
 * Admin page for managing user invitations
 * Displays form to create new invitations and list of all existing invitations
 */
export default async function InvitationsPage() {
    // Verify admin access (proxy already checked authentication)
    const session = await auth.api.getSession({ headers: await import('next/headers').then(m => m.headers()) });

    if (!session?.user?.isAdmin) {
        redirect('/forbidden');
    }

    // Fetch all invitations
    const result = await listInvitations();

    if (!result.success) {
        return (
            <div>
                <h1>Invitations</h1>
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
                        Error loading invitations: {result.error}
                    </p>
                </div>
            </div>
        );
    }

    const { invitations } = result;

    return (
        <div>
            <h1>Invitations</h1>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                Manage user invitations to allow new people to create accounts.
            </p>

            <div
                style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 2fr',
                    gap: 'var(--space-4)',
                    marginBottom: 'var(--space-4)',
                }}
            >
                {/* Create invitation form */}
                <div>
                    <InvitationForm />
                </div>

                {/* List of invitations */}
                <div>
                    <h2>All Invitations</h2>
                    <InvitationList invitations={invitations} />
                </div>
            </div>
        </div>
    );
}
