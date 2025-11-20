'use client';

import Link from 'next/link';
import { Button, Card } from '@/components';
import { PageContainer } from '@/components/layouts';

export default function Unauthorized() {
    const colorTextSecondary = 'var(--color-text-secondary)';

    return (
        <PageContainer maxWidth="md">
            <Card>
                <div style={{ textAlign: 'center', padding: 'var(--space-6)' }}>
                    <div style={{
                        fontSize: 'var(--font-size-6xl)',
                        fontWeight: 'var(--font-weight-bold)',
                        color: colorTextSecondary,
                        marginBottom: 'var(--space-4)',
                    }}>
                        401
                    </div>
                    <h1 style={{ marginBottom: 'var(--space-3)' }}>
                        Authentication Required
                    </h1>
                    <p style={{
                        color: colorTextSecondary,
                        marginBottom: 'var(--space-2)',
                    }}>
                        You need to sign in to access this page.
                    </p>
                    <p style={{
                        fontSize: 'var(--font-size-sm)',
                        color: colorTextSecondary,
                        marginBottom: 'var(--space-6)',
                    }}>
                        💡 Your session may have expired. Please sign in again.
                    </p>
                    <div style={{
                        display: 'flex',
                        gap: 'var(--space-3)',
                        justifyContent: 'center',
                        flexWrap: 'wrap',
                    }}>
                        <Link href="/users/signin">
                            <Button>Sign In</Button>
                        </Link>
                        <Link href="/">
                            <Button variant="secondary">Go Home</Button>
                        </Link>
                    </div>
                </div>
            </Card>
        </PageContainer>
    );
}
