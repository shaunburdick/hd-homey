import React from 'react';
import { Card } from '../Card';

export interface InfoItem {
    label: string;
    value: React.ReactNode;
}

export interface InfoCardProps {
    title?: string;
    items: InfoItem[];
    className?: string;
}

export function InfoCard({ title, items, className = '' }: InfoCardProps) {
    return (
        <Card className={className}>
            {title && <h2 className="mt-0 mb-4">{title}</h2>}
            <dl className="grid grid-cols-auto gap-3 m-0">
                {items.map((item, index) => (
                    <React.Fragment key={index}>
                        <dt className="font-semibold text-secondary">
                            {item.label}
                        </dt>
                        <dd className="m-0">{item.value}</dd>
                    </React.Fragment>
                ))}
            </dl>
        </Card>
    );
}
