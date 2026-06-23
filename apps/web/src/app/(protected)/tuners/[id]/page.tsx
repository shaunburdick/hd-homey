import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { headers } from 'next/headers';
import { getDb } from '@/lib/database/db';
import { tuners, channels } from '@/lib/database/schema';
import { AdminLink } from '@/components/AdminLink';
import RoleGuard from '@/components/RoleGuard';
import { AuthRoles } from '@/lib/auth-roles';
import { Card, Button } from '@/components';
import { PageContainer, EmptyState } from '@/components/layouts';
import { ChannelOrganizer } from '@/components/ChannelOrganizer';
import { auth } from '@/lib/auth/auth';
import type { Session } from '@/lib/auth/types';
interface PageParams {
    id: string
}

// Component-scoped warning styles - shared base for warning elements
const warningColor = { color: 'var(--color-warning)' as const };
const styles = {
    warningBadge: {
        padding: 'var(--space-2) var(--space-3)',
        backgroundColor: 'var(--color-warning-bg)',
        ...warningColor,
        borderRadius: 'var(--radius-md)',
        fontWeight: 'var(--font-weight-medium)',
    },
    warningText: warningColor,
};

/** Renders the tuner header with name, status and edit link */
function TunerHeader({ tuner }: { tuner: { id: number; name: string; path: string; is_active: boolean } }) {
    return (
        <div className="mb-6">
            <Link
                href="/tuners"
                className="text-secondary no-underline text-sm inline-flex items-center gap-2 mb-4"
            >
                ← Back to Tuners
            </Link>

            <div className="flex justify-between items-start flex-wrap gap-4">
                <div>
                    <div className="flex items-center gap-3 mb-2">
                        <h1 className="m-0">{tuner.name}</h1>
                        {!tuner.is_active && (
                            <span className="text-sm" style={styles.warningBadge}>
                                ⚠️ Inactive
                            </span>
                        )}
                    </div>
                    <p className="text-secondary text-sm m-0">
                        {tuner.path}
                    </p>
                    {!tuner.is_active && (
                        <p className="text-sm mt-2 mb-0" style={styles.warningText}>
                            This tuner is inactive and unavailable for streaming
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                    <Link href={`/tuners/${tuner.id}/signal`}>
                        <Button variant="secondary">📡 Signal Monitor</Button>
                    </Link>
                    <AdminLink href={`/tuners/${tuner.id}/edit`}>
                        <Button variant="secondary">✏️ Edit Tuner</Button>
                    </AdminLink>
                </div>
            </div>
        </div>
    );
}

/** Renders the channels panel header with count and refresh button */
function ChannelsPanelHeader({ tunerId, totalChannels }: { tunerId: number; totalChannels: number }) {
    return (
        <Card className="mb-6">
            <div className="flex justify-between items-center flex-wrap gap-4">
                <div>
                    <h2 className="mt-0 mb-1">
                        Channels
                    </h2>
                    <p className="text-secondary text-sm m-0">
                        {totalChannels} channel{totalChannels !== 1 ? 's' : ''} available
                    </p>
                </div>
                <RoleGuard allowedRoles={[AuthRoles.Admin]}>
                    <form action={`/tuners/${tunerId}/poll`} method="POST">
                        <Button type="submit" variant="secondary">
                            🔄 Refresh Channels
                        </Button>
                    </form>
                </RoleGuard>
            </div>
        </Card>
    );
}

export default async function Page(props: { params: Promise<PageParams> }) {
    const params = await props.params;
    const db = await getDb();

    // Get session for user preferences
    const rawSession = await auth.api.getSession({
        headers: await headers()
    });
    const session = rawSession as unknown as Session | null;

    if (!session?.user) {
        notFound();
    }

    const tuner = await db.query.tuners.findFirst({
        where: and(
            eq(tuners.id, parseInt(params.id, 10)),
            isNull(tuners.deleted_at)
        ),
        with: {
            channels: {
                where: and(
                    eq(channels.is_active, true),
                    isNull(channels.deleted_at)
                )
            }
        }
    });

    if (!tuner) {
        notFound();
    }

    const totalChannels = tuner.channels.length;

    return (
        <PageContainer>
            <TunerHeader tuner={tuner} />

            <ChannelsPanelHeader tunerId={tuner.id} totalChannels={totalChannels} />

            {totalChannels === 0 ? (
                <EmptyState
                    icon="📺"
                    title="No channels found"
                    description='Click "Refresh Channels" to scan for available channels'
                />
            ) : (
                <ChannelOrganizer
                    tunerId={tuner.id}
                    userId={session.user.id}
                />
            )}
        </PageContainer>
    );
}
