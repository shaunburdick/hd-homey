'use client';

import { InvitationCard } from '@/components';
import { revokeInvitation } from '@/lib/actions/invitations';
import type { Invitation } from '@/lib/database/schema';

interface InvitationDisplay extends Invitation {
    creatorUsername?: string | null;
    creatorName?: string | null;
    usedByUsername?: string | null;
    usedByName?: string | null;
}

interface InvitationListProps {
    invitations: InvitationDisplay[];
}

/**
 * Revokes an invitation by ID and reloads the page to reflect the updated list.
 * Extracted to module scope to satisfy consistent-function-scoping.
 */
async function handleRevoke(invitationId: number): Promise<void> {
    await revokeInvitation(invitationId);
    // Trigger page refresh to show updated invitation list
    window.location.reload();
}

export default function InvitationList({ invitations }: InvitationListProps) {
    if (invitations.length === 0) {
        return (
            <p style={{ color: 'var(--color-text-secondary)' }}>
                No invitations yet. Create one to get started.
            </p>
        );
    }

    return (
        <div>
            {invitations.map((invitation) => (
                <InvitationCard
                    key={invitation.id}
                    invitation={invitation}
                    onRevoke={handleRevoke}
                />
            ))}
        </div>
    );
}
