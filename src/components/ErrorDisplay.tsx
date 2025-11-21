import { Card } from './Card';
import styles from './ErrorDisplay.module.css';
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
    return (
        <Card>
            <div className={compact ? styles.containerCompact : styles.container}>
                {!compact && (
                    <div className={styles.icon}>
                        ⚠️
                    </div>
                )}
                <h2 className={`${styles.title} ${compact ? styles.titleCompact : ''}`.trim()}>
                    {errorInfo.title}
                </h2>
                <p className={`${styles.message} ${errorInfo.suggestion ? styles.messageWithSuggestion : ''}`.trim()}>
                    {errorInfo.message}
                </p>
                {errorInfo.suggestion && (
                    <p className={styles.suggestion}>
                        💡 {errorInfo.suggestion}
                    </p>
                )}
                {errorInfo.recovery && errorInfo.recovery.length > 0 && (
                    <div className={styles.recoveryContainer}>
                        <p className={styles.recoveryTitle}>
                            What you can do:
                        </p>
                        <ul className={styles.recoveryList}>
                            {errorInfo.recovery.map((step) => (
                                <li key={step} className={styles.recoveryItem}>
                                    {step}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
                {errorId && (
                    <p className={`${styles.errorId} ${actions ? styles.errorIdWithActions : ''}`.trim()}>
                        Error ID: {errorId}
                    </p>
                )}
                {actions && (
                    <div className={styles.actions}>
                        {actions}
                    </div>
                )}
            </div>
        </Card>
    );
}
