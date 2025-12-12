'use client';

import { useActionState } from 'react';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { Input, Button } from '@/components';
import { updateUser } from '@/lib/actions/users';
import type { User } from '@/lib/auth/types';
import RoleGuard from '@/components/RoleGuard';
import { AuthRoles } from '@/lib/auth-roles';

interface UserEditFormProps {
    user: User;
}

interface ValidationError {
    path: string;
    message: string;
}

export default function UserEditForm({ user }: UserEditFormProps) {
    const [state, formAction, isPending] = useActionState(updateUser, null);

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
        <RoleGuard allowedRoles={[AuthRoles.Admin]}>
            <form action={handleSubmit}>
                <input type="hidden" name="id" value={user.id} />

                {errors && (
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
                )}

                <Input
                    label="Display Name"
                    name="name"
                    type="text"
                    defaultValue={user.name}
                    required
                    error={errors?.name?.[0]}
                    disabled={isPending}
                />

                <Input
                    label="New Password"
                    name="password"
                    type="password"
                    placeholder="Leave blank to keep current"
                    showPasswordToggle
                    helpText="Only enter a password if you want to change it"
                    error={errors?.password?.[0]}
                    disabled={isPending}
                />

                <div style={{ marginBottom: 'var(--space-4)' }}>
                    <label
                        htmlFor="is_active"
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-2)',
                            cursor: 'pointer',
                            fontSize: 'var(--font-size-base)',
                        }}
                    >
                        <input
                            id="is_active"
                            name="is_active"
                            type="checkbox"
                            value="true"
                            defaultChecked={user.isActive}
                            disabled={isPending}
                            style={{
                                width: '20px',
                                height: '20px',
                                cursor: 'pointer',
                            }}
                        />
                        <span>User is active</span>
                    </label>
                    <p style={{
                        marginTop: 'var(--space-1)',
                        marginLeft: 'calc(20px + var(--space-2))',
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-tertiary)',
                        marginBottom: 0,
                    }}>
                        Inactive users cannot sign in
                    </p>
                </div>

                <div style={{ marginTop: 'var(--space-6)' }}>
                    <Button type="submit" loading={isPending} disabled={isPending}>
                        {isPending ? 'Updating User...' : 'Update User'}
                    </Button>
                </div>
            </form>
        </RoleGuard>
    );
}
