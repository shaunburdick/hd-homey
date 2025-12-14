import { redirect } from 'next/navigation';
import { count } from 'drizzle-orm';
import { getDb } from '@/lib/database/db';
import { user } from '@/lib/database/schema';

// Force dynamic rendering - don't pre-render at build time
export const dynamic = 'force-dynamic';

export default async function SignInLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const db = await getDb();
    const userCount = await db.select({ count: count() }).from(user);

    // If no users exist, redirect to get-started (initial setup needed)
    if (userCount[0].count === 0) {
        redirect('/get-started');
    }

    return children;
}
