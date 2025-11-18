'use client';

import Link from 'next/link';
import { Button, Card } from '@/components';
import { PageContainer } from '@/components/layouts';

export default function NotFound() {
    return (
        <PageContainer maxWidth="md">
            <Card>
                <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                    <div style={{
                        fontSize: 'var(--font-size-6xl)',
                        fontWeight: 'var(--font-weight-bold)',
                        color: 'var(--color-text-secondary)',
                        marginBottom: 'var(--space-4)',
                    }}>
                        404
                    </div>
                    <h1 style={{ marginBottom: 'var(--space-3)' }}>
                        Page Not Found
                    </h1>
                    <p style={{
                        color: 'var(--color-text-secondary)',
                        marginBottom: 'var(--space-6)',
                    }}>
                        The page you're looking for doesn't exist or has been moved.
                    </p>
                    <div style={{
                        display: 'flex',
                        gap: 'var(--space-3)',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                    }}>
                        <Link href="/">
                            <Button>Go Home</Button>
                        </Link>
                        <Link href="/tuners">
                            <Button variant="secondary">Browse Tuners</Button>
                        </Link>
                    </div>
                </div>
            </Card>
        </PageContainer>
    );
}
