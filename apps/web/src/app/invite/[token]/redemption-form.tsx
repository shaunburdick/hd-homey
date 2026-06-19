'use client';

import { useActionState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { redeemInvitation } from './actions';
import type { RedeemFormState } from './actions';
import { Input, Button, FormErrors } from '@/components';

const initialState: RedeemFormState = { errors: {} };

interface RedemptionFormProps {
    token: string;
}

/**
 * Render the invitation error alert if there is an invitation-level error.
 */
function InvitationErrorAlert({ message }: { message: string | undefined }) {
    if (message === undefined) {
        return null;
    }

    return (
        <div
            style={{
                padding: 'var(--space-4)',
                backgroundColor: 'var(--color-error-bg)',
                border: '1px solid var(--color-error)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-4)',
            }}
        >
            <p style={{ margin: 0, color: 'var(--color-error)' }}>{message}</p>
        </div>
    );
}

interface PasswordFieldsProps {
    passwordError: string | undefined;
    confirmError: string | undefined;
    isPending: boolean;
}

/**
 * Render the password and confirm-password input fields.
 */
function PasswordFields({ passwordError, confirmError, isPending }: PasswordFieldsProps) {
    return (
        <>
            <Input
                label="Password"
                name="password"
                type="password"
                required
                autoComplete="new-password"
                placeholder="Enter a strong password"
                error={passwordError}
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
                error={confirmError}
                disabled={isPending}
            />
        </>
    );
}

interface AccountFormFieldsProps {
    state: RedeemFormState;
    isPending: boolean;
}

/**
 * Render the full account creation form fields.
 */
function AccountFormFields({ state, isPending }: AccountFormFieldsProps) {
    return (
        <>
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
                defaultValue={state.values?.name}
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
                defaultValue={state.values?.username}
            />
            <PasswordFields
                passwordError={state.errors.password?.[0]}
                confirmError={state.errors.passwordConfirm?.[0]}
                isPending={isPending}
            />
        </>
    );
}

/**
 * Build the form action for useActionState, capturing the token via closure.
 */
function buildFormAction(token: string) {
    return async (prevState: RedeemFormState, formData: FormData): Promise<RedeemFormState> => {
        try {
            return await redeemInvitation(token, formData);
        } catch (error) {
            if (isRedirectError(error)) {
                throw error;
            }
            return {
                ...prevState,
                errors: { form: ['An unexpected error occurred. Please try again.'] }
            };
        }
    };
}

export default function RedemptionForm({ token }: RedemptionFormProps) {
    const router = useRouter();
    const [state, formAction, isPending] = useActionState(buildFormAction(token), initialState);

    useEffect(() => {
        if (state.success) {
            router.push('/users/signin?created=true');
        }
    }, [state.success, router]);

    return (
        <div>
            <h2>Create Account</h2>
            <p style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>
                Choose a username and password to create your account.
            </p>
            <FormErrors errors={state.errors.form !== undefined ? { form: state.errors.form } : undefined} />
            <InvitationErrorAlert message={state.errors.invitation?.[0]} />
            <form action={formAction}>
                <AccountFormFields state={state} isPending={isPending} />
                <Button type="submit" disabled={isPending}>
                    {isPending ? 'Creating Account...' : 'Create Account'}
                </Button>
            </form>
            <p style={{
                marginTop: 'var(--space-4)',
                fontSize: '0.875rem',
                color: 'var(--color-text-secondary)',
                textAlign: 'center',
            }}>
                Already have an account?{' '}
                <Link href="/users/signin" style={{ color: 'var(--color-accent)' }}>Sign in</Link>
            </p>
        </div>
    );
}
