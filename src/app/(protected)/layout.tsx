import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { count } from 'drizzle-orm';
import Nav from '@/components/nav';
import { auth } from '@/lib/auth/auth';
import { getDb } from '@/lib/database/db';
import { user } from '@/lib/database/schema';

// Force dynamic rendering - don't pre-render at build time
export const dynamic = 'force-dynamic';

export default async function ProtectedLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    // Check if any users exist - if not, redirect to initial setup
    const db = await getDb();
    const userCount = await db.select({ count: count() }).from(user);

    if (userCount[0].count === 0) {
        redirect('/get-started');
    }

    // Check authentication
    const session = await auth.api.getSession({
        headers: await headers()
    });
    if (session?.user === null) {
        redirect('/users/signin');
    }

    return (
        <>
            <header>
                <Nav />
            </header>
            <main>{children}</main>
        </>
    );
}
