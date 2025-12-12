import { redirect } from 'next/navigation';
import { count } from 'drizzle-orm';
import { getDb } from '@/lib/database/db';
import { user } from '@/lib/database/schema';

// Force dynamic rendering - don't pre-render at build time
export const dynamic = 'force-dynamic';

export default async function StartLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const db = await getDb();
    const userCount = await db.select({ count: count() }).from(user);

    // If users exist, redirect to signin (setup already complete)
    if (userCount[0].count > 0) {
        redirect('/users/signin');
    }

    return (
        <main>{children}</main>
    );
}
