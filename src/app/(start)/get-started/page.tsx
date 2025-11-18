'use client';

import { useActionState } from 'react';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { createFirstUser } from './actions';
import { Input, Button, Card } from '@/components';

interface ValidationError {
    path: string;
    message: string;
}

export default function GetStarted() {
    const [state, formAction, isPending] = useActionState(createFirstUser, null);

    const handleSubmit = async (formData: FormData) => {
        try {
            await formAction(formData);
        } catch (error) {
            if (isRedirectError(error)) {
                throw error;
            }
        }
    };

    const errors = state && Array.isArray(state)
        ? state.reduce((acc: Record<string, string[]>, err: ValidationError) => {
            if (!acc[err.path]) {
                acc[err.path] = [];
            }
            acc[err.path].push(err.message);
            return acc;
        }, {})
        : undefined;

    return (
        <main style={{ maxWidth: '600px', margin: '0 auto', padding: 'var(--space-6)' }}>
            <div style={{ textAlign: 'center', marginBottom: 'var(--space-8)' }}>
                <h1>Welcome to HD Homey!</h1>
                <p style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-secondary)' }}>
                    Let's get started by creating your admin account.
                </p>
            </div>

            <Card>
                <form action={handleSubmit}>
                    <h2 style={{ marginTop: 0 }}>Create Admin Account</h2>

                    <p style={{
                        color: 'var(--color-text-secondary)',
                        fontSize: 'var(--font-size-sm)',
                        marginBottom: 'var(--space-5)',
                    }}>
                        This will be the primary administrator account with full access
                        to manage tuners, channels, and users.
                    </p>

                    {errors && (
                        <div
                            role="alert"
                            style={{
                                backgroundColor: 'var(--color-error-bg)',
                                border: '1px solid var(--color-error)',
                                borderRadius: 'var(--radius-md)',
                                padding: 'var(--space-4)',
                                marginBottom: 'var(--space-4)',
                            }}
                        >
                            <strong style={{ color: 'var(--color-error)' }}>
                                Please fix the following errors:
                            </strong>
                            <ul style={{
                                marginTop: 'var(--space-2)',
                                marginBottom: 0,
                                paddingLeft: 'var(--space-5)',
                                color: 'var(--color-error)',
                            }}>
                                {Object.entries(errors).map(([field, messages]) =>
                                    messages.map((message, idx) => (
                                        <li key={`${field}-${idx}`}>
                                            <strong>{field}:</strong> {message}
                                        </li>
                                    )))}
                            </ul>
                        </div>
                    )}

                    <Input
                        label="Username"
                        name="username"
                        type="text"
                        required
                        autoComplete="username"
                        helpText="This will be used to sign in"
                        error={errors?.username?.[0]}
                        disabled={isPending}
                    />

                    <Input
                        label="Display Name"
                        name="name"
                        type="text"
                        required
                        autoComplete="name"
                        helpText="Your full name or preferred display name"
                        error={errors?.name?.[0]}
                        disabled={isPending}
                    />

                    <Input
                        label="Password"
                        name="password"
                        type="password"
                        required
                        autoComplete="new-password"
                        helpText="Choose a strong password"
                        showPasswordToggle
                        error={errors?.password?.[0]}
                        disabled={isPending}
                    />

                    <div style={{ marginTop: 'var(--space-6)' }}>
                        <Button type="submit" loading={isPending} disabled={isPending}>
                            {isPending ? 'Creating Account...' : 'Create Admin Account'}
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
                🔒 This account will have full administrative access to HD Homey
            </p>
        </main>
    );
}
