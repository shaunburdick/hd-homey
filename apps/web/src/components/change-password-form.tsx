'use client';

import { useActionState, useTransition } from 'react';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import { Input, Button, FormErrors } from '@/components';
import { changePassword, type FormState } from '@/lib/actions/profile';

const initialState: FormState = { errors: {} };

interface ChangePasswordFormProps {
    userId: string;
}

/** Displays a success banner after the password has been changed successfully. */
function PasswordChangeSuccess() {
    return (
        <div
            style={{
                padding: 'var(--space-3)',
                backgroundColor: 'var(--color-success-bg)',
                border: '1px solid var(--color-success)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-4)',
                color: 'var(--color-success)',
            }}
        >
            ✓ Password changed successfully
        </div>
    );
}

/** Renders the three password input fields needed for the change-password flow. */
function PasswordFields({ errors }: { errors: FormState['errors'] }) {
    return (
        <>
            <Input
                label="Current Password"
                name="currentPassword"
                type="password"
                required
                error={errors.currentPassword?.[0]}
                autoComplete="current-password"
            />

            <Input
                label="New Password"
                name="newPassword"
                type="password"
                required
                error={errors.newPassword?.[0]}
                helpText="Must be at least 8 characters"
                autoComplete="new-password"
            />

            <Input
                label="Confirm New Password"
                name="confirmPassword"
                type="password"
                required
                error={errors.confirmPassword?.[0]}
                autoComplete="new-password"
            />
        </>
    );
}

export default function ChangePasswordForm({ userId }: ChangePasswordFormProps) {
    const [state, formAction] = useActionState(changePassword, initialState);
    const [isPending, startTransition] = useTransition();

    const handleSubmit = async (formData: FormData) => {
        startTransition(async () => {
            try {
                await formAction(formData);
            } catch (error) {
                if (isRedirectError(error)) {
                    throw error;
                }
            }
        });
    };

    return (
        <form action={handleSubmit}>
            <input type="hidden" name="userId" value={userId} />

            <FormErrors errors={state.errors._form !== undefined ? { _form: state.errors._form } : undefined} />

            {state.success && <PasswordChangeSuccess />}

            <PasswordFields errors={state.errors} />

            <Button
                type="submit"
                disabled={isPending}
                loading={isPending}
            >
                {isPending ? 'Changing Password...' : 'Change Password'}
            </Button>
        </form>
    );
}
