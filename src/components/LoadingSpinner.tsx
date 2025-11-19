import React from 'react';

export interface LoadingSpinnerProps {
    size?: 'sm' | 'md' | 'lg';
    className?: string;
}

export function LoadingSpinner({ size = 'md', className = '' }: LoadingSpinnerProps) {
    const sizes = {
        sm: '1rem',
        md: '1.5rem',
        lg: '2rem',
    };

    return (
        <div
            className={`spinner ${className}`}
            role="status"
            aria-label="Loading"
            style={{
                width: sizes[size],
                height: sizes[size],
            }}
        >
            <span className="sr-only">Loading...</span>
        </div>
    );
}
