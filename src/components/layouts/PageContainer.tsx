import React from 'react';

export interface PageContainerProps {
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    children: React.ReactNode;
    className?: string;
}

const maxWidths = {
    sm: '500px',
    md: '700px',
    lg: '900px',
    xl: '1200px',
    full: '100%',
};

export function PageContainer({ maxWidth = 'full', children, className = '' }: PageContainerProps) {
    return (
        <div className={`container ${className}`} style={{ maxWidth: maxWidths[maxWidth] }}>
            {children}
        </div>
    );
}
