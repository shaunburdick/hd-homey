import React from 'react';
import { Card } from '../Card';

export interface EmptyStateProps {
    icon?: string;
    title: string;
    description?: string;
    action?: React.ReactNode;
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
    return (
        <Card>
            <div className="text-center p-6">
                {icon && (
                    <div className="text-3xl mb-4" style={{ opacity: 0.3 }}>
                        {icon}
                    </div>
                )}
                <p className="text-lg text-secondary mb-4">
                    {title}
                </p>
                {description && (
                    <p className="text-tertiary m-0">
                        {description}
                    </p>
                )}
                {action && (
                    <div className="mt-4">
                        {action}
                    </div>
                )}
            </div>
        </Card>
    );
}
