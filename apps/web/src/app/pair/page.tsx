import { Suspense } from 'react';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { PairDeviceForm } from './pair-form';
import { auth } from '@/lib/auth/auth';
import { PageContainer } from '@/components/layouts';

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
        redirect(`/users/signin?returnTo=/pair${searchParams.code ? `?code=${searchParams.code}` : ''}`);
    }

    return (
        <main className="flex items-center justify-center p-6" style={{ minHeight: '100vh' }}>
            <PageContainer maxWidth="sm">
                <div className="text-center" style={{ marginBottom: 'var(--space-8)' }}>
                    <Image
                        src="/icon.png"
                        alt="HD Homey"
                        width={64}
                        height={64}
                        className="rounded-lg"
                    />
                    <h1 className="mb-2" style={{ marginTop: 'var(--space-4)' }}>
                        Pair Device
                    </h1>
                    <p className="text-secondary text-base">
                        Authorize a new device to access HD Homey
                    </p>
                </div>

                <Suspense fallback={
                    <div className="text-center p-8">
                        <p className="text-secondary">Loading...</p>
                    </div>
                }>
                    <PairDeviceForm code={searchParams.code} user={session.user} />
                </Suspense>

                <p className="mt-5 text-center text-sm text-tertiary">
                    Only authorize devices you trust
                </p>
            </PageContainer>
        </main>
    );
}
