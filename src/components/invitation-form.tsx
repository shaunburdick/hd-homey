'use client';

import { useActionState, useState } from 'react';
import { Input, Button, FormErrors } from '@/components';
import {
    createInvitation,
    type InvitationFormState
} from '@/lib/actions/invitations';

const initialState: InvitationFormState = { errors: {} };

export default function InvitationForm() {
    const [state, formAction, isPending] = useActionState(
        createInvitation,
        initialState
    );
    const [copied, setCopied] = useState(false);

    const handleCopyLink = async () => {
        if (state.invitation?.url !== undefined) {
            await navigator.clipboard.writeText(state.invitation.url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    // Reset form after successful creation
    const handleReset = () => {
        window.location.reload();
    };

    return (
        <div>
            <h2>Create Invitation</h2>
            <p
                style={{
                    marginBottom: 'var(--space-4)',
                    color: 'var(--color-text-secondary)'
                }}
            >
                Generate a secure invitation link to allow new users to create
                an account.
            </p>

            <FormErrors
                errors={
                    state.errors.form !== undefined
                        ? { form: state.errors.form }
                        : undefined
                }
            />

            {state.success && state.invitation !== undefined ? (
                <div
                    style={{
                        padding: 'var(--space-4)',
                        backgroundColor: 'var(--color-success-bg)',
                        border: '1px solid var(--color-success)',
                        borderRadius: 'var(--radius-md)',
                        marginBottom: 'var(--space-4)',
                    }}
                >
                    <h3 style={{ marginTop: 0, color: 'var(--color-success)' }}>
                        ✓ Invitation Created
                    </h3>
                    <p style={{ marginBottom: 'var(--space-3)' }}>
                        Share this link with the person you want to invite:
                    </p>
                    <div
                        style={{
                            display: 'flex',
                            gap: 'var(--space-2)',
                            alignItems: 'center',
                            marginBottom: 'var(--space-3)',
                        }}
                    >
                        <input
                            type="text"
                            value={state.invitation.url}
                            readOnly
                            style={{
                                flex: 1,
                                padding: 'var(--space-2)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)',
                                fontFamily: 'monospace',
                                fontSize: '0.9em',
                                backgroundColor: 'var(--color-bg-secondary)',
                            }}
                            onClick={(e) =>
                                (e.target as HTMLInputElement).select()
                            }
                        />
                        <Button
                            type="button"
                            onClick={handleCopyLink}
                            variant="secondary"
                        >
                            {copied ? '✓ Copied!' : 'Copy'}
                        </Button>
                    </div>
                    <p
                        style={{
                            fontSize: '0.9em',
                            color: 'var(--color-text-secondary)',
                            marginBottom: 0,
                        }}
                    >
                        This invitation will expire in 30 days.
                    </p>
                    <Button
                        type="button"
                        onClick={handleReset}
                        variant="secondary"
                        style={{ marginTop: 'var(--space-3)' }}
                    >
                        Create Another Invitation
                    </Button>
                </div>
            ) : (
                <form action={formAction}>
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                        <label
                            htmlFor="role"
                            style={{
                                display: 'block',
                                marginBottom: 'var(--space-2)',
                                fontWeight: 500,
                            }}
                        >
                            Role{' '}
                            <span style={{ color: 'var(--color-error)' }}>
                                *
                            </span>
                        </label>
                        <select
                            id="role"
                            name="role"
                            required
                            disabled={isPending}
                            style={{
                                width: '100%',
                                padding: 'var(--space-2)',
                                border:
                                    state.errors.role !== undefined
                                        ? '1px solid var(--color-error)'
                                        : '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: '1rem',
                            }}
                        >
                            <option value="">Select a role...</option>
                            <option value="viewer">Viewer</option>
                            <option value="admin">Admin</option>
                        </select>
                        {state.errors.role !== undefined && (
                            <div
                                style={{
                                    color: 'var(--color-error)',
                                    fontSize: '0.875rem',
                                    marginTop: 'var(--space-1)',
                                }}
                            >
                                {state.errors.role[0]}
                            </div>
                        )}
                    </div>

                    <Input
                        label="Note (optional)"
                        name="note"
                        type="text"
                        placeholder="e.g., For John from marketing"
                        maxLength={200}
                        helpText="Optional label to help you identify this invitation"
                        error={state.errors.note?.[0]}
                        disabled={isPending}
                    />

                    <FormErrors
                        errors={
                            state.errors.authorization !== undefined
                                ? { authorization: state.errors.authorization }
                                : undefined
                        }
                    />

                    <Button type="submit" disabled={isPending}>
                        {isPending ? 'Creating...' : 'Create Invitation'}
                    </Button>
                </form>
            )}
        </div>
    );
}
