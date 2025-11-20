'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button, Card } from '@/components';
import { PageContainer } from '@/components/layouts';
import { getErrorInfo } from '@/lib/errors';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const errorInfo = getErrorInfo(error);
    const colorTextSecondary = 'var(--color-text-secondary)';
    const fontSizeSm = 'var(--font-size-sm)';
    const spaceFour = 'var(--space-4)';

    useEffect(() => {
        // In development, log for easier debugging
        if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.error('Client error:', error);
        }
    }, [error]);

    return (
        <PageContainer maxWidth="md">
            <Card>
                <div style={{ padding: 'var(--space-6)' }}>
                    <div style={{
                        fontSize: 'var(--font-size-4xl)',
                        marginBottom: spaceFour,
                    }}>
                        ⚠️
                    </div>
                    <h1 style={{ marginBottom: 'var(--space-3)' }}>
                        {errorInfo.title}
                    </h1>
                    <p style={{
                        color: colorTextSecondary,
                        marginBottom: errorInfo.suggestion ? 'var(--space-2)' : spaceFour,
                    }}>
                        {errorInfo.message}
                    </p>
                    {errorInfo.suggestion && (
                        <p style={{
                            fontSize: fontSizeSm,
                            color: colorTextSecondary,
                            marginBottom: spaceFour,
                        }}>
                            💡 {errorInfo.suggestion}
                        </p>
                    )}
                    {errorInfo.recovery && errorInfo.recovery.length > 0 && (
                        <div style={{ marginBottom: spaceFour }}>
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
                                paddingLeft: 'var(--space-5)',
                                margin: 0,
                            }}>
                                {errorInfo.recovery.map((step) => (
                                    <li key={step} style={{ marginBottom: 'var(--space-1)' }}>
                                        {step}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    {error.digest && (
                        <p style={{
                            fontSize: fontSizeSm,
                            color: 'var(--color-text-tertiary)',
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
