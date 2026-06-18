'use client';

import { useActionState, useState, useTransition } from 'react';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import Link from 'next/link';
import { createTuner, validateTunerConnection, type ValidationResult } from '../actions';
import { Input, Button, Card } from '@/components';
import { PageContainer } from '@/components/layouts';

interface ValidationError {
    path: string;
    message: string;
}

/** Builds a field → messages map from an array of validation errors */
function buildErrorMap(errors: ValidationError[]): Record<string, string[]> {
    return errors.reduce((acc: Record<string, string[]>, err: ValidationError) => {
        if (!acc[err.path]) {
            acc[err.path] = [];
        }
        acc[err.path].push(err.message);
        return acc;
    }, {});
}

/** Displays a list of form validation errors */
function ErrorAlert({ errors }: { errors: Record<string, string[]> }) {
    return (
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
    );
}

/** Displays the result of a connection validation attempt */
function ValidationAlert({
    isValidating,
    validationState,
}: {
    isValidating: boolean;
    validationState: ValidationResult | null;
}) {
    if (isValidating) {
        return (
            <div
                role="status"
                className="rounded p-4 mb-4"
                style={{
                    backgroundColor: 'var(--color-info-bg)',
                    border: '1px solid var(--color-info)',
                }}
            >
                <div className="flex items-center gap-3">
                    <span className="spinner" aria-hidden="true" />
                    <strong style={{ color: 'var(--color-info)' }}>
                        Testing connection...
                    </strong>
                </div>
            </div>
        );
    }

    if (!validationState) {
        return null;
    }

    return (
        <div
            role="alert"
            className={`rounded p-4 mb-4 ${validationState.success ? 'bg-success' : 'bg-error'}`}
        >
            <strong>
                {validationState.success ? '✓ ' : '✗ '}
                {validationState.message}
            </strong>
            {validationState.error && (
                <p className="mt-2 mb-0 text-sm">
                    {validationState.error}
                </p>
            )}
        </div>
    );
}

interface TunerFormBodyProps {
    errors: Record<string, string[]> | undefined;
    isPending: boolean;
    isValidating: boolean;
    validationState: ValidationResult | null;
    pathValue: string;
    handleSubmit: (formData: FormData) => Promise<void>;
    handleTest: (e: React.MouseEvent<HTMLButtonElement>) => void;
    setPathValue: (value: string) => void;
}

/** Renders the submit, test connection, and cancel buttons for the add-tuner form */
function AddTunerActions({
    isPending,
    isValidating,
    pathValue,
    handleTest,
}: {
    isPending: boolean;
    isValidating: boolean;
    pathValue: string;
    handleTest: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
    return (
        <div className="mt-6 flex gap-3 flex-wrap">
            <Button type="submit" loading={isPending} disabled={isPending || isValidating}>
                {isPending ? 'Adding Tuner...' : 'Add Tuner'}
            </Button>
            <Button
                type="button"
                variant="secondary"
                onClick={handleTest}
                loading={isValidating}
                disabled={isPending || isValidating || !pathValue}
            >
                {isValidating ? 'Testing...' : 'Test Connection'}
            </Button>
            <Link href="/tuners">
                <Button type="button" variant="secondary" disabled={isPending || isValidating}>
                    Cancel
                </Button>
            </Link>
        </div>
    );
}

/** Renders the add-tuner form body with inputs, validation feedback, and action buttons */
function TunerFormBody({
    errors,
    isPending,
    isValidating,
    validationState,
    pathValue,
    handleSubmit,
    handleTest,
    setPathValue,
}: TunerFormBodyProps) {
    return (
        <Card>
            <form action={handleSubmit}>
                {errors && <ErrorAlert errors={errors} />}

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
                    value={pathValue}
                    onChange={(e) => setPathValue(e.target.value)}
                />

                <ValidationAlert isValidating={isValidating} validationState={validationState} />

                <AddTunerActions
                    isPending={isPending}
                    isValidating={isValidating}
                    pathValue={pathValue}
                    handleTest={handleTest}
                />
            </form>
        </Card>
    );
}

/** Renders the info box explaining how to find a tuner on the network */
function TunerDiscoveryTip() {
    return (
        <div className="mt-5 p-4 rounded bg-info">
            <h3 className="mt-0 mb-2 text-base">
                💡 How to find your tuner
            </h3>
            <ul className="m-0 text-sm text-secondary">
                <li>Check your router&apos;s DHCP client list</li>
                <li>Use the HDHomeRun app to discover devices</li>
                <li>Look for devices named &quot;HDHomeRun-XXXXXXX&quot;</li>
            </ul>
        </div>
    );
}

/** Renders the page title and back navigation for the add-new-tuner page */
function NewTunerPageHeader() {
    return (
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
    );
}

export default function NewTunerPage() {
    const [state, formAction, isPending] = useActionState(createTuner, null);
    const [validationState, validateAction] = useActionState<
        ValidationResult | null,
        FormData
    >(validateTunerConnection, null);
    const [isValidating, startTransition] = useTransition();
    const [pathValue, setPathValue] = useState('');

    const handleSubmit = async (formData: FormData) => {
        try {
            await formAction(formData);
        } catch (error) {
            if (isRedirectError(error)) {
                throw error;
            }
        }
    };

    const handleTest = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('path', pathValue);
        startTransition(() => {
            validateAction(formData);
        });
    };

    const errors = state && Array.isArray(state)
        ? buildErrorMap(state)
        : undefined;

    return (
        <PageContainer maxWidth="md">
            <NewTunerPageHeader />

            <TunerFormBody
                errors={errors}
                isPending={isPending}
                isValidating={isValidating}
                validationState={validationState}
                pathValue={pathValue}
                handleSubmit={handleSubmit}
                handleTest={handleTest}
                setPathValue={setPathValue}
            />

            <TunerDiscoveryTip />
        </PageContainer>
    );
}
