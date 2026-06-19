import { headers } from 'next/headers';
import Image from 'next/image';
import Link from 'next/link';
import { isNull } from 'drizzle-orm';
import styles from './page.module.css';
import hdHomey from '@public/hd-homey.webp';
import { auth } from '@/lib/auth/auth';
import type { Session } from '@/lib/auth/types';
import { getDb } from '@/lib/database/db';
import { tuners, channels, user } from '@/lib/database/schema';
import { Card } from '@/components';
import { PageContainer } from '@/components/layouts';
import { AuthRoles } from '@/lib/auth-roles';

/** Size in pixels for the hero logo on the home dashboard */
const HERO_IMAGE_SIZE_PX = 150;

/** Fetches dashboard stats: tuner count, channel count, user count */
async function getDashboardStats() {
    const db = await getDb();
    const [tunerRows, channelRows, userRows] = await Promise.all([
        db.select().from(tuners).where(isNull(tuners.deleted_at)),
        db.select().from(channels).where(isNull(channels.deleted_at)),
        db.select().from(user).where(isNull(user.deletedAt)),
    ]);
    return {
        tunerCount: tunerRows.length,
        channelCount: channelRows.length,
        userCount: userRows.length,
    };
}

/** Renders a single stat card with value, label, and icon */
function StatCard({
    value,
    label,
    icon,
    styleVariant,
}: {
    value: number;
    label: string;
    icon: string;
    styleVariant: string;
}) {
    return (
        <Card>
            <div className={styles.statCard}>
                <div>
                    <div className={`${styles.statValue} ${styleVariant}`}>
                        {value}
                    </div>
                    <div className={styles.statLabel}>
                        {label}
                    </div>
                </div>
                <div className={styles.statIcon}>
                    {icon}
                </div>
            </div>
        </Card>
    );
}

/** Renders the stat cards for the dashboard */
function StatCards({
    tunerCount,
    channelCount,
    userCount,
    isAdmin,
}: {
    tunerCount: number;
    channelCount: number;
    userCount: number;
    isAdmin: boolean;
}) {
    return (
        <div className="grid grid-auto-fit gap-4">
            <StatCard
                value={tunerCount}
                label={tunerCount === 1 ? 'Tuner' : 'Tuners'}
                icon="📡"
                styleVariant={styles.statValueAccent}
            />
            <StatCard
                value={channelCount}
                label={channelCount === 1 ? 'Channel' : 'Channels'}
                icon="📺"
                styleVariant={styles.statValueSuccess}
            />
            {isAdmin && (
                <StatCard
                    value={userCount}
                    label={userCount === 1 ? 'User' : 'Users'}
                    icon="👥"
                    styleVariant={styles.statValueInfo}
                />
            )}
        </div>
    );
}

/** Renders the quick action links for the dashboard */
function QuickActions({ isAdmin }: { isAdmin: boolean }) {
    return (
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
    );
}

export default async function Home() {
    const rawSession = await auth.api.getSession({
        headers: await headers()
    });
    const session = rawSession as unknown as Session | null;

    const { tunerCount, channelCount, userCount } = await getDashboardStats();
    const isAdmin = session?.user?.role === AuthRoles.Admin;

    return (
        <PageContainer maxWidth="xl">
            <div className="grid gap-6">
                <div className="flex items-center gap-6 flex-wrap">
                    <Image
                        src={hdHomey}
                        alt="HD Homey"
                        width={HERO_IMAGE_SIZE_PX}
                        height={HERO_IMAGE_SIZE_PX}
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

                <StatCards
                    tunerCount={tunerCount}
                    channelCount={channelCount}
                    userCount={userCount}
                    isAdmin={isAdmin}
                />

                <QuickActions isAdmin={isAdmin} />
            </div>
        </PageContainer>
    );
}
