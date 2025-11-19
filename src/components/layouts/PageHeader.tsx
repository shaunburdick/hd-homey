import React from 'react';

export interface PageHeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
    children?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action, children }: PageHeaderProps) {
    return (
        <div className="flex justify-between items-center mb-6 flex-wrap gap-4">
            <div>
                <h1 className="mb-2">{title}</h1>
                {subtitle && (
                    <p className="text-secondary m-0">
                        {subtitle}
                    </p>
                )}
            </div>
            {action}
            {children}
        </div>
    );
}
