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
            <p className="mt-0">
                The stream secret is used to sign all stream URLs. Regenerating this secret
                will invalidate all existing stream URLs immediately.
            </p>

            <div className="mb-4">
                <label
                    htmlFor="stream-secret-preview"
                    className="block text-sm font-semibold text-secondary mb-2"
                >
                    Current Secret
                </label>
                <code
                    id="stream-secret-preview"
                    className="block p-3 rounded text-sm"
                    style={{
                        backgroundColor: 'var(--color-bg-tertiary)',
                        fontFamily: 'monospace',
                    }}
                >
                    {secretPreview}
                </code>
            </div>

            {state.success && (
                <div className="p-3 rounded mb-4 bg-success">
                    ✓ Stream secret regenerated successfully
                </div>
            )}

            {state.errors.form && (
                <div className="p-3 rounded mb-4 bg-error">
                    {state.errors.form.join(', ')}
                </div>
            )}

            {state.errors.auth && (
                <div className="p-3 rounded mb-4 bg-error">
                    {state.errors.auth.join(', ')}
                </div>
            )}

            <form action={action}>
                <Button type="submit" variant="danger" loading={pending} disabled={pending}>
                    {pending ? 'Regenerating...' : '🔄 Regenerate Stream Secret'}
                </Button>
            </form>

            <details className="mt-4">
                <summary style={{ cursor: 'pointer' }} className="font-medium">
                    What happens when I regenerate?
                </summary>
                <ul className="mt-3 text-sm text-secondary">
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
