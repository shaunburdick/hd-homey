import { headers } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { isNull } from 'drizzle-orm';
import styles from './page.module.css';
import hdHomey from '@public/hd-homey.webp';
import { auth } from '@/lib/auth/auth';
import { getDb } from '@/lib/database/db';
import { tuners, channels, user } from '@/lib/database/schema';
import { Card } from '@/components';
import { PageContainer } from '@/components/layouts';
import { AuthRoles } from '@/lib/auth-roles';

export default async function Home() {
    const session = await auth.api.getSession({
        headers: await headers()
    });
    const db = await getDb();

    const [tunerCount, channelCount, userCount] = await Promise.all([
        db.select().from(tuners).where(isNull(tuners.deleted_at)).then(r => r.length),
        db.select().from(channels).where(isNull(channels.deleted_at)).then(r => r.length),
        db.select().from(user).where(isNull(user.deletedAt)).then(r => r.length),
    ]);

    const isAdmin = session?.user?.role === AuthRoles.Admin;

    return (
        <PageContainer maxWidth="xl">
            <div className="grid gap-6">
                <div className="flex items-center gap-6 flex-wrap">
                    <Image
                        src={hdHomey}
                        alt="HD Homey"
                        width={150}
                        height={150}
                        priority
                        className="rounded-lg"
                    />
                    <div>
                        <h1 className="mb-2">
                            Welcome back, {session?.user.name}!
                        </h1>
                        <p className="text-secondary m-0 text-lg">
                            Your HDHomeRun streaming dashboard
                        </p>
                    </div>
                </div>

                <div className="grid grid-auto-fit gap-4">
                    <Card>
                        <div className={styles.statCard}>
                            <div>
                                <div className={`${styles.statValue} ${styles.statValueAccent}`}>
                                    {tunerCount}
                                </div>
                                <div className={styles.statLabel}>
                                    {tunerCount === 1 ? 'Tuner' : 'Tuners'}
                                </div>
                            </div>
                            <div className={styles.statIcon}>
                                📡
                            </div>
                        </div>
                    </Card>

                    <Card>
                        <div className={styles.statCard}>
                            <div>
                                <div className={`${styles.statValue} ${styles.statValueSuccess}`}>
                                    {channelCount}
                                </div>
                                <div className={styles.statLabel}>
                                    {channelCount === 1 ? 'Channel' : 'Channels'}
                                </div>
                            </div>
                            <div className={styles.statIcon}>
                                📺
                            </div>
                        </div>
                    </Card>

                    {isAdmin && (
                        <Card>
                            <div className={styles.statCard}>
                                <div>
                                    <div className={`${styles.statValue} ${styles.statValueInfo}`}>
                                        {userCount}
                                    </div>
                                    <div className={styles.statLabel}>
                                        {userCount === 1 ? 'User' : 'Users'}
                                    </div>
                                </div>
                                <div className={styles.statIcon}>
                                    👥
                                </div>
                            </div>
                        </Card>
                    )}
                </div>

                <div>
                    <h2 className="mb-4">Quick Actions</h2>
                    <div className="grid grid-auto-fit gap-4">
                        <Link href="/tuners" className={styles.quickLink}>
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">📡</span>
                                <div>
                                    <div className={styles.quickLinkTitle}>
                                        Browse Tuners
                                    </div>
                                    <div className={styles.quickLinkDescription}>
                                        View and manage your HDHomeRun devices
                                    </div>
                                </div>
                            </div>
                        </Link>

                        {isAdmin && (
                            <Link href="/settings" className={styles.quickLink}>
                                <div className="flex items-center gap-3">
                                    <span className="text-2xl">⚙️</span>
                                    <div>
                                        <div className={styles.quickLinkTitle}>
                                            Settings
                                        </div>
                                        <div className={styles.quickLinkDescription}>
                                            Configure transcoding and manage users
                                        </div>
                                    </div>
                                </div>
                            </Link>
                        )}

                        <Link href="/about" className={styles.quickLink}>
                            <div className="flex items-center gap-3">
                                <span className="text-2xl">ℹ️</span>
                                <div>
                                    <div className={styles.quickLinkTitle}>
                                        About
                                    </div>
                                    <div className={styles.quickLinkDescription}>
                                        Version info and documentation
                                    </div>
                                </div>
                            </div>
                        </Link>
                    </div>
                </div>
            </div>
        </PageContainer>
    );
}
