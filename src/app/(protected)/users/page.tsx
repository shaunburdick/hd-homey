import { isNull } from 'drizzle-orm';
import Link from 'next/link';
import { getDb } from '@/lib/database/db';
import { users } from '@/lib/database/schema';
import { AdminLink } from '@/components/AdminLink';
import { Card } from '@/components';

export default async function Page() {
    const db = await getDb();
    const userList = await db.query.users.findMany({
        where: isNull(users.deleted_at)
    });

    return (
        <div className="container">
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-6)',
                flexWrap: 'wrap',
                gap: 'var(--space-4)',
            }}>
                <div>
                    <h1 style={{ marginBottom: 'var(--space-2)' }}>Users</h1>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: 0 }}>
                        Manage user accounts and permissions
                    </p>
                </div>
                <AdminLink href='/users/new'>
                    <button style={{
                        minHeight: 'var(--button-height)',
                        padding: 'var(--space-3) var(--space-5)',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 'var(--font-weight-medium)',
                        fontSize: 'var(--font-size-base)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                        border: '1px solid transparent',
                        backgroundColor: 'var(--color-accent)',
                        color: 'white',
                    }}>
                        ➕ Add User
                    </button>
                </AdminLink>
            </div>

            {userList.length === 0 ? (
                <Card>
                    <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                        <p style={{
                            fontSize: 'var(--font-size-lg)',
                            color: 'var(--color-text-secondary)',
                            marginBottom: 'var(--space-4)',
                        }}>
                            No users found
                        </p>
                    </div>
                </Card>
            ) : (
                <div style={{
                    display: 'grid',
                    gap: 'var(--space-3)',
                }}>
                    {userList.map(user => (
                        <Link
                            key={user.id}
                            href={`/users/${user.id}`}
                            style={{ textDecoration: 'none' }}
                        >
                            <Card
                                className="channel-card"
                                style={{
                                    transition: 'all var(--transition-fast)',
                                    cursor: 'pointer',
                                    padding: 'var(--space-4)',
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    gap: 'var(--space-4)',
                                }}>
                                    <div style={{ flex: 1 }}>
                                        <div style={{
                                            fontWeight: 'var(--font-weight-medium)',
                                            color: 'var(--color-text-primary)',
                                            marginBottom: 'var(--space-1)',
                                            fontSize: 'var(--font-size-lg)',
                                        }}>
                                            {user.name}
                                        </div>
                                        <div style={{
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--color-text-secondary)',
                                        }}>
                                            @{user.username}
                                        </div>
                                    </div>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-3)',
                                    }}>
                                        <span style={{
                                            display: 'inline-block',
                                            backgroundColor: user.role === 'admin'
                                                ? 'var(--color-info-bg)'
                                                : 'var(--color-bg-primary)',
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
                                        <span style={{
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--color-text-tertiary)',
                                        }}>
                                            →
                                        </span>
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
