import React from 'react';

export interface SkeletonProps {
    width?: string | number;
    height?: string | number;
    variant?: 'text' | 'circular' | 'rectangular';
    className?: string;
    style?: React.CSSProperties;
}

export function Skeleton({
    width = '100%',
    height = '1rem',
    variant = 'rectangular',
    className = '',
    style = {},
}: SkeletonProps) {
    const baseStyles: React.CSSProperties = {
        width,
        height,
        backgroundColor: 'var(--color-bg-tertiary)',
        ...style,
    };

    const variantStyles: Record<string, React.CSSProperties> = {
        text: {
            borderRadius: 'var(--radius-sm)',
            transform: 'scale(1, 0.8)',
        },
        circular: {
            borderRadius: '50%',
        },
        rectangular: {
            borderRadius: 'var(--radius-md)',
        },
    };

    return (
        <div
            className={`skeleton ${className}`}
            style={{
                ...baseStyles,
                ...variantStyles[variant],
            }}
            aria-busy="true"
            aria-label="Loading..."
        />
    );
}

export interface SkeletonGroupProps {
    count?: number;
    gap?: string;
    children?: React.ReactNode;
}

export function SkeletonGroup({ count = 3, gap = 'var(--space-3)', children }: SkeletonGroupProps) {
    if (children) {
        return (
            <div style={{ display: 'grid', gap }}>
                {children}
            </div>
        );
    }

    return (
        <div style={{ display: 'grid', gap }}>
            {Array.from({ length: count }, (_, i) => (
                <Skeleton key={`skeleton-${count}-${i}`} height="3rem" />
            ))}
        </div>
    );
}
