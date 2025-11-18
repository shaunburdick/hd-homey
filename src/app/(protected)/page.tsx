import Image from 'next/image';
import Link from 'next/link';
import { isNull } from 'drizzle-orm';
import hdHomey from '@public/hd-homey.webp';
import { auth } from '@/auth';
import { getDb } from '@/lib/database/db';
import { tuners, channels, users } from '@/lib/database/schema';
import { Card } from '@/components';

export default async function Home() {
    const session = await auth();
    const db = await getDb();

    const [tunerCount, channelCount, userCount] = await Promise.all([
        db.select().from(tuners).where(isNull(tuners.deleted_at)).then(r => r.length),
        db.select().from(channels).where(isNull(channels.deleted_at)).then(r => r.length),
        db.select().from(users).where(isNull(users.deleted_at)).then(r => r.length),
    ]);

    const isAdmin = session?.user?.isAdmin;

    return (
        <div className="container">
            <div style={{
                display: 'grid',
                gap: 'var(--space-6)',
                gridTemplateColumns: '1fr',
                maxWidth: '1200px',
            }}>
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 'var(--space-6)',
                    flexWrap: 'wrap',
                }}>
                    <Image
                        src={hdHomey}
                        alt="HD Homey"
                        width={150}
                        height={150}
                        priority
                        style={{ borderRadius: 'var(--radius-lg)' }}
                    />
                    <div>
                        <h1 style={{ marginBottom: 'var(--space-2)' }}>
                            Welcome back, {session?.user.name}!
                        </h1>
                        <p style={{
                            color: 'var(--color-text-secondary)',
                            marginBottom: 0,
                            fontSize: 'var(--font-size-lg)',
                        }}>
                            Your HDHomeRun streaming dashboard
                        </p>
                    </div>
                </div>

                <div style={{
                    display: 'grid',
                    gap: 'var(--space-4)',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                }}>
                    <Card>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <div>
                                <div style={{
                                    fontSize: 'var(--font-size-3xl)',
                                    fontWeight: 'var(--font-weight-bold)',
                                    color: 'var(--color-accent)',
                                }}>
                                    {tunerCount}
                                </div>
                                <div style={{
                                    color: 'var(--color-text-secondary)',
                                    fontSize: 'var(--font-size-sm)',
                                }}>
                                    {tunerCount === 1 ? 'Tuner' : 'Tuners'}
                                </div>
                            </div>
                            <div style={{ fontSize: 'var(--font-size-4xl)', opacity: 0.3 }}>
                                📡
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <div>
                                <div style={{
                                    fontSize: 'var(--font-size-3xl)',
                                    fontWeight: 'var(--font-weight-bold)',
                                    color: 'var(--color-success)',
                                }}>
                                    {channelCount}
                                </div>
                                <div style={{
                                    color: 'var(--color-text-secondary)',
                                    fontSize: 'var(--font-size-sm)',
                                }}>
                                    {channelCount === 1 ? 'Channel' : 'Channels'}
                                </div>
                            </div>
                            <div style={{ fontSize: 'var(--font-size-4xl)', opacity: 0.3 }}>
                                📺
                            </div>
                        </div>
                    </Card>

                    {isAdmin && (
                        <Card>
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}>
                                <div>
                                    <div style={{
                                        fontSize: 'var(--font-size-3xl)',
                                        fontWeight: 'var(--font-weight-bold)',
                                        color: 'var(--color-info)',
                                    }}>
                                        {userCount}
                                    </div>
                                    <div style={{
                                        color: 'var(--color-text-secondary)',
                                        fontSize: 'var(--font-size-sm)',
                                    }}>
                                        {userCount === 1 ? 'User' : 'Users'}
                                    </div>
                                </div>
                                <div style={{ fontSize: 'var(--font-size-4xl)', opacity: 0.3 }}>
                                    👥
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

                <div>
                    <h2 style={{ marginBottom: 'var(--space-4)' }}>Quick Actions</h2>
                    <div style={{
                        display: 'grid',
                        gap: 'var(--space-3)',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    }}>
                        <Link href="/tuners" style={{ textDecoration: 'none' }}>
                            <Card className="channel-card" style={{ cursor: 'pointer' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-3)',
                                }}>
                                    <span style={{ fontSize: 'var(--font-size-2xl)' }}>📡</span>
                                    <div>
                                        <div style={{
                                            fontWeight: 'var(--font-weight-semibold)',
                                            marginBottom: 'var(--space-1)',
                                        }}>
                                            Browse Tuners
                                        </div>
                                        <div style={{
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--color-text-secondary)',
                                        }}>
                                            View and manage your HDHomeRun devices
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </Link>

                        {isAdmin && (
                            <Link href="/settings" style={{ textDecoration: 'none' }}>
                                <Card className="channel-card" style={{ cursor: 'pointer' }}>
                                    <div style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-3)',
                                    }}>
                                        <span style={{ fontSize: 'var(--font-size-2xl)' }}>⚙️</span>
                                        <div>
                                            <div style={{
                                                fontWeight: 'var(--font-weight-semibold)',
                                                marginBottom: 'var(--space-1)',
                                            }}>
                                                Settings
                                            </div>
                                            <div style={{
                                                fontSize: 'var(--font-size-sm)',
                                                color: 'var(--color-text-secondary)',
                                            }}>
                                                Configure transcoding and manage users
                                            </div>
                                        </div>
                                    </div>
                                </Card>
                            </Link>
                        )}

                        <Link href="/about" style={{ textDecoration: 'none' }}>
                            <Card className="channel-card" style={{ cursor: 'pointer' }}>
                                <div style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-3)',
                                }}>
                                    <span style={{ fontSize: 'var(--font-size-2xl)' }}>ℹ️</span>
                                    <div>
                                        <div style={{
                                            fontWeight: 'var(--font-weight-semibold)',
                                            marginBottom: 'var(--space-1)',
                                        }}>
                                            About
                                        </div>
                                        <div style={{
                                            fontSize: 'var(--font-size-sm)',
                                            color: 'var(--color-text-secondary)',
                                        }}>
                                            Version info and documentation
                                        </div>
                                    </div>
                                </div>
                            </Card>
                        </Link>
                    </div>
                </div>
            </div>
        </div>
    );
}
