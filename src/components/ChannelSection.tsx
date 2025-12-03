'use client';

import { useState } from 'react';
import Link from 'next/link';
import type { ChannelWithPreference } from '@/lib/database/schema';
import { Card } from '@/components/Card';

interface ChannelSectionProps {
    title: string;
    channels: ChannelWithPreference[];
    tunerId: number;
    emptyMessage?: string;
}

/**
 * Client Component: Displays a collapsible section of channels
 *
 * Shows channels in a grid layout with cards linking to the channel detail page.
 * Each card displays the guide number, guide name, and HD badge if applicable.
 *
 * @param title - Section title (e.g., "Favorites", "Channels", "Hidden")
 * @param channels - Array of channels to display
 * @param tunerId - The tuner ID for building channel URLs
 * @param emptyMessage - Message to display when section is empty
 */
export function ChannelSection({
    title,
    channels,
    tunerId,
    emptyMessage = 'No channels in this section.',
}: ChannelSectionProps) {
    const [isExpanded, setIsExpanded] = useState(true);

    const sectionId = `channel-section-${title.toLowerCase().replace(/\s+/g, '-')}`;

    return (
        <section
            aria-labelledby={`${sectionId}-heading`}
            style={{
                marginBottom: 'var(--space-6)',
            }}
        >
            {/* Section Header */}
            <div
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: 'var(--space-4)',
                }}
            >
                <h2
                    id={`${sectionId}-heading`}
                    style={{
                        margin: 0,
                        fontSize: 'var(--font-size-xl)',
                        fontWeight: 'var(--font-weight-semibold)',
                    }}
                >
                    {title} ({channels.length})
                </h2>
                <button
                    type="button"
                    onClick={() => setIsExpanded(!isExpanded)}
                    aria-expanded={isExpanded}
                    aria-controls={sectionId}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: 'var(--color-text-secondary)',
                        cursor: 'pointer',
                        fontSize: 'var(--font-size-lg)',
                        padding: 'var(--space-2)',
                        transition: 'color var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => {
                        e.currentTarget.style.color = 'var(--color-text-primary)';
                    }}
                    onMouseLeave={(e) => {
                        e.currentTarget.style.color = 'var(--color-text-secondary)';
                    }}
                    aria-label={isExpanded ? `Collapse ${title}` : `Expand ${title}`}
                >
                    {isExpanded ? '▼' : '▶'}
                </button>
            </div>

            {/* Section Content */}
            {isExpanded && (
                <div id={sectionId}>
                    {channels.length === 0 ? (
                        <div
                            style={{
                                textAlign: 'center',
                                padding: 'var(--space-8)',
                                color: 'var(--color-text-secondary)',
                                fontSize: 'var(--font-size-sm)',
                            }}
                        >
                            {emptyMessage}
                        </div>
                    ) : (
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                                gap: 'var(--space-4)',
                            }}
                        >
                            {channels.map((channel) => (
                                <Link
                                    key={channel.id}
                                    href={`/tuners/${tunerId}/channel/${channel.id}`}
                                    className="no-underline"
                                    style={{
                                        textDecoration: 'none',
                                    }}
                                >
                                    <Card
                                        className="channel-card"
                                        style={{
                                            cursor: 'pointer',
                                            padding: 'var(--space-4)',
                                            height: '100%',
                                            transition: 'all var(--transition-fast)',
                                        }}
                                        onMouseEnter={(e) => {
                                            const target = e.currentTarget as HTMLElement;
                                            target.style.boxShadow = 'var(--shadow-md)';
                                            target.style.borderColor = 'var(--color-border-hover)';
                                        }}
                                        onMouseLeave={(e) => {
                                            const target = e.currentTarget as HTMLElement;
                                            target.style.boxShadow = 'var(--shadow-sm)';
                                            target.style.borderColor = 'var(--color-border)';
                                        }}
                                    >
                                        <div
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: 'var(--space-3)',
                                            }}
                                        >
                                            {/* Guide Number Badge */}
                                            <div
                                                style={{
                                                    backgroundColor: 'var(--color-bg-primary)',
                                                    padding: 'var(--space-2) var(--space-3)',
                                                    color: 'var(--color-accent)',
                                                    minWidth: '60px',
                                                    borderRadius: 'var(--radius-md)',
                                                    fontWeight: 'var(--font-weight-semibold)',
                                                    textAlign: 'center',
                                                }}
                                            >
                                                {channel.guideNumber}
                                            </div>

                                            {/* Channel Info */}
                                            <div style={{ flex: 1, minWidth: 0 }}>
                                                <div
                                                    style={{
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 'var(--space-2)',
                                                        marginBottom: 'var(--space-1)',
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            fontWeight: 'var(--font-weight-medium)',
                                                            color: 'var(--color-text-primary)',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {channel.guideName}
                                                    </span>
                                                    {channel.hd === 1 && (
                                                        <span
                                                            style={{
                                                                padding: '2px 8px',
                                                                backgroundColor: 'var(--color-success-bg)',
                                                                color: 'var(--color-success)',
                                                                borderRadius: 'var(--radius-sm)',
                                                                fontSize: 'var(--font-size-xs)',
                                                                fontWeight: 'var(--font-weight-medium)',
                                                                whiteSpace: 'nowrap',
                                                            }}
                                                            aria-label="High Definition"
                                                        >
                                                            ✓ HD
                                                        </span>
                                                    )}
                                                </div>
                                                {channel.url && (
                                                    <div
                                                        style={{
                                                            fontSize: 'var(--font-size-xs)',
                                                            color: 'var(--color-text-tertiary)',
                                                            overflow: 'hidden',
                                                            textOverflow: 'ellipsis',
                                                            whiteSpace: 'nowrap',
                                                        }}
                                                    >
                                                        {channel.url}
                                                    </div>
                                                )}
                                            </div>

                                            {/* Arrow Icon */}
                                            <div
                                                style={{
                                                    fontSize: 'var(--font-size-sm)',
                                                    color: 'var(--color-text-tertiary)',
                                                }}
                                                aria-hidden="true"
                                            >
                                                ▶️
                                            </div>
                                        </div>
                                    </Card>
                                </Link>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
