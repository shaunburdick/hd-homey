'use client';

import { useActionState, useState } from 'react';
import { Input, Button, FormErrors } from '@/components';
import {
    createInvitation,
    type InvitationFormState
} from '@/lib/actions/invitations';

/** Duration (ms) to show the "Copied!" feedback label before reverting. */
const COPY_FEEDBACK_DURATION_MS = 2000;

/** Maximum character length allowed for the invitation note field. */
const INVITATION_NOTE_MAX_LENGTH = 200;

const initialState: InvitationFormState = { errors: {} };

/**
 * Handles copying the invitation URL to the clipboard, showing temporary feedback.
 * Extracted to module scope to satisfy unicorn/consistent-function-scoping.
 */
async function copyInvitationUrl(
    url: string,
    setCopied: (value: boolean) => void
): Promise<void> {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), COPY_FEEDBACK_DURATION_MS);
}

/**
 * Reloads the page to reset the invitation form after a successful creation.
 * Extracted to module scope to satisfy unicorn/consistent-function-scoping.
 */
function reloadPage(): void {
    window.location.reload();
}

/** Read-only URL display with a copy button. */
function InvitationUrlField({ url }: { url: string }) {
    const [copied, setCopied] = useState(false);

    const handleCopyLink = async () => {
        await copyInvitationUrl(url, setCopied);
    };

    return (
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
                value={url}
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
                onClick={(clickEvent) =>
                    (clickEvent.target as HTMLInputElement).select()
                }
            />
            <Button type="button" onClick={handleCopyLink} variant="secondary">
                {copied ? '✓ Copied!' : 'Copy'}
            </Button>
        </div>
    );
}

/** Displays the created invitation URL and copy/reset controls. */
function InvitationSuccess({ url }: { url: string }) {
    return (
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
            <InvitationUrlField url={url} />
            <p style={{ fontSize: '0.9em', color: 'var(--color-text-secondary)', marginBottom: 0 }}>
                This invitation will expire in 30 days.
            </p>
            <Button
                type="button"
                onClick={reloadPage}
                variant="secondary"
                style={{ marginTop: 'var(--space-3)' }}
            >
                Create Another Invitation
            </Button>
        </div>
    );
}

/** Role validation error message shown below the role select. */
function RoleError({ message }: { message: string }) {
    return (
        <div style={{ color: 'var(--color-error)', fontSize: '0.875rem', marginTop: 'var(--space-1)' }}>
            {message}
        </div>
    );
}

/** Role select field with validation error display. */
function RoleSelect({
    isPending,
    errorMessage,
}: {
    isPending: boolean;
    errorMessage: string | undefined;
}) {
    return (
        <div style={{ marginBottom: 'var(--space-4)' }}>
            <label
                htmlFor="role"
                style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 500 }}
            >
                Role{' '}
                <span style={{ color: 'var(--color-error)' }}>*</span>
            </label>
            <select
                id="role"
                name="role"
                required
                disabled={isPending}
                style={{
                    width: '100%',
                    padding: 'var(--space-2)',
                    border: errorMessage !== undefined
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
            {errorMessage !== undefined && <RoleError message={errorMessage} />}
        </div>
    );
}

/** The invitation creation form (shown when no invitation has been created yet). */
function InvitationCreateForm({
    state,
    formAction,
    isPending,
}: {
    state: InvitationFormState;
    formAction: (formData: FormData) => void;
    isPending: boolean;
}) {
    return (
        <form action={formAction}>
            <RoleSelect
                isPending={isPending}
                errorMessage={state.errors.role?.[0]}
            />

            <Input
                label="Note (optional)"
                name="note"
                type="text"
                placeholder="e.g., For John from marketing"
                maxLength={INVITATION_NOTE_MAX_LENGTH}
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
    );
}

export default function InvitationForm() {
    const [state, formAction, isPending] = useActionState(
        createInvitation,
        initialState
    );

    return (
        <div>
            <h2>Create Invitation</h2>
            <p style={{ marginBottom: 'var(--space-4)', color: 'var(--color-text-secondary)' }}>
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
                <InvitationSuccess url={state.invitation.url} />
            ) : (
                <InvitationCreateForm
                    state={state}
                    formAction={formAction}
                    isPending={isPending}
                />
            )}
        </div>
    );
}
