'use client';

import Link from 'next/link';
import { Button, ErrorDisplay } from '@/components';
import { PageContainer } from '@/components/layouts';

export default function Unauthorized() {
    return (
        <PageContainer maxWidth="md">
            <ErrorDisplay
                errorInfo={{
                    title: 'Authentication Required',
                    message: 'You need to sign in to access this page.',
                    suggestion: 'Your session may have expired. Please sign in again.',
                }}
                actions={
                    <>
                        <Link href="/users/signin">
                            <Button>Sign In</Button>
                        </Link>
                        <Link href="/">
                            <Button variant="secondary">Go Home</Button>
                        </Link>
                    </>
                }
            />
        </PageContainer>
    );
}
