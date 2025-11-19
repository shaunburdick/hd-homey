'use client';

import { useActionState } from 'react';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import Link from 'next/link';
import { updateTuner } from '../../actions';
import { Input, Button, Card } from '@/components';
import { PageContainer, InfoCard } from '@/components/layouts';
import type { Tuner } from '@/lib/database/schema';

interface ValidationError {
    path: string;
    message: string;
}

export default function EditTunerForm({ tuner }: { tuner: Tuner }) {
    const [state, formAction, isPending] = useActionState(updateTuner, null);

    const handleSubmit = async (formData: FormData) => {
        formData.append('id', tuner.id.toString());
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
        <PageContainer maxWidth="lg">
            <div className="mb-6">
                <Link
                    href={`/tuners/${tuner.id}`}
                    className="text-secondary no-underline text-sm inline-flex items-center gap-2 mb-4"
                >
                    ← Back to Tuner
                </Link>
                <h1 className="mb-2">Edit Tuner: {tuner.name}</h1>
                <p className="text-secondary m-0">
                    Update tuner settings and configuration
                </p>
            </div>

            <div className="grid gap-5">
                <Card>
                    <h2 className="mt-0 mb-4">Tuner Settings</h2>
                    <form action={handleSubmit}>
                        {errors && (
                            <div
                                role="alert"
                                className="rounded p-4 mb-4"
                                style={{
                                    backgroundColor: 'var(--color-error-bg)',
                                    border: '1px solid var(--color-error)',
                                }}
                            >
                                <strong style={{ color: 'var(--color-error)' }}>
                                    Please fix the following errors:
                                </strong>
                                <ul
                                    className="mt-2 m-0"
                                    style={{
                                        paddingLeft: 'var(--space-5)',
                                        color: 'var(--color-error)',
                                    }}
                                >
                                    {Object.entries(errors).map(([field, messages]) =>
                                        messages.map((message) => (
                                            <li key={`${field}-${message}`}>
                                                <strong>{field}:</strong>{' '}{message}
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
                            defaultValue={tuner.name}
                            helpText="A friendly name to identify this tuner"
                            error={errors?.name?.[0]}
                            disabled={isPending}
                        />

                        <Input
                            label="Path (URL)"
                            name="path"
                            type="url"
                            required
                            defaultValue={tuner.path}
                            placeholder="http://192.168.1.100"
                            helpText="The network address of your HDHomeRun device"
                            error={errors?.path?.[0]}
                            disabled={isPending}
                        />

                        <div className="form-group">
                            <label className="checkbox-label">
                                <input
                                    type="checkbox"
                                    name="is_active"
                                    defaultChecked={tuner.is_active}
                                    disabled={isPending}
                                />
                                <span>Active</span>
                            </label>
                            <small className="form-help block">
                                Inactive tuners will not be available for streaming
                            </small>
                        </div>

                        <div className="mt-6 flex gap-3">
                            <Button type="submit" loading={isPending} disabled={isPending}>
                                {isPending ? 'Updating...' : 'Update Tuner'}
                            </Button>
                            <Link href={`/tuners/${tuner.id}`}>
                                <Button type="button" variant="secondary" disabled={isPending}>
                                    Cancel
                                </Button>
                            </Link>
                        </div>
                    </form>
                </Card>

                <InfoCard
                    title="Tuner Information"
                    items={[
                        { label: 'ID', value: String(tuner.id) },
                        { label: 'Status', value: tuner.is_active ? 'Active' : 'Inactive' },
                        {
                            label: 'Last Scanned',
                            value: tuner.last_scanned
                                ? new Date(tuner.last_scanned).toLocaleString('en-US', {
                                    month: '2-digit',
                                    day: '2-digit',
                                    year: 'numeric',
                                    hour: 'numeric',
                                    minute: '2-digit',
                                    second: '2-digit',
                                    hour12: true
                                })
                                : 'Never'
                        },
                        {
                            label: 'Created',
                            value: new Date(tuner.created_at).toLocaleString('en-US', {
                                month: '2-digit',
                                day: '2-digit',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true
                            })
                        },
                        {
                            label: 'Last Modified',
                            value: new Date(tuner.modified_at).toLocaleString('en-US', {
                                month: '2-digit',
                                day: '2-digit',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                                second: '2-digit',
                                hour12: true
                            })
                        },
                    ]}
                />
            </div>
        </PageContainer>
    );
}
