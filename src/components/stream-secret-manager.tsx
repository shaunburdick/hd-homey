'use client';

import { useActionState } from 'react';
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
        <section>
            <p>
                The stream secret is used to sign all stream URLs. Regenerating this secret
                will invalidate all existing stream URLs immediately.
            </p>

            <dl>
                <dt>Current Secret</dt>
                <dd><code>{secretPreview}</code></dd>
            </dl>

            {state.success && (
                <p style={{ color: 'green' }}>✓ Stream secret regenerated successfully</p>
            )}

            {state.errors.form && (
                <p style={{ color: 'red' }}>{state.errors.form.join(', ')}</p>
            )}

            {state.errors.auth && (
                <p style={{ color: 'red' }}>{state.errors.auth.join(', ')}</p>
            )}

            <form action={action}>
                <button type="submit" disabled={pending}>
                    {pending ? 'Regenerating...' : 'Regenerate Stream Secret'}
                </button>
            </form>

            <details>
                <summary>What happens when I regenerate?</summary>
                <ul>
                    <li>A new random 64-character secret is generated</li>
                    <li>The new secret is stored in the database</li>
                    <li>All existing stream URLs become invalid immediately</li>
                    <li>Users must visit channel pages again to get new URLs</li>
                    <li>This does not affect user authentication</li>
                </ul>
            </details>
        </section>
    );
}
