'use client';

import Link from 'next/link';
import { Button, Card } from '@/components';
import { PageContainer } from '@/components/layouts';

export default function Forbidden() {
    const colorTextSecondary = 'var(--color-text-secondary)';
    const fontSizeSm = 'var(--font-size-sm)';

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
                        403
                    </div>
                    <h1 style={{ marginBottom: 'var(--space-3)' }}>
                        Access Denied
                    </h1>
                    <p style={{
                        color: colorTextSecondary,
                        marginBottom: 'var(--space-2)',
                    }}>
                        You don&apos;t have permission to access this resource.
                    </p>
                    <p style={{
                        fontSize: fontSizeSm,
                        color: colorTextSecondary,
                        marginBottom: 'var(--space-4)',
                    }}>
                        💡 This action requires administrator privileges.
                    </p>
                    <div style={{ marginBottom: 'var(--space-6)' }}>
                        <p style={{
                            fontSize: fontSizeSm,
                            fontWeight: 'var(--font-weight-semibold)',
                            marginBottom: 'var(--space-2)',
                        }}>
                            What you can do:
                        </p>
                        <ul style={{
                            fontSize: fontSizeSm,
                            color: colorTextSecondary,
                            textAlign: 'left',
                            display: 'inline-block',
                            paddingLeft: 'var(--space-5)',
                            margin: 0,
                        }}>
                            <li style={{ marginBottom: 'var(--space-1)' }}>
                                Contact an administrator to request access
                            </li>
                            <li style={{ marginBottom: 'var(--space-1)' }}>
                                Sign in with an account that has the necessary permissions
                            </li>
                            <li>
                                Go back to a page you have access to
                            </li>
                        </ul>
                    </div>
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
