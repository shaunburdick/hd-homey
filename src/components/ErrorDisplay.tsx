import { Card } from './Card';
import type { ErrorInfo } from '@/lib/errors';

interface ErrorDisplayProps {
    errorInfo: ErrorInfo;
    errorId?: string;
    actions?: React.ReactNode;
    compact?: boolean;
}

/**
 * Reusable error display component
 * Shows user-friendly error information with recovery suggestions
 */
export function ErrorDisplay({
    errorInfo,
    errorId,
    actions,
    compact = false
}: ErrorDisplayProps) {
    const padding = compact ? 'var(--space-4)' : 'var(--space-6)';
    const colorTextSecondary = 'var(--color-text-secondary)';
    const fontSizeSm = 'var(--font-size-sm)';
    const spaceFour = 'var(--space-4)';

    return (
        <Card>
            <div style={{ padding }}>
                {!compact && (
                    <div style={{
                        fontSize: 'var(--font-size-4xl)',
                        marginBottom: spaceFour,
                    }}>
                        ⚠️
                    </div>
                )}
                <h2 style={{
                    marginTop: 0,
                    marginBottom: 'var(--space-3)',
                    fontSize: compact ? 'var(--font-size-lg)' : 'var(--font-size-2xl)',
                }}>
                    {errorInfo.title}
                </h2>
                <p style={{
                    color: colorTextSecondary,
                    marginBottom: errorInfo.suggestion ? 'var(--space-2)' : spaceFour,
                }}>
                    {errorInfo.message}
                </p>
                {errorInfo.suggestion && (
                    <p style={{
                        fontSize: fontSizeSm,
                        color: colorTextSecondary,
                        marginBottom: spaceFour,
                    }}>
                        💡 {errorInfo.suggestion}
                    </p>
                )}
                {errorInfo.recovery && errorInfo.recovery.length > 0 && (
                    <div style={{ marginBottom: spaceFour }}>
                        <p style={{
                            fontSize: fontSizeSm,
                            fontWeight: 'var(--font-weight-semibold)',
                            marginBottom: 'var(--space-2)',
                        }}>
                            What you can do:
                        </p>
                        <ul style={{
                            fontSize: fontSizeSm,
                            color: colorTextSecondary,
                            paddingLeft: 'var(--space-5)',
                            margin: 0,
                        }}>
                            {errorInfo.recovery.map((step) => (
                                <li key={step} style={{ marginBottom: 'var(--space-1)' }}>
                                    {step}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {errorId && (
                    <p style={{
                        fontSize: fontSizeSm,
                        color: 'var(--color-text-tertiary)',
                        fontFamily: 'monospace',
                        marginBottom: actions ? spaceFour : 0,
                    }}>
                        Error ID: {errorId}
                    </p>
                )}
                {actions && (
                    <div style={{
                        display: 'flex',
                        gap: 'var(--space-3)',
                        flexWrap: 'wrap',
                        marginTop: spaceFour,
                    }}>
                        {actions}
                    </div>
                )}
            </div>
        </Card>
    );
}
