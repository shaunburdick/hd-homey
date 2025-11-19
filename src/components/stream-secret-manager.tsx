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

    // Style constants to avoid duplication
    const spaceThree = 'var(--space-3)';
    const spaceFour = 'var(--space-4)';
    const radiusMd = 'var(--radius-md)';
    const fontSizeSm = 'var(--font-size-sm)';

    return (
        <Card>
            <p style={{ marginTop: 0 }}>
                The stream secret is used to sign all stream URLs. Regenerating this secret
                will invalidate all existing stream URLs immediately.
            </p>

            <div style={{ marginBottom: spaceFour }}>
                <label htmlFor="stream-secret-preview" style={{
                    display: 'block',
                    fontSize: fontSizeSm,
                    fontWeight: 'var(--font-weight-semibold)',
                    color: 'var(--color-text-secondary)',
                    marginBottom: 'var(--space-2)',
                }}>
                    Current Secret
                </label>
                <code id="stream-secret-preview" style={{
                    display: 'block',
                    padding: spaceThree,
                    backgroundColor: 'var(--color-bg-tertiary)',
                    borderRadius: radiusMd,
                    fontFamily: 'monospace',
                    fontSize: fontSizeSm,
                }}>
                    {secretPreview}
                </code>
            </div>

            {state.success && (
                <div style={{
                    padding: spaceThree,
                    backgroundColor: 'var(--color-success-bg)',
                    border: '1px solid var(--color-success)',
                    borderRadius: radiusMd,
                    color: 'var(--color-success)',
                    marginBottom: spaceFour,
                }}>
                    ✓ Stream secret regenerated successfully
                </div>
            )}

            {state.errors.form && (
                <div style={{
                    padding: spaceThree,
                    backgroundColor: 'var(--color-error-bg)',
                    border: '1px solid var(--color-error)',
                    borderRadius: radiusMd,
                    color: 'var(--color-error)',
                    marginBottom: spaceFour,
                }}>
                    {state.errors.form.join(', ')}
                </div>
            )}

            {state.errors.auth && (
                <div style={{
                    padding: spaceThree,
                    backgroundColor: 'var(--color-error-bg)',
                    border: '1px solid var(--color-error)',
                    borderRadius: radiusMd,
                    color: 'var(--color-error)',
                    marginBottom: spaceFour,
                }}>
                    {state.errors.auth.join(', ')}
                </div>
            )}

            <form action={action}>
                <Button type="submit" variant="danger" loading={pending} disabled={pending}>
                    {pending ? 'Regenerating...' : '🔄 Regenerate Stream Secret'}
                </Button>
            </form>

            <details style={{ marginTop: spaceFour }}>
                <summary style={{ cursor: 'pointer', fontWeight: 'var(--font-weight-medium)' }}>
                    What happens when I regenerate?
                </summary>
                <ul style={{
                    marginTop: spaceThree,
                    fontSize: fontSizeSm,
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
