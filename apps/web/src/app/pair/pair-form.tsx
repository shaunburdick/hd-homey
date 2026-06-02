'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Logger from '@/lib/logger';
import { Button, Card } from '@/components';

/**
 * The sub-path prefix for API calls (e.g. "/hd-homey").
 * NEXT_PUBLIC_BASE_PATH is injected at build time from HD_HOMEY_BASE_PATH.
 * Empty string for root-path deployments.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '';

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

export function PairDeviceForm({ code: initialCode, user }: PairDeviceFormProps) {
    const router = useRouter();
    const [code, setCode] = useState(initialCode ?? '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deviceInfo, setDeviceInfo] = useState<DeviceInfo | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Validate code format client-side
            const cleanCode = code.trim().toUpperCase();
            if (!/^[A-Z0-9]{6}$/.test(cleanCode)) {
                setError('Invalid code format. Code must be exactly 6 alphanumeric characters.');
                setLoading(false);
                return;
            }

            // Validate code with server
            const response = await fetch(`${BASE_PATH}/api/auth/device/validate?code=${cleanCode}`);

            if (!response.ok) {
                const data = await response.json().catch(() => ({ error: 'Failed to validate code' }));

                // Provide user-friendly error messages
                if (response.status === 404) {
                    setError('This code does not exist. Please check the code and try again.');
                } else if (response.status === 410) {
                    setError('This code has expired. Please generate a new code on your device.');
                } else if (response.status === 409) {
                    setError('This code has already been used. Please generate a new code on your device.');
                } else {
                    setError(data.error || 'Unable to validate code. Please try again.');
                }
                setLoading(false);
                return;
            }

            const data = await response.json();
            setDeviceInfo(data);
            setLoading(false);
        } catch (err) {
            Logger.error({ err }, 'Error validating device code');
            setError('Network error. Please check your connection and try again.');
            setLoading(false);
        }
    };

    const handleAuthorize = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch(`${BASE_PATH}/api/auth/device/authorize`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code: code.toUpperCase() }),
            });

            if (!response.ok) {
                const data = await response.json().catch(() => ({ error: 'Authorization failed' }));

                // Provide user-friendly error messages
                if (response.status === 401) {
                    setError('Your session has expired. Please sign in again.');
                    setTimeout(() => router.push('/users/signin?returnTo=/pair'), 2000);
                } else if (response.status === 404) {
                    setError('This code no longer exists. Please start over.');
                } else if (response.status === 410) {
                    setError('This code has expired. Please generate a new code on your device.');
                } else if (response.status === 409) {
                    setError('This code has already been used. Please generate a new code on your device.');
                } else {
                    setError(data.error || 'Unable to authorize device. Please try again.');
                }
                setLoading(false);
                return;
            }

            // Success! Redirect to success page
            const deviceName = deviceInfo?.deviceName ?? 'Device';
            router.push(`/pair/success?device=${encodeURIComponent(deviceName)}`);
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

    // Authorization confirmation screen
    if (deviceInfo !== null) {
        return (
            <Card>
                <div className="space-y-6">
                    <div>
                        <h2 className="text-xl font-semibold mb-2">Authorize Device</h2>
                        <p className="text-secondary">
                            <strong>{user.username}</strong>, do you want to authorize this device?
                        </p>
                    </div>

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

                    {error !== null && (
                        <div role="alert" className="rounded p-4" style={{
                            backgroundColor: 'var(--color-error-bg)',
                            border: '1px solid var(--color-error)',
                            color: 'var(--color-error)',
                        }}>
                            {error}
                        </div>
                    )}

                    <div className="flex gap-3">
                        <Button
                            onClick={handleAuthorize}
                            loading={loading}
                            disabled={loading}
                            className="flex-1"
                        >
                            {loading ? 'Authorizing...' : 'Yes, Authorize'}
                        </Button>
                        <Button
                            onClick={handleDeny}
                            disabled={loading}
                            variant="secondary"
                            className="flex-1"
                        >
                            Cancel
                        </Button>
                    </div>
                </div>
            </Card>
        );
    }

    // Code entry form
    return (
        <Card>
            <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                    <h2 className="text-xl font-semibold mb-2">Enter Device Code</h2>
                    <p className="text-secondary text-sm">
                        Enter the 6-character code shown on your device to authorize it.
                    </p>
                </div>

                {error !== null && (
                    <div role="alert" className="rounded p-4" style={{
                        backgroundColor: 'var(--color-error-bg)',
                        border: '1px solid var(--color-error)',
                        color: 'var(--color-error)',
                    }}>
                        {error}
                    </div>
                )}

                <div>
                    <label htmlFor="code" className="block text-sm font-medium mb-2">
                        Device Code
                    </label>
                    <input
                        id="code"
                        type="text"
                        value={code}
                        onChange={(e) => setCode(e.target.value.toUpperCase())}
                        maxLength={6}
                        placeholder="A8F2K9"
                        required
                        pattern="[A-Z0-9]{6}"
                        disabled={loading}
                        className="w-full text-center text-2xl font-mono tracking-widest uppercase"
                        style={{
                            padding: 'var(--space-3)',
                            letterSpacing: '0.2em',
                        }}
                        aria-describedby="code-help"
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus
                    />
                    <p id="code-help" className="mt-2 text-sm text-tertiary">
                        The code is case-insensitive and expires after 5 minutes.
                    </p>
                </div>

                <Button
                    type="submit"
                    loading={loading}
                    disabled={loading || code.length !== 6}
                    className="w-full"
                >
                    {loading ? 'Validating...' : 'Continue'}
                </Button>
            </form>
        </Card>
    );
}
