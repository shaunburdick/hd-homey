'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button, Card } from '@/components';
import { PageContainer } from '@/components/layouts';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        // Error is already logged by Next.js error boundary
        // Additional client-side logging could be added here if needed
        console.error('Client error:', error);
    }, [error]);

    return (
        <PageContainer maxWidth="md">
            <Card>
                <div style={{ padding: 'var(--space-6)' }}>
                    <div style={{
                        fontSize: 'var(--font-size-4xl)',
                        marginBottom: 'var(--space-4)',
                    }}>
                        ⚠️
                    </div>
                    <h1 style={{ marginBottom: 'var(--space-3)' }}>
                        Something went wrong
                    </h1>
                    <p style={{
                        color: 'var(--color-text-secondary)',
                        marginBottom: 'var(--space-2)',
                    }}>
                        We encountered an unexpected error. This has been logged and we&apos;ll look into it.
                    </p>
                    {error.digest && (
                        <p style={{
                            fontSize: 'var(--font-size-sm)',
                            color: 'var(--color-text-secondary)',
                            fontFamily: 'monospace',
                            marginBottom: 'var(--space-6)',
                        }}>
                            Error ID: {error.digest}
                        </p>
                    )}
                    <div style={{
                        display: 'flex',
                        gap: 'var(--space-3)',
                        flexWrap: 'wrap',
                    }}>
                        <Button onClick={reset}>
                            Try Again
                        </Button>
                        <Link href="/">
                            <Button variant="secondary">Go Home</Button>
                        </Link>
                    </div>
                </div>
            </Card>
        </PageContainer>
    );
}
