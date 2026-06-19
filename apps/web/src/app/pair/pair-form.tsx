'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Logger from '@/lib/logger';
import { Button, Card } from '@/components';
import { BASE_PATH } from '@/lib/client-config';

interface PairDeviceFormProps {
    code?: string;
    user: {
        id: string;
        username: string | null;
        role: string;
    };
}

interface DeviceInfo {
    deviceName: string;
    deviceType: string;
    expiresAt: string;
}

/** HTTP status code for resource not found */
const HTTP_NOT_FOUND = 404;
/** HTTP status code for resource expired/gone */
const HTTP_GONE = 410;
/** HTTP status code for conflict */
const HTTP_CONFLICT = 409;
/** HTTP status code for unauthorized */
const HTTP_UNAUTHORIZED = 401;
/** Milliseconds to wait before redirecting after auth expiry */
const AUTH_REDIRECT_DELAY_MS = 2000;
/** Required code length for device pairing */
const DEVICE_CODE_LENGTH = 6;

/**
 * Get a user-friendly error message from a validation response.
 */
function getValidationErrorMessage(status: number, defaultError: string): string {
    if (status === HTTP_NOT_FOUND) {
        return 'This code does not exist. Please check the code and try again.';
    }
    if (status === HTTP_GONE) {
        return 'This code has expired. Please generate a new code on your device.';
    }
    if (status === HTTP_CONFLICT) {
        return 'This code has already been used. Please generate a new code on your device.';
    }
    return defaultError;
}

/**
 * Get a user-friendly error message from an authorization response.
 */
function getAuthorizationErrorMessage(status: number, defaultError: string): string {
    if (status === HTTP_NOT_FOUND) {
        return 'This code no longer exists. Please start over.';
    }
    if (status === HTTP_GONE) {
        return 'This code has expired. Please generate a new code on your device.';
    }
    if (status === HTTP_CONFLICT) {
        return 'This code has already been used. Please generate a new code on your device.';
    }
    return defaultError;
}

/** Inline error alert shown within forms. */
function ErrorAlert({ message }: { message: string }) {
    return (
        <div
            role="alert"
            className="rounded p-4"
            style={{
                backgroundColor: 'var(--color-error-bg)',
                border: '1px solid var(--color-error)',
                color: 'var(--color-error)',
            }}
        >
            {message}
        </div>
    );
}

/** Device details list shown before authorizing. */
function DeviceDetailsList({ deviceInfo, code }: { deviceInfo: DeviceInfo; code: string }) {
    return (
        <dl className="space-y-3">
            <div>
                <dt className="text-sm font-medium text-tertiary">Device Name</dt>
                <dd className="mt-1 text-base">{deviceInfo.deviceName}</dd>
            </div>
            <div>
                <dt className="text-sm font-medium text-tertiary">Device Type</dt>
                <dd className="mt-1 text-base capitalize">{deviceInfo.deviceType}</dd>
            </div>
            <div>
                <dt className="text-sm font-medium text-tertiary">Code</dt>
                <dd className="mt-1">
                    <code className="px-2 py-1 bg-gray-100 dark:bg-gray-800 rounded font-mono text-lg">
                        {code.toUpperCase()}
                    </code>
                </dd>
            </div>
        </dl>
    );
}

interface AuthConfirmProps {
    deviceInfo: DeviceInfo;
    code: string;
    error: string | null;
    loading: boolean;
    username: string | null;
    onAuthorize: () => void;
    onDeny: () => void;
}

/** Authorization confirmation screen shown after code is validated. */
function AuthConfirmScreen({
    deviceInfo,
    code,
    error,
    loading,
    username,
    onAuthorize,
    onDeny,
}: AuthConfirmProps) {
    return (
        <Card>
            <div className="space-y-6">
                <div>
                    <h2 className="text-xl font-semibold mb-2">Authorize Device</h2>
                    <p className="text-secondary">
                        <strong>{username}</strong>, do you want to authorize this device?
                    </p>
                </div>
                <DeviceDetailsList deviceInfo={deviceInfo} code={code} />
                {error !== null && <ErrorAlert message={error} />}
                <div className="flex gap-3">
                    <Button onClick={onAuthorize} loading={loading} disabled={loading} className="flex-1">
                        {loading ? 'Authorizing...' : 'Yes, Authorize'}
                    </Button>
                    <Button onClick={onDeny} disabled={loading} variant="secondary" className="flex-1">
                        Cancel
                    </Button>
                </div>
            </div>
        </Card>
    );
}

interface CodeEntryFormProps {
    code: string;
    error: string | null;
    loading: boolean;
    onCodeChange: (value: string) => void;
    onSubmit: (event: React.FormEvent) => void;
}

/** Code entry form with auto-focus input. */
function CodeEntryForm({ code, error, loading, onCodeChange, onSubmit }: CodeEntryFormProps) {
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        inputRef.current?.focus();
    }, []);

    return (
        <Card>
            <form onSubmit={onSubmit} className="space-y-6">
                <div>
                    <h2 className="text-xl font-semibold mb-2">Enter Device Code</h2>
                    <p className="text-secondary text-sm">
                        Enter the 6-character code shown on your device to authorize it.
                    </p>
                </div>
                {error !== null && <ErrorAlert message={error} />}
                <div>
                    <label htmlFor="code" className="block text-sm font-medium mb-2">
                        Device Code
                    </label>
                    <input
                        ref={inputRef}
                        id="code"
                        type="text"
                        value={code}
                        onChange={(event) => onCodeChange(event.target.value.toUpperCase())}
                        maxLength={DEVICE_CODE_LENGTH}
                        placeholder="A8F2K9"
                        required
                        pattern="[A-Z0-9]{6}"
                        disabled={loading}
                        className="w-full text-center text-2xl font-mono tracking-widest uppercase"
                        style={{ padding: 'var(--space-3)', letterSpacing: '0.2em' }}
                        aria-describedby="code-help"
                    />
                    <p id="code-help" className="mt-2 text-sm text-tertiary">
                        The code is case-insensitive and expires after 5 minutes.
                    </p>
                </div>
                <Button
                    type="submit"
                    loading={loading}
                    disabled={loading || code.length !== DEVICE_CODE_LENGTH}
                    className="w-full"
                >
                    {loading ? 'Validating...' : 'Continue'}
                </Button>
            </form>
        </Card>
    );
}

interface ValidateCodeOptions {
    cleanCode: string;
    setDeviceInfo: (info: DeviceInfo) => void;
    setError: (msg: string | null) => void;
}

/**
 * Validate a device code against the server.
 * Returns the DeviceInfo on success, sets error state on failure.
 */
async function validateDeviceCode({ cleanCode, setDeviceInfo, setError }: ValidateCodeOptions) {
    const response = await fetch(`${BASE_PATH}/api/auth/device/validate?code=${cleanCode}`);
    if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Failed to validate code' }));
        const msg = data.error || 'Unable to validate code. Please try again.';
        setError(getValidationErrorMessage(response.status, msg));
        return;
    }
    const data = await response.json();
    setDeviceInfo(data);
}

interface AuthorizeCodeOptions {
    code: string;
    deviceInfo: DeviceInfo | null;
    router: ReturnType<typeof useRouter>;
    setError: (msg: string | null) => void;
    setLoading: (v: boolean) => void;
}

/**
 * Authorize a device code on the server.
 * Redirects to success on completion, sets error state on failure.
 */
async function authorizeDeviceCode({ code, deviceInfo, router, setError, setLoading }: AuthorizeCodeOptions) {
    const response = await fetch(`${BASE_PATH}/api/auth/device/authorize`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: code.toUpperCase() }),
    });
    if (!response.ok) {
        const data = await response.json().catch(() => ({ error: 'Authorization failed' }));
        if (response.status === HTTP_UNAUTHORIZED) {
            setError('Your session has expired. Please sign in again.');
            setTimeout(() => router.push('/users/signin?returnTo=/pair'), AUTH_REDIRECT_DELAY_MS);
        } else {
            const msg = data.error || 'Unable to authorize device. Please try again.';
            setError(getAuthorizationErrorMessage(response.status, msg));
        }
        setLoading(false);
        return;
    }
    const deviceName = deviceInfo?.deviceName ?? 'Device';
    router.push(`/pair/success?device=${encodeURIComponent(deviceName)}`);
}

interface PairFlowState {
    code: string;
    loading: boolean;
    error: string | null;
    deviceInfo: DeviceInfo | null;
    setCode: (code: string) => void;
    handleSubmit: (event: React.FormEvent) => Promise<void>;
    handleAuthorize: () => Promise<void>;
    handleDeny: () => void;
}

/**
 * Encapsulate all pair flow state and event handlers.
 */
function usePairFlow(initialCode: string | undefined, router: ReturnType<typeof useRouter>): PairFlowState {
    const [code, setCode] = useState(initialCode ?? '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setLoading(true);
        setError(null);
        const cleanCode = code.trim().toUpperCase();
        if (!/^[A-Z0-9]{6}$/.test(cleanCode)) {
            setError('Invalid code format. Code must be exactly 6 alphanumeric characters.');
            setLoading(false);
            return;
        }
        try {
            await validateDeviceCode({ cleanCode, setDeviceInfo, setError });
        } catch (err) {
            Logger.error({ err }, 'Error validating device code');
            setError('Network error. Please check your connection and try again.');
        }
        setLoading(false);
    };

    const handleAuthorize = async () => {
        setLoading(true);
        setError(null);
        try {
            await authorizeDeviceCode({ code, deviceInfo, router, setError, setLoading });
        } catch (err) {
            Logger.error({ err }, 'Error authorizing device');
            setError('Network error. Please check your connection and try again.');
            setLoading(false);
        }
    };

    const handleDeny = () => {
        setDeviceInfo(null);
        setCode('');
        setError(null);
    };

    return { code, loading, error, deviceInfo, setCode, handleSubmit, handleAuthorize, handleDeny };
}

export function PairDeviceForm({ code: initialCode, user }: PairDeviceFormProps) {
    const router = useRouter();
    const { code, loading, error, deviceInfo, setCode, handleSubmit, handleAuthorize, handleDeny } =
        usePairFlow(initialCode, router);

    if (deviceInfo !== null) {
        return (
            <AuthConfirmScreen
                deviceInfo={deviceInfo}
                code={code}
                error={error}
                loading={loading}
                username={user.username}
                onAuthorize={handleAuthorize}
                onDeny={handleDeny}
            />
        );
    }

    return (
        <CodeEntryForm
            code={code}
            error={error}
            loading={loading}
            onCodeChange={setCode}
            onSubmit={handleSubmit}
        />
    );
}
