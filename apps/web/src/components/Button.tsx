import React from 'react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
    loading?: boolean;
    children: React.ReactNode;
}

/**
 * Returns the CSS class name for a given button variant.
 * Primary variant has no extra class (handled by default styles).
 */
function getVariantClass(variant: ButtonProps['variant']): string {
    if (variant === 'secondary') {
        return 'secondary';
    }
    if (variant === 'danger') {
        return 'danger';
    }
    return '';
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

    const variantClass = getVariantClass(variant);
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
