'use client';

import { useState, useOptimistic, useTransition, useCallback, useSyncExternalStore } from 'react';
import { useRouter } from 'next/navigation';
import { ChannelCard } from './ChannelCard';
import type { ChannelWithPreference } from '@/lib/database/schema';
import {
    toggleFavoriteAction,
    toggleHiddenAction,
} from '@/lib/actions/channel-preferences';

/** Duration (ms) to show the error banner before auto-dismissing it. */
const ERROR_DISMISS_DELAY_MS = 5000;

/** Subscribe to storage events for useSyncExternalStore. */
function subscribeToStorageEvent(onStoreChange: () => void): () => void {
    window.addEventListener('storage', onStoreChange);
    return () => window.removeEventListener('storage', onStoreChange);
}

/**
 * Hook that syncs a boolean value with localStorage using useSyncExternalStore,
 * avoiding SSR hydration mismatches.
 */
function useSectionExpanded(storageKey: string, defaultExpanded: boolean): [boolean, (value: boolean) => void] {
    const isExpanded = useSyncExternalStore(
        subscribeToStorageEvent,
        useCallback(() => {
            try {
                const stored = localStorage.getItem(storageKey);
                return stored !== null ? stored === 'true' : defaultExpanded;
            } catch {
                return defaultExpanded;
            }
        }, [storageKey, defaultExpanded]),
        () => defaultExpanded,
    );

    const setIsExpanded = useCallback((value: boolean) => {
        localStorage.setItem(storageKey, String(value));
        window.dispatchEvent(new Event('storage'));
    }, [storageKey]);

    return [isExpanded, setIsExpanded];
}

interface ChannelSectionProps {
    title: string;
    channels: ChannelWithPreference[];
    tunerId: number;
    emptyMessage?: string;
    defaultExpanded?: boolean;
}

interface OptimisticUpdate {
    channelId: number;
    field: 'isFavorite' | 'isHidden';
    value: boolean;
}

interface ToggleOptions {
    channelId: number;
    field: OptimisticUpdate['field'];
    serverAction: (id: number) => Promise<{ success: boolean; error?: string }>;
}

/** Expand / collapse toggle button for a channel section. */
function SectionToggleButton({
    title,
    sectionId,
    isExpanded,
    onToggle,
}: {
    title: string;
    sectionId: string;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    return (
        <button
            type="button"
            onClick={onToggle}
            aria-expanded={isExpanded}
            aria-controls={sectionId}
            aria-label={isExpanded ? `Collapse ${title}` : `Expand ${title}`}
            style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-text-secondary)',
                cursor: 'pointer',
                fontSize: 'var(--font-size-lg)',
                padding: 'var(--space-2)',
                transition: 'color var(--transition-fast)',
            }}
            onMouseEnter={(mouseEvent) => {
                mouseEvent.currentTarget.style.color = 'var(--color-text-primary)';
            }}
            onMouseLeave={(mouseEvent) => {
                mouseEvent.currentTarget.style.color = 'var(--color-text-secondary)';
            }}
        >
            {isExpanded ? '▼' : '▶︎'}
        </button>
    );
}

/** Section header with title and expand/collapse toggle. */
function SectionHeader({
    title,
    channelCount,
    sectionId,
    isExpanded,
    onToggle,
}: {
    title: string;
    channelCount: number;
    sectionId: string;
    isExpanded: boolean;
    onToggle: () => void;
}) {
    return (
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
                style={{ margin: 0, fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-semibold)' }}
            >
                {title} ({channelCount})
            </h2>
            <SectionToggleButton
                title={title}
                sectionId={sectionId}
                isExpanded={isExpanded}
                onToggle={onToggle}
            />
        </div>
    );
}

/** Empty-state placeholder shown when the section has no channels. */
function EmptySection({ message }: { message: string }) {
    return (
        <div
            style={{
                textAlign: 'center',
                padding: 'var(--space-8)',
                color: 'var(--color-text-secondary)',
                fontSize: 'var(--font-size-sm)',
            }}
        >
            {message}
        </div>
    );
}

/** Channel list content with optimistic channel data. */
function ChannelList({
    optimisticChannels,
    tunerId,
    emptyMessage,
    isPending,
    onFavorite,
    onHidden,
}: {
    optimisticChannels: ChannelWithPreference[];
    tunerId: number;
    emptyMessage: string;
    isPending: boolean;
    onFavorite: (id: number) => void;
    onHidden: (id: number) => void;
}) {
    if (optimisticChannels.length === 0) {
        return <EmptySection message={emptyMessage} />;
    }
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            {optimisticChannels.map((channel) => (
                <ChannelCard
                    key={channel.id}
                    channel={channel}
                    tunerId={tunerId}
                    isPending={isPending}
                    onFavorite={onFavorite}
                    onHidden={onHidden}
                />
            ))}
        </div>
    );
}

/**
 * Custom hook that manages optimistic preference toggles and error state
 * for a single channel section.
 */
function useChannelToggles(channels: ChannelWithPreference[]) {
    const router = useRouter();
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();
    const [optimisticChannels, updateOptimisticChannels] = useOptimistic(
        channels,
        (state, { channelId, field, value }: OptimisticUpdate) =>
            state.map((channel) =>
                channel.id === channelId ? { ...channel, [field]: value } : channel)
    );

    const handleToggle = ({ channelId, field, serverAction }: ToggleOptions) => {
        startTransition(async () => {
            const channel = channels.find((ch) => ch.id === channelId);
            if (!channel) {
                return;
            }
            const currentValue = (channel[field] ?? false) as boolean;
            updateOptimisticChannels({ channelId, field, value: !currentValue });
            const result = await serverAction(channelId);
            if (!result.success) {
                updateOptimisticChannels({ channelId, field, value: currentValue });
                setError(result.error ?? `Failed to update ${field} status`);
                setTimeout(() => setError(null), ERROR_DISMISS_DELAY_MS);
            } else {
                setError(null);
                router.refresh();
            }
        });
    };

    const handleFavorite = (channelId: number) =>
        handleToggle({ channelId, field: 'isFavorite', serverAction: toggleFavoriteAction });
    const handleHidden = (channelId: number) =>
        handleToggle({ channelId, field: 'isHidden', serverAction: toggleHiddenAction });

    return { optimisticChannels, isPending, error, handleFavorite, handleHidden };
}

/** Inline error banner shown when a preference toggle fails. */
function SectionErrorBanner({ message }: { message: string }) {
    return (
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
            {message}
        </div>
    );
}

/**
 * Client Component: Displays a collapsible section of channels.
 *
 * Shows channels in a list layout with cards linking to the channel detail page.
 * Each card displays the guide number, guide name, HD badge, and action buttons for
 * toggling favorite/hidden status with optimistic UI updates.
 *
 * @param title - Section title (e.g., "Favorites", "Channels", "Hidden")
 * @param channels - Array of channels to display
 * @param tunerId - The tuner ID for building channel URLs
 * @param emptyMessage - Message to display when section is empty
 * @param defaultExpanded - Whether the section should start expanded (default: true)
 */
export function ChannelSection({
    title,
    channels,
    tunerId,
    emptyMessage = 'No channels in this section.',
    defaultExpanded = true,
}: ChannelSectionProps) {
    const sectionId = `channel-section-${title.toLowerCase().replace(/\s+/g, '-')}`;
    const storageKey = `hd-homey-tuner-${tunerId}-${sectionId}-expanded`;
    const [isExpanded, setIsExpanded] = useSectionExpanded(storageKey, defaultExpanded);

    const { optimisticChannels, isPending, error, handleFavorite, handleHidden } =
        useChannelToggles(channels);

    return (
        <section
            aria-labelledby={`${sectionId}-heading`}
            style={{ marginBottom: 'var(--space-6)' }}
        >
            <SectionHeader
                title={title}
                channelCount={channels.length}
                sectionId={sectionId}
                isExpanded={isExpanded}
                onToggle={() => setIsExpanded(!isExpanded)}
            />
            {error && <SectionErrorBanner message={error} />}
            {isExpanded && (
                <div id={sectionId}>
                    <ChannelList
                        optimisticChannels={optimisticChannels}
                        tunerId={tunerId}
                        emptyMessage={emptyMessage}
                        isPending={isPending}
                        onFavorite={handleFavorite}
                        onHidden={handleHidden}
                    />
                </div>
            )}
        </section>
    );
}
