'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { redeemInvitation, type RedeemFormState } from './actions';
import { Input, Button, FormErrors } from '@/components';

const initialState: RedeemFormState = { errors: {} };

interface RedemptionFormProps {
    token: string;
}

export default function RedemptionForm({ token }: RedemptionFormProps) {
    const [state, formAction, isPending] = useActionState(
        async (prevState: RedeemFormState, formData: FormData) => {
            try {
                const result = await redeemInvitation(token, prevState, formData);
                return result;
            } catch (error) {
                if (isRedirectError(error)) {
                    throw error; // Re-throw to let Next.js handle redirect
                }
                return {
                    errors: {
                        form: ['An unexpected error occurred. Please try again.']
                    }
                };
            }
        },
        initialState
    );

    return (
        <div>
            <h2>Create Account</h2>
            <p
                style={{
                    marginBottom: 'var(--space-4)',
                    color: 'var(--color-text-secondary)',
                    fontSize: '0.875rem',
                }}
            >
                Choose a username and password to create your account.
            </p>

            <FormErrors
                errors={
                    state.errors.form !== undefined
                        ? { form: state.errors.form }
                        : undefined
                }
            />

            {state.errors.invitation !== undefined && (
                <div
                    style={{
                        padding: 'var(--space-4)',
                        backgroundColor: 'var(--color-error-bg)',
                        border: '1px solid var(--color-error)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-4)',
                    }}
                >
                    <p style={{ margin: 0, color: 'var(--color-error)' }}>
                        {state.errors.invitation[0]}
                    </p>
                </div>
            )}

            <form action={formAction}>
                <Input
                    label="Display Name"
                    name="name"
                    type="text"
                    required
                    autoComplete="name"
                    placeholder="Enter your display name"
                    error={state.errors.name?.[0]}
                    disabled={isPending}
                    helpText="Your name as it will appear in the app"
                />

                <Input
                    label="Username"
                    name="username"
                    type="text"
                    required
                    autoComplete="username"
                    placeholder="Enter your username"
                    error={state.errors.username?.[0]}
                    disabled={isPending}
                    helpText="Choose a unique username for your account"
                />

                <Input
                    label="Password"
                    name="password"
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="Enter a strong password"
                    error={state.errors.password?.[0]}
                    disabled={isPending}
                    helpText="Minimum 8 characters"
                />

                <Input
                    label="Confirm Password"
                    name="passwordConfirm"
                    type="password"
                    required
                    autoComplete="new-password"
                    placeholder="Re-enter your password"
                    error={state.errors.passwordConfirm?.[0]}
                    disabled={isPending}
                />

                <Button type="submit" disabled={isPending}>
                    {isPending ? 'Creating Account...' : 'Create Account'}
                </Button>
            </form>

            <p
                style={{
                    marginTop: 'var(--space-4)',
                    fontSize: '0.875rem',
                    color: 'var(--color-text-secondary)',
                    textAlign: 'center',
                }}
            >
                Already have an account?{' '}
                <Link
                    href="/users/signin"
                    style={{ color: 'var(--color-primary)' }}
                >
                    Sign in
                </Link>
            </p>
        </div>
    );
}
