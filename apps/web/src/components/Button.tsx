import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
    loading?: boolean;
    children: React.ReactNode;
}

export function Button({
    variant = 'primary',
    loading = false,
    disabled,
    children,
    className = '',
    type = 'button',
    ...props
}: ButtonProps) {
    const isDisabled = disabled || loading;

    const variantClass = variant === 'secondary' ? 'secondary' : variant === 'danger' ? 'danger' : '';
    const combinedClassName = `${variantClass} ${className}`.trim();

    return (
        <button
            type={type}
            disabled={isDisabled}
            className={combinedClassName}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
            }}
            {...props}
        >
            {loading && (
                <span className="spinner" aria-hidden="true" />
            )}
            {children}
        </button>
    );
}
