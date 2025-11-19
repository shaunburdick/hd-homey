import React from 'react';

export interface SectionProps {
    title?: string;
    titleSize?: 'lg' | 'xl' | '2xl';
    children: React.ReactNode;
    className?: string;
}

export function Section({ title, titleSize = 'xl', children, className = '' }: SectionProps) {
    return (
        <section className={className}>
            {title && (
                <h2 className={`mt-0 mb-3 text-${titleSize}`}>
                    {title}
                </h2>
            )}
            {children}
        </section>
    );
}
