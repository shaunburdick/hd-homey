'use client';

import { useState, useOptimistic, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ChannelWithPreference } from '@/lib/database/schema';
import { Card } from '@/components/Card';
import {
    toggleFavoriteAction,
    toggleHiddenAction,
} from '@/lib/actions/channel-preferences';

interface ChannelSectionProps {
    title: string;
    channels: ChannelWithPreference[];
    tunerId: number;
    emptyMessage?: string;
}

interface OptimisticUpdate {
    channelId: number;
    field: 'isFavorite' | 'isHidden';
    value: boolean;
}

/**
 * Client Component: Displays a collapsible section of channels
 *
 * Shows channels in a grid layout with cards linking to the channel detail page.
 * Each card displays the guide number, guide name, HD badge, and action buttons for
 * toggling favorite/hidden status with optimistic UI updates.
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
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const sectionId = `channel-section-${title.toLowerCase().replace(/\s+/g, '-')}`;

    /**
     * Get base styles for action buttons
     */
    const getButtonBaseStyles = (isActive: boolean, activeColor: string) => ({
        width: '32px',
        height: '32px',
        padding: 0,
        background: 'var(--color-bg-secondary)',
        border: '1px solid var(--color-border)',
        borderRadius: 'var(--radius-sm)',
        cursor: isPending ? 'not-allowed' : 'pointer',
        opacity: isPending ? 0.5 : 1,
        color: isActive ? activeColor : 'var(--color-text-secondary)',
        transition: 'all var(--transition-fast)',
    });

    /**
     * Handle button hover states
     */
    const handleButtonMouseEnter = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (!isPending) {
            e.currentTarget.style.background = 'var(--color-bg-tertiary)';
            e.currentTarget.style.boxShadow = 'var(--shadow-sm)';
        }
    };

    const handleButtonMouseLeave = (e: React.MouseEvent<HTMLButtonElement>) => {
        e.currentTarget.style.background = 'var(--color-bg-secondary)';
        e.currentTarget.style.boxShadow = 'none';
    };

    // Optimistic UI updates
    const [optimisticChannels, updateOptimisticChannels] = useOptimistic(
        channels,
        (state, { channelId, field, value }: OptimisticUpdate) =>
            state.map((ch) => (ch.id === channelId ? { ...ch, [field]: value } : ch))
    );

    /**
     * Handle favorite toggle with optimistic UI update
     */
    const handleFavorite = async (channelId: number) => {
        startTransition(async () => {
            const channel = channels.find((ch) => ch.id === channelId);
            if (!channel) {
                return;
            }

            const currentValue = channel.isFavorite ?? false;

            // Optimistically update UI
            updateOptimisticChannels({
                channelId,
                field: 'isFavorite',
                value: !currentValue,
            });

            // Call server action
            const result = await toggleFavoriteAction(channelId);

            if (!result.success) {
                // Revert optimistic update on error
                updateOptimisticChannels({
                    channelId,
                    field: 'isFavorite',
                    value: currentValue,
                });
                // Show error to user
                setError(result.error || 'Failed to update favorite status');
                // Clear error after 5 seconds
                setTimeout(() => {
                    setError(null);
                }, 5000);
            } else {
                // Clear any previous errors
                setError(null);
                // Refresh to get updated data from server
                router.refresh();
            }
        });
    };

    /**
     * Handle hidden toggle with optimistic UI update
     */
    const handleHidden = async (channelId: number) => {
        startTransition(async () => {
            const channel = channels.find((ch) => ch.id === channelId);
            if (!channel) {
                return;
            }

            const currentValue = channel.isHidden ?? false;

            // Optimistically update UI
            updateOptimisticChannels({
                channelId,
                field: 'isHidden',
                value: !currentValue,
            });

            // Call server action
            const result = await toggleHiddenAction(channelId);

            if (!result.success) {
                // Revert optimistic update on error
                updateOptimisticChannels({
                    channelId,
                    field: 'isHidden',
                    value: currentValue,
                });
                // Show error to user
                setError(result.error || 'Failed to update hidden status');
                // Clear error after 5 seconds
                setTimeout(() => {
                    setError(null);
                }, 5000);
            } else {
                // Clear any previous errors
                setError(null);
                // Refresh to get updated data from server
                router.refresh();
            }
        });
    };

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

            {/* Error Banner */}
            {error && (
                <div
                    role="alert"
                    style={{
                        padding: 'var(--space-3)',
                        marginBottom: 'var(--space-4)',
                        backgroundColor: 'var(--color-error-bg)',
                        color: 'var(--color-error)',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--color-error)',
                    }}
                >
                    {error}
                </div>
            )}

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
                                display: 'flex',
                                flexDirection: 'column',
                                gap: 'var(--space-3)',
                            }}
                        >
                            {optimisticChannels.map((channel) => (
                                <div
                                    key={channel.id}
                                    style={{
                                        position: 'relative',
                                    }}
                                >
                                    {/* Action Buttons */}
                                    <div
                                        style={{
                                            position: 'absolute',
                                            top: 'var(--space-2)',
                                            right: 'var(--space-2)',
                                            display: 'flex',
                                            gap: 'var(--space-2)',
                                            zIndex: 10,
                                        }}
                                    >
                                        {/* Favorite Button */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleFavorite(channel.id);
                                            }}
                                            disabled={isPending}
                                            aria-label={
                                                channel.isFavorite
                                                    ? 'Remove from favorites'
                                                    : 'Add to favorites'
                                            }
                                            style={{
                                                ...getButtonBaseStyles(
                                                    channel.isFavorite ?? false,
                                                    'var(--color-warning)'
                                                ),
                                                fontSize: '20px',
                                            }}
                                            onMouseEnter={handleButtonMouseEnter}
                                            onMouseLeave={handleButtonMouseLeave}
                                        >
                                            {channel.isFavorite ? '★' : '☆'}
                                        </button>

                                        {/* Hide Button */}
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleHidden(channel.id);
                                            }}
                                            disabled={isPending}
                                            aria-label={
                                                channel.isHidden
                                                    ? 'Unhide channel'
                                                    : 'Hide channel'
                                            }
                                            style={{
                                                ...getButtonBaseStyles(
                                                    channel.isHidden ?? false,
                                                    'var(--color-error)'
                                                ),
                                                fontSize: '18px',
                                                fontWeight: 'var(--font-weight-bold)',
                                            }}
                                            onMouseEnter={handleButtonMouseEnter}
                                            onMouseLeave={handleButtonMouseLeave}
                                        >
                                            ✕
                                        </button>
                                    </div>

                                    {/* Channel Card */}
                                    <Link
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
                                                target.style.borderColor =
                                                    'var(--color-border-hover)';
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
                                                                fontWeight:
                                                                    'var(--font-weight-medium)',
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
                                                                    backgroundColor:
                                                                        'var(--color-success-bg)',
                                                                    color: 'var(--color-success)',
                                                                    borderRadius:
                                                                        'var(--radius-sm)',
                                                                    fontSize: 'var(--font-size-xs)',
                                                                    fontWeight:
                                                                        'var(--font-weight-medium)',
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
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </section>
    );
}
