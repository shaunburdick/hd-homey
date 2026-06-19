'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { useRouter, useSearchParams } from 'next/navigation';
import Logger from '@/lib/logger';
import { authClient } from '@/lib/auth/auth-client';
import { Input, Button, Card } from '@/components';
import { PageContainer } from '@/components/layouts';

/** Size in pixels for the HD Homey app icon */
const APP_ICON_SIZE = 64;

/** Renders success and error alerts for the sign-in form. */
function SignInAlerts({ successMessage, error }: { successMessage: string | null; error: string | null }) {
    return (
        <>
            {successMessage && (
                <div role="alert" className="rounded p-4 mb-4" style={{
                    backgroundColor: 'var(--color-success-bg)',
                    border: '1px solid var(--color-success)',
                    color: 'var(--color-success)',
                }}>
                    {successMessage}
                </div>
            )}
            {error && (
                <div role="alert" className="rounded p-4 mb-4" style={{
                    backgroundColor: 'var(--color-error-bg)',
                    border: '1px solid var(--color-error)',
                    color: 'var(--color-error)',
                }}>
                    {error}
                </div>
            )}
        </>
    );
}

interface SignInFormProps {
    successMessage: string | null;
    error: string | null;
    isLoading: boolean;
    onSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

/** Renders the sign-in form card with inputs and alerts. */
function SignInForm({ successMessage, error, isLoading, onSubmit }: SignInFormProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const input = containerRef.current?.querySelector<HTMLInputElement>('input[name="username"]');
        input?.focus();
    }, []);

    return (
        <Card>
            <form onSubmit={onSubmit}>
                <SignInAlerts successMessage={successMessage} error={error} />
                <div ref={containerRef}>
                    <Input
                        label="Username"
                        name="username"
                        type="text"
                        required
                        autoComplete="username"
                        disabled={isLoading}
                    />
                </div>
                <Input
                    label="Password"
                    name="password"
                    type="password"
                    required
                    autoComplete="current-password"
                    showPasswordToggle
                    disabled={isLoading}
                />
                <div className="mt-6">
                    <Button
                        type="submit"
                        loading={isLoading}
                        disabled={isLoading}
                        className="w-full"
                    >
                        {isLoading ? 'Signing In...' : 'Sign In'}
                    </Button>
                </div>
            </form>
        </Card>
    );
}

/**
 * Attempt sign-in with the given credentials.
 * Returns an error message on failure, or null on success.
 */
async function attemptSignIn(
    username: string,
    password: string
): Promise<string | null> {
    const { error: authError } = await authClient.signIn.username({ username, password });
    if (authError) {
        return authError.message || 'Invalid username or password';
    }
    return null;
}

/** Renders the HD Homey logo and sign-in header. */
function SignInHeader() {
    return (
        <div className="text-center" style={{ marginBottom: 'var(--space-8)' }}>
            <Image src="/icon.png" alt="HD Homey" width={APP_ICON_SIZE} height={APP_ICON_SIZE} className="rounded-lg" />
            <h1 className="mb-2" style={{ marginTop: 'var(--space-4)' }}>Sign In</h1>
            <p className="text-secondary text-base">Welcome back to HD Homey</p>
        </div>
    );
}

export default function SignIn() {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();

    const successMessage = searchParams.get('created') === 'true'
        ? 'Account created successfully! Please sign in with your new credentials.'
        : null;

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setIsLoading(true);
        setError(null);
        const formData = new FormData(event.currentTarget);
        const username = formData.get('username') as string;
        const password = formData.get('password') as string;
        try {
            const authError = await attemptSignIn(username, password);
            if (authError !== null) {
                setError(authError);
                setIsLoading(false);
            } else {
                router.push('/');
                router.refresh();
            }
        } catch (err) {
            Logger.error({ err }, 'Sign in error');
            setError('An error occurred during sign in');
            setIsLoading(false);
        }
    };

    return (
        <main className="flex items-center justify-center p-6" style={{ minHeight: '100vh' }}>
            <PageContainer maxWidth="sm">
                <SignInHeader />
                <SignInForm
                    successMessage={successMessage}
                    error={error}
                    isLoading={isLoading}
                    onSubmit={handleSubmit}
                />
                <p className="mt-5 text-center text-sm text-tertiary">Need help? Contact your administrator.</p>
            </PageContainer>
        </main>
    );
}
