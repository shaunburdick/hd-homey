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

export default function InvitationList({ invitations }: InvitationListProps) {
    const handleRevoke = async (id: number) => {
        await revokeInvitation(id);
        // Trigger page refresh to show updated invitation list
        window.location.reload();
    };

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
