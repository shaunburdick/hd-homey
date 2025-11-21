'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { Button, ErrorDisplay } from '@/components';
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

    useEffect(() => {
        // In development, log for easier debugging
        if (process.env.NODE_ENV === 'development') {
            // eslint-disable-next-line no-console
            console.error('Client error:', error);
        }
    }, [error]);

    return (
        <PageContainer maxWidth="md">
            <ErrorDisplay
                errorInfo={errorInfo}
                errorId={error.digest}
                actions={
                    <>
                        <Button onClick={reset}>
                            Try Again
                        </Button>
                        <Link href="/">
                            <Button variant="secondary">Go Home</Button>
                        </Link>
                    </>
                }
            />
        </PageContainer>
    );
}
