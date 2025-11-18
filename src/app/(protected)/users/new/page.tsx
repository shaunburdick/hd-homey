'use client';

import { useActionState } from 'react';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import Link from 'next/link';
import { Input, Button, Card } from '@/components';
import { createUser } from '@/lib/actions/users';
import { AuthRoles } from '@/lib/auth-roles';

interface ValidationError {
    path: string;
    message: string;
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
        ? state.reduce((acc: Record<string, string[]>, err: ValidationError) => {
            if (!acc[err.path]) {
                acc[err.path] = [];
            }
            acc[err.path].push(err.message);
            return acc;
        }, {})
        : undefined;

    return (
        <div className="container" style={{ maxWidth: '700px' }}>
            <div style={{ marginBottom: 'var(--space-6)' }}>
                <Link
                    href="/users"
                    style={{
                        color: 'var(--color-text-secondary)',
                        textDecoration: 'none',
                        fontSize: 'var(--font-size-sm)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        marginBottom: 'var(--space-4)',
                    }}
                >
                    ← Back to Users
                </Link>
                <h1 style={{ marginBottom: 'var(--space-2)' }}>Add New User</h1>
                <p style={{ color: 'var(--color-text-secondary)', marginBottom: 0 }}>
                    Create a new user account with admin or viewer permissions
                </p>
            </div>

            <Card>
                <form action={handleSubmit}>
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

                    <div style={{ marginBottom: 'var(--space-4)' }}>
                        <label
                            htmlFor="role"
                            style={{
                                display: 'block',
                                fontSize: 'var(--font-size-sm)',
                                fontWeight: 'var(--font-weight-medium)',
                                color: 'var(--color-text-primary)',
                                marginBottom: 'var(--space-2)',
                            }}
                        >
                            Role <span style={{ color: 'var(--color-error)' }}>*</span>
                        </label>
                        <select
                            id="role"
                            name='role'
                            required
                            disabled={isPending}
                            style={{
                                width: '100%',
                                minHeight: 'var(--input-height)',
                                padding: 'var(--space-3)',
                                backgroundColor: 'var(--color-bg-secondary)',
                                color: 'var(--color-text-primary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                fontSize: 'var(--font-size-base)',
                            }}
                        >
                            <option value={AuthRoles.Viewer}>👤 Viewer - View-only access</option>
                            <option value={AuthRoles.Admin}>👑 Admin - Full access</option>
                        </select>
                        <p style={{
                            marginTop: 'var(--space-1)',
                            fontSize: 'var(--font-size-xs)',
                            color: 'var(--color-text-tertiary)',
                            marginBottom: 0,
                        }}>
                            Admins can manage tuners and users
                        </p>
                    </div>

                    <div style={{
                        marginTop: 'var(--space-6)',
                        display: 'flex',
                        gap: 'var(--space-3)',
                    }}>
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

            <div style={{
                marginTop: 'var(--space-5)',
                padding: 'var(--space-4)',
                backgroundColor: 'var(--color-info-bg)',
                border: '1px solid var(--color-info)',
                borderRadius: 'var(--radius-md)',
            }}>
                <h3 style={{
                    marginTop: 0,
                    marginBottom: 'var(--space-2)',
                    fontSize: 'var(--font-size-base)',
                    color: 'var(--color-info)',
                }}>
                    💡 About User Roles
                </h3>
                <ul style={{
                    marginBottom: 0,
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)',
                }}>
                    <li><strong>Admins</strong> can add/edit tuners, manage channels, and create users</li>
                    <li><strong>Viewers</strong> can only view and stream available channels</li>
                </ul>
            </div>
        </div>
    );
}
