'use client';

import Link from 'next/link';
import type { ChannelWithPreference } from '@/lib/database/schema';
import { Card } from '@/components/Card';

/** Accessible minimum tap target size for action buttons. */
const ACTION_BUTTON_TAP_SIZE = '44px';

/** Font size (px) for the favorite star icon. */
const FAVORITE_ICON_FONT_SIZE = '20px';

/** Font size (px) for the hide/close icon. */
const HIDE_ICON_FONT_SIZE = '18px';

interface ButtonStyleOptions {
    isActive: boolean;
    activeColor: string;
    isPending: boolean;
}

/**
 * Returns the base inline styles for a channel action button.
 */
export function getButtonBaseStyles({
    isActive,
    activeColor,
    isPending,
}: ButtonStyleOptions): React.CSSProperties {
    return {
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
    };
}

/**
 * Applies hover highlight styles to a channel action button.
 * No-op when a transition is pending.
 */
export function handleButtonMouseEnter({
    event,
    isPending,
}: {
    event: React.MouseEvent<HTMLButtonElement>;
    isPending: boolean;
}): void {
    if (isPending) {
        return;
    }
    event.currentTarget.style.background = 'var(--color-bg-tertiary)';
    event.currentTarget.style.boxShadow = 'var(--shadow-sm)';
}

/** Resets hover styles on a channel action button to their default values. */
export function handleButtonMouseLeave(event: React.MouseEvent<HTMLButtonElement>): void {
    event.currentTarget.style.background = 'var(--color-bg-secondary)';
    event.currentTarget.style.boxShadow = 'none';
}

/** Returns true when the given audioCodec string represents AC4. */
export function isAC4Audio(audioCodec: string | null): boolean {
    if (!audioCodec) {
        return false;
    }
    const codec = audioCodec.toLowerCase();
    return codec.includes('ac4') || codec.includes('ac-4');
}

/** The HD quality badge shown next to the channel name. */
function HdBadge() {
    return (
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
    );
}

/** Warning badge for channels that use the AC4 audio codec (unsupported). */
function Ac4Badge() {
    return (
        <span
            style={{
                padding: '2px 6px',
                backgroundColor: 'var(--color-warning-bg)',
                color: 'var(--color-warning)',
                borderRadius: 'var(--radius-sm)',
                fontSize: 'var(--font-size-xs)',
                fontWeight: 'var(--font-weight-medium)',
                whiteSpace: 'nowrap',
            }}
            title="AC4 audio not supported - silent audio"
            aria-label="AC4 audio codec - not supported"
        >
            ⚠️ AC4
        </span>
    );
}

/** Single action button (favorite or hide) for a channel card. */
function ChannelActionButton({
    channel,
    isPending,
    ariaLabel,
    icon,
    isActive,
    activeColor,
    fontSize,
    onClick,
}: {
    channel: ChannelWithPreference;
    isPending: boolean;
    ariaLabel: string;
    icon: string;
    isActive: boolean;
    activeColor: string;
    fontSize: string;
    onClick: (id: number) => void;
}) {
    return (
        <button
            type="button"
            onClick={(clickEvent) => {
                clickEvent.preventDefault();
                clickEvent.stopPropagation();
                onClick(channel.id);
            }}
            disabled={isPending}
            aria-label={ariaLabel}
            style={{
                ...getButtonBaseStyles({ isActive, activeColor, isPending }),
                fontSize,
                minWidth: ACTION_BUTTON_TAP_SIZE,
                minHeight: ACTION_BUTTON_TAP_SIZE,
            }}
            onMouseEnter={(mouseEvent) =>
                handleButtonMouseEnter({ event: mouseEvent, isPending })
            }
            onMouseLeave={handleButtonMouseLeave}
        >
            {icon}
        </button>
    );
}

/** Favorite toggle button for a channel card. */
function FavoriteButton({
    channel,
    isPending,
    onClick,
}: {
    channel: ChannelWithPreference;
    isPending: boolean;
    onClick: (id: number) => void;
}) {
    return (
        <ChannelActionButton
            channel={channel}
            isPending={isPending}
            ariaLabel={
                channel.isFavorite
                    ? `Remove from favorites: ${channel.guideName}`
                    : `Add to favorites: ${channel.guideName}`
            }
            icon={channel.isFavorite ? '★' : '☆'}
            isActive={channel.isFavorite ?? false}
            activeColor="var(--color-warning)"
            fontSize={FAVORITE_ICON_FONT_SIZE}
            onClick={onClick}
        />
    );
}

/** Hide toggle button for a channel card. */
function HideButton({
    channel,
    isPending,
    onClick,
}: {
    channel: ChannelWithPreference;
    isPending: boolean;
    onClick: (id: number) => void;
}) {
    return (
        <ChannelActionButton
            channel={channel}
            isPending={isPending}
            ariaLabel={
                channel.isHidden
                    ? `Unhide channel: ${channel.guideName}`
                    : `Hide channel: ${channel.guideName}`
            }
            icon="✕"
            isActive={channel.isHidden ?? false}
            activeColor="var(--color-error)"
            fontSize={HIDE_ICON_FONT_SIZE}
            onClick={onClick}
        />
    );
}

/** Favorite and hide toggle buttons rendered over a channel card. */
export function ChannelActionButtons({
    channel,
    isPending,
    onFavorite,
    onHidden,
}: {
    channel: ChannelWithPreference;
    isPending: boolean;
    onFavorite: (id: number) => void;
    onHidden: (id: number) => void;
}) {
    return (
        <div
            style={{
                position: 'absolute',
                top: 'var(--space-3)',
                right: 'var(--space-3)',
                display: 'flex',
                gap: 'var(--space-2)',
                zIndex: 10,
            }}
        >
            <FavoriteButton channel={channel} isPending={isPending} onClick={onFavorite} />
            <HideButton channel={channel} isPending={isPending} onClick={onHidden} />
        </div>
    );
}

/** Channel name, HD badge, and AC4 warning in a single row. */
function ChannelNameRow({ channel }: { channel: ChannelWithPreference }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
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
            {channel.hd === 1 && <HdBadge />}
            {isAC4Audio(channel.audioCodec) && <Ac4Badge />}
        </div>
    );
}

/** Guide-number badge with play icon. */
function GuideNumberBadge({ guideNumber }: { guideNumber: string }) {
    return (
        <div
            style={{
                backgroundColor: 'var(--color-bg-primary)',
                padding: 'var(--space-2)',
                color: 'var(--color-accent)',
                width: '80px',
                flexShrink: 0,
                borderRadius: 'var(--radius-md)',
                fontWeight: 'var(--font-weight-semibold)',
                textAlign: 'center',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 'var(--space-1)',
            }}
        >
            <span style={{ fontSize: 'var(--font-size-xs)' }} aria-hidden="true">▶</span>
            <span>{guideNumber}</span>
        </div>
    );
}

/** The clickable Card body (guide-number badge + channel info). */
function ChannelCardBody({ channel, tunerId }: {
    channel: ChannelWithPreference;
    tunerId: number;
}) {
    return (
        <Link
            href={`/tuners/${tunerId}/channel/${channel.id}`}
            className="no-underline"
            style={{ textDecoration: 'none' }}
        >
            <Card
                className="channel-card"
                style={{
                    cursor: 'pointer',
                    padding: 'var(--space-4)',
                    height: '100%',
                    transition: 'all var(--transition-fast)',
                }}
                onMouseEnter={(mouseEvent) => {
                    const target = mouseEvent.currentTarget as HTMLElement;
                    target.style.boxShadow = 'var(--shadow-md)';
                }}
                onMouseLeave={(mouseEvent) => {
                    const target = mouseEvent.currentTarget as HTMLElement;
                    target.style.boxShadow = 'var(--shadow-sm)';
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <GuideNumberBadge guideNumber={channel.guideNumber} />
                    <div style={{ flex: 1, minWidth: 0, paddingRight: '60px' }}>
                        <ChannelNameRow channel={channel} />
                    </div>
                </div>
            </Card>
        </Link>
    );
}

/** A single channel card with inline action buttons. */
export function ChannelCard({
    channel,
    tunerId,
    isPending,
    onFavorite,
    onHidden,
}: {
    channel: ChannelWithPreference;
    tunerId: number;
    isPending: boolean;
    onFavorite: (id: number) => void;
    onHidden: (id: number) => void;
}) {
    return (
        <div style={{ position: 'relative' }}>
            <ChannelActionButtons
                channel={channel}
                isPending={isPending}
                onFavorite={onFavorite}
                onHidden={onHidden}
            />
            <ChannelCardBody channel={channel} tunerId={tunerId} />
        </div>
    );
}
