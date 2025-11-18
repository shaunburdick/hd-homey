'use client';

import { useActionState } from 'react';
import { Button, Card } from '@/components';
import type { FormState } from '@/lib/actions/settings';

interface StreamSecretManagerProps {
    secretPreview: string;
    regenerateAction: (state: FormState, formData: FormData) => Promise<FormState>;
}

const initialState: FormState = { errors: {} };

export default function StreamSecretManager({
    secretPreview,
    regenerateAction
}: StreamSecretManagerProps) {
    const [state, action, pending] = useActionState(regenerateAction, initialState);

    return (
        <Card>
            <p style={{ marginTop: 0 }}>
                The stream secret is used to sign all stream URLs. Regenerating this secret
                will invalidate all existing stream URLs immediately.
            </p>

            <div style={{ marginBottom: 'var(--space-4)' }}>
                <label style={{
                    display: 'block',
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-secondary)',
                    marginBottom: 'var(--space-2)',
                }}>
                    Current Secret
                </label>
                <code style={{
                    display: 'block',
                    padding: 'var(--space-3)',
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderRadius: 'var(--radius-md)',
                    fontFamily: 'monospace',
                    fontSize: 'var(--font-size-sm)',
                }}>
                    {secretPreview}
                </code>
            </div>

            {state.success && (
                <div style={{
                    padding: 'var(--space-3)',
                    backgroundColor: 'var(--color-success-bg)',
                    border: '1px solid var(--color-success)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-success)',
                    marginBottom: 'var(--space-4)',
                }}>
                    ✓ Stream secret regenerated successfully
                </div>
            )}

            {state.errors.form && (
                <div style={{
                    padding: 'var(--space-3)',
                    backgroundColor: 'var(--color-error-bg)',
                    border: '1px solid var(--color-error)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-error)',
                    marginBottom: 'var(--space-4)',
                }}>
                    {state.errors.form.join(', ')}
                </div>
            )}

            {state.errors.auth && (
                <div style={{
                    padding: 'var(--space-3)',
                    backgroundColor: 'var(--color-error-bg)',
                    border: '1px solid var(--color-error)',
                    borderRadius: 'var(--radius-md)',
                    color: 'var(--color-error)',
                    marginBottom: 'var(--space-4)',
                }}>
                    {state.errors.auth.join(', ')}
                </div>
            )}

            <form action={action}>
                <Button type="submit" variant="danger" loading={pending} disabled={pending}>
                    {pending ? 'Regenerating...' : '🔄 Regenerate Stream Secret'}
                </Button>
            </form>

            <details style={{ marginTop: 'var(--space-4)' }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'var(--font-weight-medium)' }}>
                    What happens when I regenerate?
                </summary>
                <ul style={{
                    marginTop: 'var(--space-3)',
                    fontSize: 'var(--font-size-sm)',
                    color: 'var(--color-text-secondary)',
                }}>
                    <li>A new random 64-character secret is generated</li>
                    <li>The new secret is stored in the database</li>
                    <li>All existing stream URLs become invalid immediately</li>
                    <li>Users must visit channel pages again to get new URLs</li>
                    <li>This does not affect user authentication</li>
                </ul>
            </details>
        </Card>
    );
}
