'use client';

import { useActionState } from 'react';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import Link from 'next/link';
import { Input, Button, Card } from '@/components';
import { PageContainer } from '@/components/layouts';
import { createUser } from '@/lib/actions/users';
import { AuthRoles } from '@/lib/auth-roles';
import { buildErrorMap } from '@/lib/errors';

/** Renders a validation error list alert */
function ErrorAlert({ errors }: { errors: Record<string, string[]> }) {
    return (
        <div role="alert" className="rounded p-4 mb-4 bg-error">
            <strong>
                Please fix the following errors:
            </strong>
            <ul className="mt-2 m-0" style={{ paddingLeft: 'var(--space-5)' }}>
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

/** Renders the role select field with viewer and admin options */
function RoleSelect({ isPending }: { isPending: boolean }) {
    return (
        <div className="mb-4">
            <label htmlFor="role" className="block text-sm font-medium text-primary mb-2">
                Role <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <select
                id="role"
                name='role'
                required
                disabled={isPending}
                className="w-full text-base rounded"
                style={{
                    minHeight: 'var(--input-height)',
                    padding: 'var(--space-3)',
                    backgroundColor: 'var(--color-bg-secondary)',
                    color: 'var(--color-text-primary)',
                    border: '1px solid var(--color-border)',
                }}
            >
                <option value={AuthRoles.Viewer}>👤 Viewer - View-only access</option>
                <option value={AuthRoles.Admin}>👑 Admin - Full access</option>
            </select>
            <p className="mt-1 text-xs text-tertiary m-0">
                Admins can manage tuners and users
            </p>
        </div>
    );
}

interface CreateUserFormBodyProps {
    errors: Record<string, string[]> | undefined;
    isPending: boolean;
    handleSubmit: (formData: FormData) => Promise<void>;
}

/** Renders the create-user form body with inputs and action buttons */
function CreateUserFormBody({ errors, isPending, handleSubmit }: CreateUserFormBodyProps) {
    return (
        <Card>
            <form action={handleSubmit}>
                {errors && <ErrorAlert errors={errors} />}

                <Input
                    label="Username"
                    name="username"
                    type="text"
                    required
                    placeholder="johndoe"
                    helpText="Used for signing in"
                    error={errors?.username?.[0]}
                    disabled={isPending}
                />

                <Input
                    label="Display Name"
                    name="name"
                    type="text"
                    required
                    placeholder="John Doe"
                    helpText="Full name or preferred display name"
                    error={errors?.name?.[0]}
                    disabled={isPending}
                />

                <Input
                    label="Password"
                    name="password"
                    type="password"
                    required
                    showPasswordToggle
                    helpText="Choose a strong password"
                    error={errors?.password?.[0]}
                    disabled={isPending}
                />

                <RoleSelect isPending={isPending} />

                <div className="mt-6 flex gap-3">
                    <Button type="submit" loading={isPending} disabled={isPending}>
                        {isPending ? 'Creating User...' : 'Create User'}
                    </Button>
                    <Link href="/users">
                        <Button type="button" variant="secondary" disabled={isPending}>
                            Cancel
                        </Button>
                    </Link>
                </div>
            </form>
        </Card>
    );
}

export default function Page() {
    const [state, formAction, isPending] = useActionState(createUser, null);

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
        ? buildErrorMap(state)
        : undefined;

    return (
        <PageContainer maxWidth="md">
            <div className="mb-6">
                <Link href="/users" className="text-secondary no-underline text-sm inline-flex items-center gap-2 mb-4">
                    ← Back to Users
                </Link>
                <h1 className="mb-2">Add New User</h1>
                <p className="text-secondary m-0">
                    Create a new user account with admin or viewer permissions
                </p>
            </div>

            <CreateUserFormBody errors={errors} isPending={isPending} handleSubmit={handleSubmit} />

            <div className="mt-5 p-4 rounded" style={{
                backgroundColor: 'var(--color-info-bg)',
                border: '1px solid var(--color-info)',
            }}>
                <h3 className="mt-0 mb-2 text-base" style={{ color: 'var(--color-info)' }}>
                    💡 About User Roles
                </h3>
                <ul className="m-0 text-sm text-secondary">
                    <li><strong>Admins</strong> can add/edit tuners, manage channels, and create users</li>
                    <li><strong>Viewers</strong> can only view and stream available channels</li>
                </ul>
            </div>
        </PageContainer>
    );
}
