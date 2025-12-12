import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement | HTMLButtonElement> {
    children: React.ReactNode;
    clickable?: boolean;
    onClick?: () => void;
    className?: string;
    style?: React.CSSProperties;
}

export function Card({
    children,
    clickable = false,
    onClick,
    className = '',
    style = {},
    ...props
}: CardProps) {
    const Component = clickable ? 'button' : 'div';

    return (
        <Component
            onClick={onClick}
            className={className}
            style={{
                backgroundColor: 'var(--color-bg-secondary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-lg)',
                padding: 'var(--space-5)',
                boxShadow: 'var(--shadow-sm)',
                transition: 'all var(--transition-fast)',
                cursor: clickable ? 'pointer' : 'default',
                textAlign: clickable ? 'left' : undefined,
                width: clickable ? '100%' : undefined,
                ...(clickable && {
                    ':hover': {
                        boxShadow: 'var(--shadow-md)',
                        borderColor: 'var(--color-border-hover)',
                    },
                }),
                ...style,
            }}
            {...(clickable && { type: 'button' })}
            {...props}
        >
            {children}
        </Component>
    );
}
