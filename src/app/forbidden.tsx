'use client';

import Link from 'next/link';
import { Button, ErrorDisplay } from '@/components';
import { PageContainer } from '@/components/layouts';

export default function Forbidden() {
    return (
        <PageContainer maxWidth="md">
            <ErrorDisplay
                errorInfo={{
                    title: 'Access Denied',
                    message: "You don't have permission to access this resource.",
                    suggestion: 'This action requires administrator privileges.',
                    recovery: [
                        'Contact an administrator to request access',
                        'Sign in with an account that has the necessary permissions',
                        'Go back to a page you have access to',
                    ],
                }}
                actions={
                    <>
                        <Link href="/">
                            <Button>Go Home</Button>
                        </Link>
                        <Link href="/tuners">
                            <Button variant="secondary">Browse Tuners</Button>
                        </Link>
                    </>
                }
            />
        </PageContainer>
    );
}
