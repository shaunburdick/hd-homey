import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import UserEditForm from './UserEditForm';
import { getDb } from '@/lib/database/db';
import { user as userTable } from '@/lib/database/schema';
import { Card } from '@/components';
import { PageContainer, InfoCard } from '@/components/layouts';
import { AuthRoles } from '@/lib/auth-roles';
import type { User } from '@/lib/auth/types';

interface PageParams {
    id: string
};

/** Renders the user role badge (Admin or Viewer) */
function RoleBadge({ role }: { role: string }) {
    const isAdmin = role === AuthRoles.Admin;
    return (
        <span style={{
            display: 'inline-block',
            backgroundColor: isAdmin ? 'var(--color-info-bg)' : 'var(--color-bg-tertiary)',
            color: isAdmin ? 'var(--color-info)' : 'var(--color-text-secondary)',
            padding: 'var(--space-1) var(--space-3)',
            borderRadius: 'var(--radius-md)',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 'var(--font-weight-semibold)',
        }}>
            {isAdmin ? '👑 Admin' : '👤 Viewer'}
        </span>
    );
}

/** Renders the user name, role badge, and optional inactive badge */
function UserHeader({ user }: { user: User }) {
    return (
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
                <RoleBadge role={user.role} />
                {!user.isActive && (
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
    );
}

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
            <UserHeader user={user} />

            <InfoCard
                title="User Information"
                className="mb-6"
                items={[
                    { label: 'Username', value: `@${user.email}` },
                    { label: 'Display Name', value: user.name },
                    { label: 'Role', value: user.role === AuthRoles.Admin ? 'Administrator' : 'Viewer' },
                    {
                        label: 'Status',
                        value: (
                            <span style={{
                                color: user.isActive ? 'var(--color-success)' : 'var(--color-error)',
                            }}>
                                {user.isActive ? '✓ Active' : '✗ Inactive'}
                            </span>
                        ),
                    },
                    { label: 'Created', value: user.createdAt.toLocaleString() },
                    { label: 'Last Modified', value: user.updatedAt.toLocaleString() },
                ]}
            />

            <Card>
                <h2 className="mt-0 mb-4">Edit User</h2>
                <UserEditForm user={user} />
            </Card>
        </PageContainer>
    );
}
