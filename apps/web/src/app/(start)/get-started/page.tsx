'use client';

import { useActionState } from 'react';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { createFirstUser } from './actions';
import { Input, Button, Card } from '@/components';
import { PageContainer } from '@/components/layouts';

interface ValidationError {
    path: string;
    message: string;
}

type FormErrors = Record<string, string[]> | undefined;

/**
 * Build a field-keyed errors map from the raw validation error array.
 */
function buildFieldErrors(state: unknown): FormErrors {
    if (!state || !Array.isArray(state)) {
        return undefined;
    }
    return state.reduce((accumulator: Record<string, string[]>, err: ValidationError) => {
        if (!accumulator[err.path]) {
            accumulator[err.path] = [];
        }
        accumulator[err.path].push(err.message);
        return accumulator;
    }, {});
}

/**
 * Render the global error summary from all validation errors.
 */
function ValidationErrorSummary({ errors }: { errors: FormErrors }) {
    if (!errors) {
        return null;
    }

    return (
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
            <strong style={{ color: 'var(--color-error)' }}>Please fix the following errors:</strong>
            <ul style={{
                marginTop: 'var(--space-2)',
                marginBottom: 0,
                paddingLeft: 'var(--space-5)',
                color: 'var(--color-error)',
            }}>
                {Object.entries(errors).map(([field, messages]) =>
                    messages.map((message) => (
                        <li key={`${field}-${message}`}>
                            <strong>{field}:</strong> {message}
                        </li>
                    )))}
            </ul>
        </div>
    );
}

interface AccountFormFieldsProps {
    errors: FormErrors;
    isPending: boolean;
}

/** Renders the account creation input fields. */
function AccountFormFields({ errors, isPending }: AccountFormFieldsProps) {
    return (
        <>
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
        </>
    );
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

    const errors = buildFieldErrors(state);

    return (
        <PageContainer maxWidth="md" className="p-6">
            <div className="text-center" style={{ marginBottom: 'var(--space-8)' }}>
                <h1>Welcome to HD Homey!</h1>
                <p className="text-lg text-secondary">Let&apos;s get started by creating your admin account.</p>
            </div>
            <Card>
                <form action={handleSubmit}>
                    <h2 className="mt-0">Create Admin Account</h2>
                    <p className="text-secondary text-sm mb-5">
                        This will be the primary administrator account with full access
                        to manage tuners, channels, and users.
                    </p>
                    <ValidationErrorSummary errors={errors} />
                    <AccountFormFields errors={errors} isPending={isPending} />
                    <div className="mt-6">
                        <Button type="submit" loading={isPending} disabled={isPending}>
                            {isPending ? 'Creating Account...' : 'Create Admin Account'}
                        </Button>
                    </div>
                </form>
            </Card>
            <p className="mt-5 text-center text-sm text-tertiary">
                🔒 This account will have full administrative access to HD Homey
            </p>
        </PageContainer>
    );
}
