import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getDb } from '@/lib/database/db';
import { tuners } from '@/lib/database/schema';
import { AdminLink } from '@/components/AdminLink';
import RoleGuard from '@/components/RoleGuard';
import { AuthRoles } from '@/lib/auth-roles';
import { Card } from '@/components';

interface PageParams {
    id: string
}

export default async function Page(props: { params: Promise<PageParams> }) {
    const params = await props.params;
    const db = await getDb();

    const tuner = await db.query.tuners.findFirst({
        where: and(
            eq(tuners.id, parseInt(params.id, 10)),
            isNull(tuners.deleted_at)
        ),
        with: {
            channels: true
        }
    });

    if (!tuner) {
        notFound();
    }

    const sortedChannels = tuner.channels
        .sort((a, b) => parseFloat(a.guideNumber) - parseFloat(b.guideNumber));

    return (
        <div className="container">
            <div style={{ marginBottom: 'var(--space-6)' }}>
                <Link
                    href="/tuners"
                    style={{
                        color: 'var(--color-text-secondary)',
                        textDecoration: 'none',
                        fontSize: 'var(--font-size-sm)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        marginBottom: 'var(--space-4)',
                    }}
                >
                    ← Back to Tuners
                </Link>

                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 'var(--space-4)',
                }}>
                    <div>
                        <h1 style={{ marginBottom: 'var(--space-2)' }}>{tuner.name}</h1>
                        <p style={{
                            color: 'var(--color-text-secondary)',
                            fontSize: 'var(--font-size-sm)',
                            marginBottom: 0,
                        }}>
                            {tuner.path}
                        </p>
                    </div>
                    <AdminLink href={`/tuners/${tuner.id}/edit`}>
                        <button style={{
                            minHeight: 'var(--button-height)',
                            padding: 'var(--space-3) var(--space-4)',
                            borderRadius: 'var(--radius-md)',
                            fontWeight: 'var(--font-weight-medium)',
                            fontSize: 'var(--font-size-base)',
                            cursor: 'pointer',
                            transition: 'all var(--transition-fast)',
                            backgroundColor: 'var(--color-bg-tertiary)',
                            color: 'var(--color-text-primary)',
                            border: '1px solid var(--color-border)',
                        }}>
                            ✏️ Edit Tuner
                        </button>
                    </AdminLink>
                </div>
            </div>

            <Card style={{ marginBottom: 'var(--space-6)' }}>
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    flexWrap: 'wrap',
                    gap: 'var(--space-4)',
                }}>
                    <div>
                        <h2 style={{ marginTop: 0, marginBottom: 'var(--space-1)' }}>
                            Channels
                        </h2>
                        <p style={{
                            color: 'var(--color-text-secondary)',
                            fontSize: 'var(--font-size-sm)',
                            marginBottom: 0,
                        }}>
                            {sortedChannels.length} channel{sortedChannels.length !== 1 ? 's' : ''} available
                        </p>
                    </div>
                    <RoleGuard allowedRoles={[AuthRoles.Admin]}>
                        <form action={`/tuners/${tuner.id}/poll`} method="POST">
                            <button
                                type="submit"
                                style={{
                                    minHeight: 'var(--button-height)',
                                    padding: 'var(--space-3) var(--space-4)',
                                    borderRadius: 'var(--radius-md)',
                                    fontWeight: 'var(--font-weight-medium)',
                                    fontSize: 'var(--font-size-sm)',
                                    cursor: 'pointer',
                                    transition: 'all var(--transition-fast)',
                                    backgroundColor: 'var(--color-accent)',
                                    color: 'white',
                                    border: 'none',
                                }}
                            >
                                🔄 Refresh Channels
                            </button>
                        </form>
                    </RoleGuard>
                </div>
            </Card>

            {sortedChannels.length === 0 ? (
                <Card>
                    <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                        <p style={{
                            fontSize: 'var(--font-size-lg)',
                            color: 'var(--color-text-secondary)',
                            marginBottom: 'var(--space-4)',
                        }}>
                            No channels found
                        </p>
                        <p style={{ color: 'var(--color-text-tertiary)' }}>
                            Click "Refresh Channels" to scan for available channels
                        </p>
                    </div>
                </Card>
            ) : (
                <div style={{
                    display: 'grid',
                    gap: 'var(--space-3)',
                }}>
                    {sortedChannels.map(channel => (
                        <Link
                            key={channel.id}
                            href={`/tuners/${tuner.id}/channel/${channel.id}`}
                            style={{ textDecoration: 'none' }}
                        >
                            <Card
                                style={{
                                    transition: 'all var(--transition-fast)',
                                    cursor: 'pointer',
                                    padding: 'var(--space-4)',
                                }}
                                onMouseEnter={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--color-bg-tertiary)';
                                    e.currentTarget.style.borderColor = 'var(--color-border-hover)';
                                }}
                                onMouseLeave={(e) => {
                                    e.currentTarget.style.backgroundColor = 'var(--color-bg-secondary)';
                                    e.currentTarget.style.borderColor = 'var(--color-border)';
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-4)',
                                }}>
                                    <div style={{
                                        backgroundColor: 'var(--color-bg-primary)',
                                        padding: 'var(--space-2) var(--space-3)',
                                        borderRadius: 'var(--radius-md)',
                                        fontWeight: 'var(--font-weight-semibold)',
                                        color: 'var(--color-accent)',
                                        minWidth: '60px',
                                        textAlign: 'center',
                                    }}>
                                        {channel.guideNumber}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontWeight: 'var(--font-weight-medium)',
                                            color: 'var(--color-text-primary)',
                                            marginBottom: 'var(--space-1)',
                                        }}>
                                            {channel.guideName}
                                        </div>
                                        {channel.url && (
                                            <div style={{
                                                fontSize: 'var(--font-size-xs)',
                                                color: 'var(--color-text-tertiary)',
                                                wordBreak: 'break-all',
                                            }}>
                                                {channel.url}
                                            </div>
                                        )}
                                    </div>
                                    <div style={{
                                        fontSize: 'var(--font-size-sm)',
                                        color: 'var(--color-text-tertiary)',
                                    }}>
                                        ▶️
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
