'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

/** Duration of the slide-in/out CSS animation in milliseconds. */
const ANIMATION_DURATION_MS = 300;

export interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
    onClose?: () => void;
}

interface ToastColorScheme {
    bg: string;
    border: string;
    text: string;
    icon: string;
}

const TOAST_COLORS: Record<NonNullable<ToastProps['type']>, ToastColorScheme> = {
    success: {
        bg: 'var(--color-success-bg)',
        border: 'var(--color-success)',
        text: 'var(--color-success)',
        icon: '✓',
    },
    error: {
        bg: 'var(--color-error-bg)',
        border: 'var(--color-error)',
        text: 'var(--color-error)',
        icon: '✗',
    },
    warning: {
        bg: 'var(--color-warning-bg)',
        border: 'var(--color-warning)',
        text: 'var(--color-warning)',
        icon: '⚠',
    },
    info: {
        bg: 'var(--color-info-bg)',
        border: 'var(--color-info)',
        text: 'var(--color-info)',
        icon: 'ℹ',
    },
};

const TOAST_KEYFRAMES = `
    @keyframes slideIn {
        from { transform: translateX(100%); opacity: 0; }
        to   { transform: translateX(0);    opacity: 1; }
    }
    @keyframes slideOut {
        from { transform: translateX(0);    opacity: 1; }
        to   { transform: translateX(100%); opacity: 0; }
    }
`;

/** Close button for the toast notification. */
function ToastCloseButton({
    colorText,
    onClose,
}: {
    colorText: string;
    onClose: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onClose}
            aria-label="Close notification"
            style={{
                background: 'none',
                border: 'none',
                color: colorText,
                cursor: 'pointer',
                padding: 'var(--space-1)',
                fontSize: 'var(--font-size-lg)',
                lineHeight: 1,
            }}
        >
            ✕
        </button>
    );
}

/** Main toast notification body. */
function ToastBody({
    message,
    colorScheme,
    isExiting,
    onClose,
}: {
    message: string;
    colorScheme: ToastColorScheme;
    isExiting: boolean;
    onClose: () => void;
}) {
    return (
        <div
            role="alert"
            aria-live="polite"
            style={{
                position: 'fixed',
                bottom: 'var(--space-6)',
                right: 'var(--space-6)',
                backgroundColor: colorScheme.bg,
                border: `1px solid ${colorScheme.border}`,
                borderRadius: 'var(--radius-md)',
                padding: 'var(--space-4)',
                boxShadow: 'var(--shadow-xl)',
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-3)',
                minWidth: '300px',
                maxWidth: '500px',
                zIndex: 'var(--z-tooltip)',
                animation: isExiting
                    ? 'slideOut 0.3s ease'
                    : 'slideIn 0.3s ease',
            }}
        >
            <span style={{ fontSize: 'var(--font-size-xl)', color: colorScheme.text }}>
                {colorScheme.icon}
            </span>
            <span style={{ flex: 1, color: colorScheme.text }}>
                {message}
            </span>
            <ToastCloseButton colorText={colorScheme.text} onClose={onClose} />
            <style>{TOAST_KEYFRAMES}</style>
        </div>
    );
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(true);
    const [isExiting, setIsExiting] = useState(false);
    const exitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /**
     * Triggers the exit animation and then hides the toast.
     * Clears any in-flight exit timer before scheduling a new one.
     * Wrapped in useCallback so it can safely appear in useEffect deps.
     */
    const startExit = useCallback(() => {
        if (exitTimerRef.current) {
            clearTimeout(exitTimerRef.current);
        }
        setIsExiting(true);
        exitTimerRef.current = setTimeout(() => {
            setIsVisible(false);
            onClose?.();
        }, ANIMATION_DURATION_MS);
    }, [onClose]);

    useEffect(() => {
        const autoCloseTimer = setTimeout(startExit, duration);

        return () => {
            clearTimeout(autoCloseTimer);
            if (exitTimerRef.current) {
                clearTimeout(exitTimerRef.current);
            }
        };
    }, [duration, startExit]);

    if (!isVisible) {
        return null;
    }

    const colorScheme = TOAST_COLORS[type];

    return (
        <ToastBody
            message={message}
            colorScheme={colorScheme}
            isExiting={isExiting}
            onClose={startExit}
        />
    );
}

export interface ToastContainerProps {
    toasts: { id: string; message: string; type: ToastProps['type'] }[];
    onRemove: (id: string) => void;
}

export function ToastContainer({ toasts, onRemove }: ToastContainerProps) {
    return (
        <>
            {toasts.map((toast) => (
                <Toast
                    key={toast.id}
                    message={toast.message}
                    type={toast.type}
                    onClose={() => onRemove(toast.id)}
                />
            ))}
        </>
    );
}
