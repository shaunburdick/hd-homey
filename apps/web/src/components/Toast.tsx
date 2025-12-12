'use client';

import { useEffect, useState } from 'react';

export interface ToastProps {
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
    onClose?: () => void;
}

export function Toast({ message, type = 'info', duration = 3000, onClose }: ToastProps) {
    const [isVisible, setIsVisible] = useState(true);
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        const timer = setTimeout(() => {
            setIsExiting(true);
            setTimeout(() => {
                setIsVisible(false);
                onClose?.();
            }, 300);
        }, duration);

        return () => clearTimeout(timer);
    }, [duration, onClose]);

    if (!isVisible) {
        return null;
    }

    const colors = {
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

    const colorScheme = colors[type];

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
                animation: isExiting ? 'slideOut 0.3s ease' : 'slideIn 0.3s ease',
            }}
        >
            <span
                style={{
                    fontSize: 'var(--font-size-xl)',
                    color: colorScheme.text,
                }}
            >
                {colorScheme.icon}
            </span>
            <span style={{ flex: 1, color: colorScheme.text }}>
                {message}
            </span>
            <button
                onClick={() => {
                    setIsExiting(true);
                    setTimeout(() => {
                        setIsVisible(false);
                        onClose?.();
                    }, 300);
                }}
                aria-label="Close notification"
                style={{
                    background: 'none',
                    border: 'none',
                    color: colorScheme.text,
                    cursor: 'pointer',
                    padding: 'var(--space-1)',
                    fontSize: 'var(--font-size-lg)',
                    lineHeight: 1,
                }}
            >
                ✕
            </button>
            <style>{`
                @keyframes slideIn {
                    from {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    to {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes slideOut {
                    from {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    to {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `}</style>
        </div>
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
