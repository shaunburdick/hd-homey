'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

interface PairDeviceFormProps {
    code?: string;
    user: {
        id: string;
        username: string | null;
        role: string;
    };
}

export function PairDeviceForm({ code: initialCode, user }: PairDeviceFormProps) {
    const router = useRouter();
    const [code, setCode] = useState(initialCode ?? '');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [deviceInfo, setDeviceInfo] = useState<{
        deviceName: string;
        deviceType: string;
    } | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            // Validate code format
            if (!/^[A-Z0-9]{6}$/.test(code.toUpperCase())) {
                setError('Invalid code format. Code must be 6 characters.');
                setLoading(false);
                return;
            }

            // Check if code exists and get device info
            const response = await fetch(`/api/auth/device/validate?code=${code.toUpperCase()}`);
            if (!response.ok) {
                const data = await response.json();
                setError(data.error ?? 'Invalid code');
                setLoading(false);
                return;
            }

            const data = await response.json();
            setDeviceInfo(data);
        } catch {
            setError('Failed to validate code');
            setLoading(false);
        }
    };

    const handleAuthorize = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await fetch('/api/auth/device/authorize', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ code: code.toUpperCase() }),
            });

            if (!response.ok) {
                const data = await response.json();
                setError(data.error ?? 'Authorization failed');
                setLoading(false);
                return;
            }

            // Success! Redirect to success page
            const deviceName = deviceInfo?.deviceName ?? 'Device';
            router.push(`/pair/success?device=${encodeURIComponent(deviceName)}`);
        } catch {
            setError('Failed to authorize device');
            setLoading(false);
        }
    };

    const handleDeny = () => {
        setDeviceInfo(null);
        setCode('');
        setError(null);
    };

    if (deviceInfo !== null) {
        return (
            <div style={{
                maxWidth: '500px',
                margin: '2rem auto',
                padding: '2rem',
                border: '1px solid var(--nc-bg-3)',
                borderRadius: '4px',
            }}>
                <p>
                    <strong>{user.username}</strong>, do you want to authorize this device?
                </p>
                <dl>
                    <dt><strong>Device Name:</strong></dt>
                    <dd>{deviceInfo.deviceName}</dd>
                    <dt><strong>Device Type:</strong></dt>
                    <dd style={{ textTransform: 'capitalize' }}>{deviceInfo.deviceType}</dd>
                    <dt><strong>Code:</strong></dt>
                    <dd><code>{code.toUpperCase()}</code></dd>
                </dl>

                {error !== null && (
                    <p style={{ color: 'var(--nc-ac-1, red)', margin: '1rem 0' }} role="alert">
                        {error}
                    </p>
                )}

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem' }}>
                    <button
                        onClick={handleAuthorize}
                        disabled={loading}
                        style={{ flex: 1 }}
                    >
                        {loading ? 'Authorizing...' : 'Yes, Authorize'}
                    </button>
                    <button
                        onClick={handleDeny}
                        disabled={loading}
                        style={{ flex: 1 }}
                    >
                        Cancel
                    </button>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={handleSubmit} style={{ maxWidth: '400px', margin: '2rem auto' }}>
            <p>Enter the 6-character code shown on your device:</p>

            <label htmlFor="code">
                Device Code:
                <input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => {
                        setCode(e.target.value.toUpperCase());
                    }}
                    maxLength={6}
                    placeholder="A8F2K9"
                    required
                    pattern="[A-Z0-9]{6}"
                    style={{
                        textTransform: 'uppercase',
                        letterSpacing: '0.2em',
                        fontSize: '1.5rem',
                        textAlign: 'center',
                    }}
                />
            </label>

            {error !== null && (
                <p style={{ color: 'var(--nc-ac-1, red)', margin: '1rem 0' }} role="alert">
                    {error}
                </p>
            )}

            <button type="submit" disabled={loading || code.length !== 6}>
                {loading ? 'Validating...' : 'Continue'}
            </button>
        </form>
    );
}
