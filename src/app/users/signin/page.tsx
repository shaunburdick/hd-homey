'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Input, Button, Card } from '@/components';

export default function SignIn() {
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        const formData = new FormData(e.currentTarget);
        const username = formData.get('username') as string;
        const password = formData.get('password') as string;

        try {
            const result = await signIn('credentials', {
                username,
                password,
                redirect: false
            });

            if (result?.error) {
                setError('Invalid username or password');
                setIsLoading(false);
            } else if (result?.ok) {
                router.push('/');
                router.refresh();
            }
        } catch {
            setError('An error occurred during sign in');
            setIsLoading(false);
        }
    };

    return (
        <main style={{
            maxWidth: '500px',
            margin: '0 auto',
            padding: 'var(--space-6)',
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
        }}>
            <div style={{ width: '100%' }}>
                <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
                    <img
                        src="/icon.png"
                        alt="HD Homey"
                        width="64"
                        height="64"
                        style={{ borderRadius: 'var(--radius-lg)' }}
                    />
                    <h1 style={{ marginTop: 'var(--space-4)', marginBottom: 'var(--space-2)' }}>
                        Sign In
                    </h1>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-base)' }}>
                        Welcome back to HD Homey
                    </p>
                </div>

                <Card>
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div
                                role="alert"
                                style={{
                                    backgroundColor: 'var(--color-error-bg)',
                                    border: '1px solid var(--color-error)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: 'var(--space-4)',
                                    marginBottom: 'var(--space-4)',
                                    color: 'var(--color-error)',
                                }}
                            >
                                {error}
                            </div>
                        )}

                        <Input
                            label="Username"
                            name="username"
                            type="text"
                            required
                            autoComplete="username"
                            disabled={isLoading}
                        />

                        <Input
                            label="Password"
                            name="password"
                            type="password"
                            required
                            autoComplete="current-password"
                            showPasswordToggle
                            disabled={isLoading}
                        />

                        <div style={{ marginTop: 'var(--space-6)' }}>
                            <Button
                                type="submit"
                                loading={isLoading}
                                disabled={isLoading}
                                style={{ width: '100%' }}
                            >
                                {isLoading ? 'Signing In...' : 'Sign In'}
                            </Button>
                        </div>
                    </form>
                </Card>

                <p style={{
                    marginTop: 'var(--space-5)',
                    textAlign: 'center',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-tertiary)',
                }}>
                    Need help? Contact your administrator.
                </p>
            </div>
        </main>
    );
}
