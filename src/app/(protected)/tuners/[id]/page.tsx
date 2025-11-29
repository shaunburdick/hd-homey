import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getDb } from '@/lib/database/db';
import { tuners, channels } from '@/lib/database/schema';
import { AdminLink } from '@/components/AdminLink';
import RoleGuard from '@/components/RoleGuard';
import { AuthRoles } from '@/lib/auth-roles';
import { Card, Button } from '@/components';
import { PageContainer, EmptyState } from '@/components/layouts';

interface PageParams {
    id: string
}

/**
 * Check if audio codec is AC4
 */
function isAC4Audio(audioCodec: string): boolean {
    const codec = audioCodec.toLowerCase();
    return codec.includes('ac4') || codec.includes('ac-4');
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
    ac4Badge: {
        padding: '2px 6px',
        backgroundColor: 'var(--color-warning-bg)',
        ...warningColor,
        borderRadius: 'var(--radius-sm)',
        fontWeight: 'var(--font-weight-medium)',
    },
};

export default async function Page(props: { params: Promise<PageParams> }) {
    const params = await props.params;
    const db = await getDb();

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

    const sortedChannels = tuner.channels
        .sort((a, b) => parseFloat(a.guideNumber) - parseFloat(b.guideNumber));

    return (
        <PageContainer>
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
                    <AdminLink href={`/tuners/${tuner.id}/edit`}>
                        <Button variant="secondary">✏️ Edit Tuner</Button>
                    </AdminLink>
                </div>
            </div>

            <Card className="mb-6">
                <div className="flex justify-between items-center flex-wrap gap-4">
                    <div>
                        <h2 className="mt-0 mb-1">
                            Channels
                        </h2>
                        <p className="text-secondary text-sm m-0">
                            {sortedChannels.length} channel{sortedChannels.length !== 1 ? 's' : ''} available
                        </p>
                    </div>
                    <RoleGuard allowedRoles={[AuthRoles.Admin]}>
                        <form action={`/tuners/${tuner.id}/poll`} method="POST">
                            <Button type="submit" variant="secondary">
                                🔄 Refresh Channels
                            </Button>
                        </form>
                    </RoleGuard>
                </div>
            </Card>

            {sortedChannels.length === 0 ? (
                <EmptyState
                    icon="📺"
                    title="No channels found"
                    description='Click "Refresh Channels" to scan for available channels'
                />
            ) : (
                <div className="grid gap-3">
                    {sortedChannels.map(channel => (
                        <Link
                            key={channel.id}
                            href={`/tuners/${tuner.id}/channel/${channel.id}`}
                            className="no-underline"
                        >
                            <Card className="channel-card transition p-4" style={{ cursor: 'pointer' }}>
                                <div className="flex items-center gap-4">
                                    <div className="rounded font-semibold text-center" style={{
                                        backgroundColor: 'var(--color-bg-primary)',
                                        padding: 'var(--space-2) var(--space-3)',
                                        color: 'var(--color-accent)',
                                        minWidth: '60px',
                                    }}>
                                        {channel.guideNumber}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="font-medium text-primary">
                                                {channel.guideName}
                                            </span>
                                            {isAC4Audio(channel.audioCodec) && (
                                                <span
                                                    className="text-xs"
                                                    style={styles.ac4Badge}
                                                    title="AC4 audio not supported - silent audio"
                                                >
                                                    ⚠️ AC4
                                                </span>
                                            )}
                                        </div>
                                        {channel.url && (
                                            <div className="text-xs text-tertiary" style={{ wordBreak: 'break-all' }}>
                                                {channel.url}
                                            </div>
                                        )}
                                    </div>
                                    <div className="text-sm text-tertiary">
                                        ▶️
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </PageContainer>
    );
}
