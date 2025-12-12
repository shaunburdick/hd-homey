import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import { PairDeviceForm } from './pair-form';
import { auth } from '@/lib/auth/auth';

export const dynamic = 'force-dynamic';

interface PairPageProps {
    searchParams: Promise<{ code?: string }>;
}

export default async function PairPage(props: PairPageProps) {
    const searchParams = await props.searchParams;

    // Require authentication
    const session = await auth.api.getSession({
        headers: await import('next/headers').then((mod) => mod.headers()),
    });

    if (!session?.user) {
        redirect(`/users/signin?returnTo=/pair${  searchParams.code ? `?code=${searchParams.code}` : ''}`);
    }

    return (
        <main className="container">
            <h1>Pair Device</h1>
            <Suspense fallback={<p>Loading...</p>}>
                <PairDeviceForm code={searchParams.code} user={session.user} />
            </Suspense>
        </main>
    );
}
