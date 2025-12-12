import React from 'react';
import { Card } from '../Card';
import styles from './InfoCard.module.css';

export interface InfoItem {
    label: string;
    value: React.ReactNode;
}

export interface InfoCardProps {
    title?: string;
    items: InfoItem[];
    className?: string;
}

export function InfoCard({
    title,
    items,
    className = ''
}: InfoCardProps) {
    return (
        <Card className={className}>
            {title && <h2 className="mt-0 mb-4">{title}</h2>}
            <div className={styles.infoList}>
                {items.map((item) => (
                    <div key={item.label} className={styles.infoRow}>
                        <span className={styles.infoLabel}>{item.label}</span>
                        <span className={styles.infoValue}>{item.value}</span>
                    </div>
                ))}
            </div>
        </Card>
    );
}
