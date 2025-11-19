import { isNull } from 'drizzle-orm';
import Link from 'next/link';
import { getDb } from '@/lib/database/db';
import { users } from '@/lib/database/schema';
import { AdminLink } from '@/components/AdminLink';
import { Card, Button } from '@/components';
import { PageContainer, PageHeader, EmptyState } from '@/components/layouts';

export default async function Page() {
    const db = await getDb();
    const userList = await db.query.users.findMany({
        where: isNull(users.deleted_at)
    });

    return (
        <PageContainer>
            <PageHeader
                title="Users"
                subtitle="Manage user accounts and permissions"
                action={
                    <AdminLink href='/users/new'>
                        <Button>➕ Add User</Button>
                    </AdminLink>
                }
            />

            {userList.length === 0 ? (
                <EmptyState
                    icon="👥"
                    title="No users found"
                />
            ) : (
                <div className="grid gap-3">
                    {userList.map(user => (
                        <Link
                            key={user.id}
                            href={`/users/${user.id}`}
                            className="no-underline"
                        >
                            <Card className="channel-card transition cursor-pointer p-4">
                                <div className="flex items-center justify-between gap-4">
                                    <div className="flex-1">
                                        <div className="font-medium text-primary mb-1 text-lg">
                                            {user.name}
                                        </div>
                                        <div className="text-sm text-secondary">
                                            @{user.username}
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span
                                            className="inline-block rounded text-sm font-semibold"
                                            style={{
                                                backgroundColor: user.role === 'admin'
                                                    ? 'var(--color-info-bg)'
                                                    : 'var(--color-bg-primary)',
                                                color: user.role === 'admin'
                                                    ? 'var(--color-info)'
                                                    : 'var(--color-text-secondary)',
                                                padding: 'var(--space-1) var(--space-3)',
                                            }}
                                        >
                                            {user.role === 'admin' ? '👑 Admin' : '👤 Viewer'}
                                        </span>
                                        <span className="text-sm text-tertiary">
                                            →
                                        </span>
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
