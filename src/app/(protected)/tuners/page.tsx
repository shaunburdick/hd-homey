import { isNull } from 'drizzle-orm';
import Link from 'next/link';
import { getDb } from '@/lib/database/db';
import { tuners } from '@/lib/database/schema';
import { AdminLink } from '@/components/AdminLink';
import { Card } from '@/components';

export default async function TunersPage() {
    const db = await getDb();
    const tunerList = await db.query.tuners.findMany({
        where: isNull(tuners.deleted_at)
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
                    <h1 style={{ marginBottom: 'var(--space-2)' }}>Tuners</h1>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: 0 }}>
                        Manage your HDHomeRun devices and view their channel lineups
                    </p>
                </div>
                <AdminLink href='/tuners/new'>
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
                        ➕ Add Tuner
                    </button>
                </AdminLink>
            </div>

            {tunerList.length === 0 ? (
                <Card>
                    <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                        <p style={{
                            fontSize: 'var(--font-size-lg)',
                            color: 'var(--color-text-secondary)',
                            marginBottom: 'var(--space-4)',
                        }}>
                            No tuners configured yet
                        </p>
                        <p style={{ color: 'var(--color-text-tertiary)' }}>
                            Add your first HDHomeRun device to get started streaming live TV
                        </p>
                    </div>
                </Card>
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
                            style={{ textDecoration: 'none' }}
                        >
                            <Card
                                className="tuner-card"
                                style={{
                                    height: '100%',
                                    transition: 'all var(--transition-fast)',
                                    cursor: 'pointer',
                                }}
                            >
                                <h3 style={{
                                    marginTop: 0,
                                    marginBottom: 'var(--space-2)',
                                    color: 'var(--color-accent)',
                                }}>
                                    {tuner.name}
                                </h3>
                                <p style={{
                                    color: 'var(--color-text-secondary)',
                                    fontSize: 'var(--font-size-sm)',
                                    marginBottom: 'var(--space-3)',
                                    wordBreak: 'break-all',
                                }}>
                                    {tuner.path}
                                </p>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-2)',
                                    fontSize: 'var(--font-size-sm)',
                                    color: 'var(--color-text-tertiary)',
                                }}>
                                    <span>📺</span>
                                    <span>View channels →</span>
                                </div>
                            </Card>
                        </Link>
                    ))}
                </div>
            )}
        </div>
    );
}
