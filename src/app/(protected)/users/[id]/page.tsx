import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import UserEditForm from './UserEditForm';
import { getDb } from '@/lib/database/db';
import { user as userTable } from '@/lib/database/schema';
import { Card } from '@/components';
import { PageContainer, InfoCard } from '@/components/layouts';

interface PageParams {
    id: string
};

export default async function Page(props: { params: Promise<PageParams> }) {
    const params = await props.params;
    const db = await getDb();

    const user = await db.query.user.findFirst({
        where: and(
            eq(userTable.id, params.id),
            isNull(userTable.deletedAt)
        )
    });

    if (!user) {
        notFound();
    }

    return (
        <PageContainer maxWidth="lg">
            <div style={{ marginBottom: 'var(--space-6)' }}>
                <Link
                    href="/users"
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
                    ← Back to Users
                </Link>

                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-3)',
                }}>
                    <h1 style={{ marginBottom: 0 }}>{user.name}</h1>
                    <span style={{
                        display: 'inline-block',
                        backgroundColor: user.role === 'admin'
                            ? 'var(--color-info-bg)'
                            : 'var(--color-bg-tertiary)',
                        color: user.role === 'admin'
                            ? 'var(--color-info)'
                            : 'var(--color-text-secondary)',
                        padding: 'var(--space-1) var(--space-3)',
                        borderRadius: 'var(--radius-md)',
                        fontSize: 'var(--font-size-sm)',
                        fontWeight: 'var(--font-weight-semibold)',
                    }}>
                        {user.role === 'admin' ? '👑 Admin' : '👤 Viewer'}
                    </span>
                    {!user.is_active && (
                        <span style={{
                            display: 'inline-block',
                            backgroundColor: 'var(--color-error-bg)',
                            color: 'var(--color-error)',
                            padding: 'var(--space-1) var(--space-2)',
                            borderRadius: 'var(--radius-sm)',
                            fontSize: 'var(--font-size-xs)',
                            fontWeight: 'var(--font-weight-semibold)',
                        }}>
                            Inactive
                        </span>
                    )}
                </div>
            </div>

            <InfoCard
                title="User Information"
                className="mb-6"
                items={[
                    { label: 'Username', value: `@${user.username}` },
                    { label: 'Display Name', value: user.name },
                    { label: 'Role', value: user.role === 'admin' ? 'Administrator' : 'Viewer' },
                    {
                        label: 'Status',
                        value: (
                            <span style={{
                                color: user.is_active ? 'var(--color-success)' : 'var(--color-error)',
                            }}>
                                {user.is_active ? '✓ Active' : '✗ Inactive'}
                            </span>
                        ),
                    },
                    { label: 'Created', value: user.created_at.toLocaleString() },
                    { label: 'Last Modified', value: user.modified_at.toLocaleString() },
                ]}
            />

            <Card>
                <h2 className="mt-0 mb-4">Edit User</h2>
                <UserEditForm user={user} />
            </Card>
        </PageContainer>
    );
}
