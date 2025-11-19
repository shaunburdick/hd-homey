'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';
import { Input, Button, Card } from '@/components';
import { PageContainer } from '@/components/layouts';

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
        <main className="flex items-center justify-center p-6" style={{ minHeight: '100vh' }}>
            <PageContainer maxWidth="sm">
                <div className="text-center" style={{ marginBottom: 'var(--space-8)' }}>
                    <Image
                        src="/icon.png"
                        alt="HD Homey"
                        width={64}
                        height={64}
                        className="rounded-lg"
                    />
                    <h1 className="mb-2" style={{ marginTop: 'var(--space-4)' }}>
                        Sign In
                    </h1>
                    <p className="text-secondary text-base">
                        Welcome back to HD Homey
                    </p>
                </div>

                <Card>
                    <form onSubmit={handleSubmit}>
                        {error && (
                            <div role="alert" className="rounded p-4 mb-4" style={{
                                backgroundColor: 'var(--color-error-bg)',
                                border: '1px solid var(--color-error)',
                                color: 'var(--color-error)',
                            }}>
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

                <p className="mt-5 text-center text-sm text-tertiary">
                    Need help? Contact your administrator.
                </p>
            </PageContainer>
        </main>
    );
}
