import { isNull } from 'drizzle-orm';
import Link from 'next/link';
import { getDb } from '@/lib/database/db';
import { tuners } from '@/lib/database/schema';
import { AdminLink } from '@/components/AdminLink';
import { Card, Button } from '@/components';
import { PageContainer, PageHeader, EmptyState } from '@/components/layouts';

export default async function TunersPage() {
    const db = await getDb();
    const tunerList = await db.query.tuners.findMany({
        where: isNull(tuners.deleted_at)
    });

    return (
        <PageContainer>
            <PageHeader
                title="Tuners"
                subtitle="Manage your HDHomeRun devices and view their channel lineups"
                action={
                    <AdminLink href='/tuners/new'>
                        <Button>➕ Add Tuner</Button>
                    </AdminLink>
                }
            />

            {tunerList.length === 0 ? (
                <EmptyState
                    icon="📡"
                    title="No tuners configured yet"
                    description="Add your first HDHomeRun device to get started streaming live TV"
                />
            ) : (
                <div style={{
                    display: 'grid',
                    gap: 'var(--space-4)',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                }}>
                    {tunerList.map(tuner => (
                        <Link
                            key={tuner.id}
                            href={`/tuners/${tuner.id}`}
                            className="no-underline cursor-pointer"
                        >
                            <Card className="tuner-card transition" style={{ height: '100%' }}>
                                <h3 className="mt-0 mb-2" style={{ color: 'var(--color-accent)' }}>
                                    {tuner.name}
                                </h3>
                                <p className="text-secondary text-sm mb-3" style={{ wordBreak: 'break-all' }}>
                                    {tuner.path}
                                </p>
                                <div className="flex items-center gap-2 text-sm text-tertiary">
                                    <span>📺</span>
                                    <span>View channels →</span>
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </PageContainer>
    );
}
