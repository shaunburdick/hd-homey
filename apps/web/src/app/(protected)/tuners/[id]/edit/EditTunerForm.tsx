'use client';

import { useActionState, useState, useTransition } from 'react';
import { isRedirectError } from 'next/dist/client/components/redirect-error';
import Link from 'next/link';
import { updateTuner, deleteTuner, validateTunerConnection, type ValidationResult } from '../../actions';
import { Input, Button, Card } from '@/components';
import { PageContainer, InfoCard } from '@/components/layouts';
import type { Tuner } from '@/lib/database/schema';
import { buildErrorMap } from '@/lib/errors';

/** Date format options for displaying tuner timestamps */
const DATE_FORMAT_OPTIONS: Intl.DateTimeFormatOptions = {
    month: '2-digit',
    day: '2-digit',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
};

/** Formats a tuner Date value to a locale string, or returns a fallback */
function formatTunerDate(date: Date | string | null | undefined, fallback = 'Never'): string {
    if (!date) {
        return fallback;
    }
    return new Date(date).toLocaleString('en-US', DATE_FORMAT_OPTIONS);
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
                            <strong>{field}:</strong>{' '}{message}
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

/** Confirmation UI for the irreversible delete action */
function DeleteConfirmation({
    tunerName,
    isDeleting,
    isAnyActionPending,
    handleDelete,
    onCancel,
}: {
    tunerName: string;
    isDeleting: boolean;
    isAnyActionPending: boolean;
    handleDelete: (formData: FormData) => Promise<void>;
    onCancel: () => void;
}) {
    return (
        <div>
            <p className="text-sm font-medium mb-3">
                Are you sure? This will permanently delete &quot;{tunerName}&quot;
                and all its channels.
            </p>
            <form action={handleDelete}>
                <div className="flex gap-3">
                    <Button
                        type="submit"
                        variant="danger"
                        loading={isDeleting}
                        disabled={isAnyActionPending}
                    >
                        {isDeleting ? 'Deleting...' : 'Yes, Delete Tuner'}
                    </Button>
                    <Button
                        type="button"
                        variant="secondary"
                        onClick={onCancel}
                        disabled={isAnyActionPending}
                    >
                        Cancel
                    </Button>
                </div>
            </form>
        </div>
    );
}

interface TunerSettingsFormProps {
    tuner: Tuner;
    errors: Record<string, string[]> | undefined;
    isPending: boolean;
    isValidating: boolean;
    validationState: ValidationResult | null;
    handleSubmit: (formData: FormData) => Promise<void>;
    handleTest: (e: React.MouseEvent<HTMLButtonElement>) => void;
    pathValue: string;
    setPathValue: (value: string) => void;
}

/** Renders the submit, test, and cancel buttons for the tuner settings form */
function TunerFormActions({
    tunerId,
    isPending,
    isValidating,
    pathValue,
    handleTest,
}: {
    tunerId: number;
    isPending: boolean;
    isValidating: boolean;
    pathValue: string;
    handleTest: (e: React.MouseEvent<HTMLButtonElement>) => void;
}) {
    return (
        <div className="mt-6 flex gap-3 flex-wrap">
            <Button type="submit" loading={isPending} disabled={isPending || isValidating}>
                {isPending ? 'Updating...' : 'Update Tuner'}
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
            <Link href={`/tuners/${tunerId}`}>
                <Button type="button" variant="secondary" disabled={isPending || isValidating}>
                    Cancel
                </Button>
            </Link>
        </div>
    );
}

/** Renders the active/inactive checkbox for the tuner */
function TunerActiveCheckbox({ isActive, isPending }: { isActive: boolean; isPending: boolean }) {
    return (
        <div className="form-group">
            <label className="checkbox-label">
                <input
                    type="checkbox"
                    name="is_active"
                    defaultChecked={isActive}
                    disabled={isPending}
                />
                <span>Active</span>
            </label>
            <small className="form-help block">
                Inactive tuners will not be available for streaming
            </small>
        </div>
    );
}

/** Renders the name and path input fields for the tuner settings form */
function TunerInputFields({
    tuner,
    errors,
    isPending,
    pathValue,
    setPathValue,
}: {
    tuner: Tuner;
    errors: Record<string, string[]> | undefined;
    isPending: boolean;
    pathValue: string;
    setPathValue: (value: string) => void;
}) {
    return (
        <>
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
                value={pathValue}
                placeholder="http://192.168.1.100"
                helpText="The network address of your HDHomeRun device"
                error={errors?.path?.[0]}
                disabled={isPending}
                onChange={(e) => setPathValue(e.target.value)}
            />
        </>
    );
}

function TunerSettingsForm({
    tuner,
    errors,
    isPending,
    isValidating,
    validationState,
    handleSubmit,
    handleTest,
    pathValue,
    setPathValue,
}: TunerSettingsFormProps) {
    return (
        <Card>
            <h2 className="mt-0 mb-4">Tuner Settings</h2>
            <form action={handleSubmit}>
                {errors && <ErrorAlert errors={errors} />}

                <TunerInputFields
                    tuner={tuner}
                    errors={errors}
                    isPending={isPending}
                    pathValue={pathValue}
                    setPathValue={setPathValue}
                />

                <ValidationAlert isValidating={isValidating} validationState={validationState} />

                <TunerActiveCheckbox isActive={tuner.is_active} isPending={isPending} />

                <TunerFormActions
                    tunerId={tuner.id}
                    isPending={isPending}
                    isValidating={isValidating}
                    pathValue={pathValue}
                    handleTest={handleTest}
                />
            </form>
        </Card>
    );
}

/** Renders the danger zone card for deleting a tuner */
function DangerZoneCard({
    tuner,
    isDeleting,
    isAnyActionPending,
    handleDelete,
    showDeleteConfirm,
    setShowDeleteConfirm,
}: {
    tuner: Tuner;
    isDeleting: boolean;
    isAnyActionPending: boolean;
    handleDelete: (formData: FormData) => Promise<void>;
    showDeleteConfirm: boolean;
    setShowDeleteConfirm: (value: boolean) => void;
}) {
    return (
        <Card className="bg-error">
            <h2 className="mt-0 mb-3">
                Danger Zone
            </h2>
            <p className="text-sm text-secondary mb-4">
                Deleting a tuner will remove it and all its channels. This action cannot be undone.
            </p>

            {!showDeleteConfirm ? (
                <Button
                    type="button"
                    variant="danger"
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={isAnyActionPending}
                >
                    🗑️ Delete Tuner
                </Button>
            ) : (
                <DeleteConfirmation
                    tunerName={tuner.name}
                    isDeleting={isDeleting}
                    isAnyActionPending={isAnyActionPending}
                    handleDelete={handleDelete}
                    onCancel={() => setShowDeleteConfirm(false)}
                />
            )}
        </Card>
    );
}

interface EditTunerLayoutProps {
    tuner: Tuner;
    errors: Record<string, string[]> | undefined;
    isPending: boolean;
    isDeleting: boolean;
    isValidating: boolean;
    isAnyActionPending: boolean;
    validationState: ValidationResult | null;
    pathValue: string;
    showDeleteConfirm: boolean;
    setPathValue: (value: string) => void;
    setShowDeleteConfirm: (value: boolean) => void;
    handleSubmit: (formData: FormData) => Promise<void>;
    handleTest: (e: React.MouseEvent<HTMLButtonElement>) => void;
    handleDelete: (formData: FormData) => Promise<void>;
}

/** Renders the tuner info card displaying read-only metadata */
function TunerInfoCard({ tuner }: { tuner: Tuner }) {
    return (
        <InfoCard
            title="Tuner Information"
            items={[
                { label: 'ID', value: String(tuner.id) },
                { label: 'Status', value: tuner.is_active ? 'Active' : 'Inactive' },
                { label: 'Last Scanned', value: formatTunerDate(tuner.last_scanned) },
                { label: 'Created', value: formatTunerDate(tuner.created_at) },
                { label: 'Last Modified', value: formatTunerDate(tuner.modified_at) },
            ]}
        />
    );
}

/** Renders the page breadcrumb and title for the edit tuner page */
function EditTunerPageHeader({ tunerId, tunerName }: { tunerId: number; tunerName: string }) {
    return (
        <div className="mb-6">
            <Link
                href={`/tuners/${tunerId}`}
                className="text-secondary no-underline text-sm inline-flex items-center gap-2 mb-4"
            >
                ← Back to Tuner
            </Link>
            <h1 className="mb-2">Edit Tuner: {tunerName}</h1>
            <p className="text-secondary m-0">
                Update tuner settings and configuration
            </p>
        </div>
    );
}

/** Renders the full edit tuner page layout with all sections */
function EditTunerLayout({
    tuner, errors, isPending, isDeleting, isValidating, isAnyActionPending,
    validationState, pathValue, showDeleteConfirm, setPathValue, setShowDeleteConfirm,
    handleSubmit, handleTest, handleDelete,
}: EditTunerLayoutProps) {
    return (
        <PageContainer maxWidth="lg">
            <EditTunerPageHeader tunerId={tuner.id} tunerName={tuner.name} />

            <div className="grid gap-5">
                <TunerSettingsForm
                    tuner={tuner}
                    errors={errors}
                    isPending={isPending}
                    isValidating={isValidating}
                    validationState={validationState}
                    handleSubmit={handleSubmit}
                    handleTest={handleTest}
                    pathValue={pathValue}
                    setPathValue={setPathValue}
                />

                <TunerInfoCard tuner={tuner} />

                <DangerZoneCard
                    tuner={tuner}
                    isDeleting={isDeleting}
                    isAnyActionPending={isAnyActionPending}
                    handleDelete={handleDelete}
                    showDeleteConfirm={showDeleteConfirm}
                    setShowDeleteConfirm={setShowDeleteConfirm}
                />
            </div>
        </PageContainer>
    );
}

/** Creates a submit handler that appends the tuner id and re-throws redirects */
function makeSubmitHandler(tunerId: number, formAction: (formData: FormData) => void) {
    return async (formData: FormData) => {
        formData.append('id', tunerId.toString());
        try {
            await formAction(formData);
        } catch (error) {
            if (isRedirectError(error)) {
                throw error;
            }
        }
    };
}

/** Creates a delete handler that appends the tuner id and re-throws redirects */
function makeDeleteHandler(tunerId: number, deleteAction: (formData: FormData) => void) {
    return async (formData: FormData) => {
        formData.append('id', tunerId.toString());
        try {
            await deleteAction(formData);
        } catch (error) {
            if (isRedirectError(error)) {
                throw error;
            }
        }
    };
}

export default function EditTunerForm({ tuner }: { tuner: Tuner }) {
    const [state, formAction, isPending] = useActionState(updateTuner, null);
    const [, deleteAction, isDeleting] = useActionState(deleteTuner, null);
    const [validationState, validateAction] = useActionState<
        ValidationResult | null, FormData
    >(validateTunerConnection, null);
    const [isValidating, startTransition] = useTransition();
    const [pathValue, setPathValue] = useState(tuner.path);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const isAnyActionPending = isPending || isDeleting;
    const errors = state && Array.isArray(state) ? buildErrorMap(state) : undefined;

    const handleSubmit = makeSubmitHandler(tuner.id, formAction);
    const handleDelete = makeDeleteHandler(tuner.id, deleteAction);
    const handleTest = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('path', pathValue);
        startTransition(() => {
            validateAction(formData);
        });
    };

    return (
        <EditTunerLayout
            tuner={tuner} errors={errors} isPending={isPending} isDeleting={isDeleting}
            isValidating={isValidating} isAnyActionPending={isAnyActionPending}
            validationState={validationState} pathValue={pathValue}
            showDeleteConfirm={showDeleteConfirm} setPathValue={setPathValue}
            setShowDeleteConfirm={setShowDeleteConfirm} handleSubmit={handleSubmit}
            handleTest={handleTest} handleDelete={handleDelete}
        />
    );
}
