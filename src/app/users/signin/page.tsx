'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { signIn } from 'next-auth/react';

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
                // Sign in successful, redirect to home
                router.push('/');
                router.refresh(); // Force refresh to update session
            }
        } catch {
            setError('An error occurred during sign in');
            setIsLoading(false);
        }
    };

    return (
        <main>
            <div>
                <h1>Sign In</h1>
                <form onSubmit={handleSubmit}>
                    <p>
                        <label>
                            Username
                            <input name="username" type="text" required disabled={isLoading} />
                        </label>
                    </p>
                    <p>
                        <label>
                            Password
                            <input name="password" type="password" required disabled={isLoading} />
                        </label>
                    </p>
                    {error && (
                        <p style={{ color: 'red' }}>
                            {error}
                        </p>
                    )}
                    <button type="submit" disabled={isLoading}>
                        {isLoading ? 'Signing In...' : 'Sign In'}
                    </button>
                </form>
            </div>
        </main>
    );
}
