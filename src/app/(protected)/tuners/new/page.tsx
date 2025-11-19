'use client';

import { useActionState } from 'react';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import Link from 'next/link';
import { createTuner } from '../actions';
import { Input, Button, Card } from '@/components';
import { PageContainer } from '@/components/layouts';

interface ValidationError {
    path: string;
    message: string;
}

export default function NewTunerPage() {
    const [state, formAction, isPending] = useActionState(createTuner, null);

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
        <PageContainer maxWidth="md">
            <div className="mb-6">
                <Link
                    href="/tuners"
                    className="text-secondary no-underline text-sm inline-flex items-center gap-2 mb-4"
                >
                    ← Back to Tuners
                </Link>
                <h1 className="mb-2">Add New Tuner</h1>
                <p className="text-secondary m-0">
                    Connect a new HDHomeRun device to stream live TV
                </p>
            </div>

            <Card>
                <form action={handleSubmit}>
                    {errors && (
                        <div role="alert" className="rounded p-4 mb-4" style={{
                            backgroundColor: 'var(--color-error-bg)',
                            border: '1px solid var(--color-error)',
                        }}>
                            <strong style={{ color: 'var(--color-error)' }}>
                                Please fix the following errors:
                            </strong>
                            <ul className="mt-2 m-0" style={{
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
                        label="Tuner Name"
                        name="name"
                        type="text"
                        required
                        placeholder="Living Room HDHomeRun"
                        helpText="A friendly name to identify this tuner"
                        error={errors?.name?.[0]}
                        disabled={isPending}
                    />

                    <Input
                        label="Tuner URL"
                        name="path"
                        type="url"
                        required
                        placeholder="http://192.168.1.100"
                        helpText="The IP address or hostname of your HDHomeRun device"
                        error={errors?.path?.[0]}
                        disabled={isPending}
                    />

                    <div className="mt-6 flex gap-3">
                        <Button type="submit" loading={isPending} disabled={isPending}>
                            {isPending ? 'Adding Tuner...' : 'Add Tuner'}
                        </Button>
                        <Link href="/tuners">
                            <Button type="button" variant="secondary" disabled={isPending}>
                                Cancel
                            </Button>
                        </Link>
                    </div>
                </form>
            </Card>

            <div className="mt-5 p-4 rounded" style={{
                backgroundColor: 'var(--color-info-bg)',
                border: '1px solid var(--color-info)',
            }}>
                <h3 className="mt-0 mb-2 text-base" style={{ color: 'var(--color-info)' }}>
                    💡 How to find your tuner
                </h3>
                <ul className="m-0 text-sm text-secondary">
                    <li>Check your router's DHCP client list</li>
                    <li>Use the HDHomeRun app to discover devices</li>
                    <li>Look for devices named "HDHomeRun-XXXXXXX"</li>
                </ul>
            </div>
        </PageContainer>
    );
}
