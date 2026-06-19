import { Card } from './Card';
import styles from './ErrorDisplay.module.css';
import type { ErrorInfo } from '@/lib/errors';

interface ErrorDisplayProps {
    errorInfo: ErrorInfo;
    errorId?: string;
    actions?: React.ReactNode;
    compact?: boolean;
}

/** Renders the optional warning icon shown in non-compact mode. */
function ErrorIcon() {
    return (
        <div className={styles.icon}>
            ⚠️
        </div>
    );
}

/** Renders the list of recovery steps when provided. */
function RecoverySteps({ steps }: { steps: string[] }) {
    return (
        <div className={styles.recoveryContainer}>
            <p className={styles.recoveryTitle}>
                What you can do:
            </p>
            <ul className={styles.recoveryList}>
                {steps.map((step) => (
                    <li key={step} className={styles.recoveryItem}>
                        {step}
                    </li>
                ))}
            </ul>
        </div>
    );
}

/** Returns the CSS class string for the container based on compact mode. */
function getContainerClass(compact: boolean, cssStyles: typeof styles): string {
    return compact ? cssStyles.containerCompact : cssStyles.container;
}

/** Returns the CSS class string for the title element. */
function getTitleClass(compact: boolean, cssStyles: typeof styles): string {
    return `${cssStyles.title} ${compact ? cssStyles.titleCompact : ''}`.trim();
}

/** Returns the CSS class string for the message element. */
function getMessageClass(hasSuggestion: boolean, cssStyles: typeof styles): string {
    return `${cssStyles.message} ${hasSuggestion ? cssStyles.messageWithSuggestion : ''}`.trim();
}

/** Returns the CSS class string for the error-ID element. */
function getErrorIdClass(hasActions: boolean, cssStyles: typeof styles): string {
    return `${cssStyles.errorId} ${hasActions ? cssStyles.errorIdWithActions : ''}`.trim();
}

/**
 * Reusable error display component.
 * Shows user-friendly error information with recovery suggestions.
 */
export function ErrorDisplay({
    errorInfo,
    errorId,
    actions,
    compact = false
}: ErrorDisplayProps) {
    const containerClass = getContainerClass(compact, styles);
    const titleClass = getTitleClass(compact, styles);
    const messageClass = getMessageClass(Boolean(errorInfo.suggestion), styles);
    const errorIdClass = getErrorIdClass(Boolean(actions), styles);

    return (
        <Card>
            <div className={containerClass}>
                {!compact && <ErrorIcon />}
                <h2 className={titleClass}>
                    {errorInfo.title}
                </h2>
                <p className={messageClass}>
                    {errorInfo.message}
                </p>
                {errorInfo.suggestion && (
                    <p className={styles.suggestion}>
                        💡 {errorInfo.suggestion}
                    </p>
                )}
                {errorInfo.recovery && errorInfo.recovery.length > 0 && (
                    <RecoverySteps steps={errorInfo.recovery} />
                )}
                {errorId && (
                    <p className={errorIdClass}>
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
