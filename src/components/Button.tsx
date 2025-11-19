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

    return (
        <button
            type={type}
            disabled={isDisabled}
            className={className}
            style={{
                minHeight: 'var(--button-height)',
                padding: 'var(--space-3) var(--space-5)',
                borderRadius: 'var(--radius-md)',
                fontWeight: 'var(--font-weight-medium)',
                fontSize: 'var(--font-size-base)',
                cursor: isDisabled ? 'not-allowed' : 'pointer',
                transition: 'all var(--transition-fast)',
                border: '1px solid transparent',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-2)',
                textDecoration: 'none',
                backgroundColor:
          variant === 'primary'
              ? 'var(--color-accent)'
              : variant === 'danger'
                  ? 'var(--color-error)'
                  : 'var(--color-bg-tertiary)',
                color:
          variant === 'primary' || variant === 'danger'
              ? 'white'
              : 'var(--color-text-primary)',
                borderColor: variant === 'secondary' ? 'var(--color-border)' : 'transparent',
                opacity: isDisabled ? 0.6 : 1,
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
