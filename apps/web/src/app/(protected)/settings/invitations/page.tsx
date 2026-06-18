import { redirect } from 'next/navigation';
import { InvitationForm } from '@/components';
import InvitationList from '@/components/invitation-list';
import { listInvitations } from '@/lib/actions/invitations';
import { auth } from '@/lib/auth/auth';
import { AuthRoles } from '@/lib/auth-roles';

export const dynamic = 'force-dynamic';

/** Retrieves Next.js headers dynamically to avoid a static import at module scope */
async function getNextHeaders() {
    const { headers } = await import('next/headers');
    return headers();
}

/** Renders the error state when invitations cannot be loaded */
function InvitationsError({ error }: { error: string }) {
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
                    Error loading invitations: {error}
                </p>
            </div>
        </div>
    );
}

/**
 * Admin page for managing user invitations
 * Displays form to create new invitations and list of all existing invitations
 */
export default async function InvitationsPage() {
    // Verify admin access (proxy already checked authentication)
    const session = await auth.api.getSession({ headers: await getNextHeaders() });

    if (!session?.user || session.user.role !== AuthRoles.Admin) {
        redirect('/forbidden');
    }

    // Fetch all invitations
    const result = await listInvitations();

    if (!result.success) {
        return <InvitationsError error={result.error} />;
    }

    const { invitations } = result;

    return (
        <div>
            <h1>Invitations</h1>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--space-4)' }}>
                Manage user invitations to allow new people to create accounts.
            </p>

            {/* Create invitation form */}
            <div
                style={{
                    marginBottom: 'var(--space-4)',
                    maxWidth: '600px',
                }}
            >
                <InvitationForm />
            </div>

            {/* List of invitations */}
            <div>
                <h2>All Invitations</h2>
                <InvitationList invitations={invitations} />
            </div>
        </div>
    );
}
