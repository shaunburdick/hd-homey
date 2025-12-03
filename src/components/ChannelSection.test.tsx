/**
 * ChannelSection Component Tests
 *
 * Tests for the ChannelSection component that displays channels with
 * favorite/hidden actions and badges (HD, AC4).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { ChannelSection } from './ChannelSection';
import type { ChannelWithPreference } from '@/lib/database/schema';

// Mock Next.js router
vi.mock('next/navigation', () => ({
    useRouter: () => ({
        push: vi.fn(),
        replace: vi.fn(),
        refresh: vi.fn(),
    }),
}));

// Mock server actions
vi.mock('@/lib/actions/channel-preferences', () => ({
    toggleFavoriteAction: vi.fn(() => Promise.resolve({ success: true })),
    toggleHiddenAction: vi.fn(() => Promise.resolve({ success: true })),
}));

describe('ChannelSection', () => {
    // Constants to avoid duplicate strings
    const CHANNEL_URL_BASE = 'http://tuner/channel/';
    const H264_CODEC = 'h264';

    afterEach(() => {
        cleanup();
    });

    const mockChannels: ChannelWithPreference[] = [
        {
            id: 1,
            guideNumber: '2.1',
            guideName: 'NBC HD',
            url: `${CHANNEL_URL_BASE}1`,
            hd: 1,
            videoCodec: H264_CODEC,
            audioCodec: 'aac',
            fk_tuner: 1,
            isFavorite: false,
            isHidden: false,
        },
        {
            id: 2,
            guideNumber: '4.1',
            guideName: 'CBS HD',
            url: `${CHANNEL_URL_BASE}2`,
            hd: 1,
            videoCodec: 'hevc',
            audioCodec: 'ac4',
            fk_tuner: 1,
            isFavorite: false,
            isHidden: false,
        },
        {
            id: 3,
            guideNumber: '7.1',
            guideName: 'ABC SD',
            url: `${CHANNEL_URL_BASE}3`,
            hd: 0,
            videoCodec: H264_CODEC,
            audioCodec: 'aac',
            fk_tuner: 1,
            isFavorite: false,
            isHidden: false,
        },
        {
            id: 4,
            guideNumber: '11.1',
            guideName: 'FOX HD (AC-4)',
            url: `${CHANNEL_URL_BASE}4`,
            hd: 1,
            videoCodec: 'hevc',
            audioCodec: 'AC-4',
            fk_tuner: 1,
            isFavorite: false,
            isHidden: false,
        },
        {
            id: 5,
            guideNumber: '13.1',
            guideName: 'PBS HD',
            url: `${CHANNEL_URL_BASE}5`,
            hd: 1,
            videoCodec: H264_CODEC,
            audioCodec: null,
            fk_tuner: 1,
            isFavorite: false,
            isHidden: false,
        },
    ];

    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Basic Rendering', () => {
        it('should render section with title and channel count', () => {
            render(
                <ChannelSection
                    title="Favorites"
                    channels={mockChannels}
                    tunerId={1}
                />
            );

            expect(screen.getByRole('heading', { name: /Favorites \(5\)/i })).toBeDefined();
        });

        it('should render all channels', () => {
            render(
                <ChannelSection
                    title="Channels"
                    channels={mockChannels}
                    tunerId={1}
                />
            );

            expect(screen.getByText('NBC HD')).toBeDefined();
            expect(screen.getByText('CBS HD')).toBeDefined();
            expect(screen.getByText('ABC SD')).toBeDefined();
            expect(screen.getByText('FOX HD (AC-4)')).toBeDefined();
            expect(screen.getByText('PBS HD')).toBeDefined();
        });

        it('should show empty message when no channels', () => {
            render(
                <ChannelSection
                    title="Hidden"
                    channels={[]}
                    tunerId={1}
                    emptyMessage="No hidden channels"
                />
            );

            expect(screen.getByText('No hidden channels')).toBeDefined();
        });
    });

    describe('HD Badge Display', () => {
        it('should show HD badge for HD channels', () => {
            render(
                <ChannelSection
                    title="Channels"
                    channels={mockChannels}
                    tunerId={1}
                />
            );

            const hdBadges = screen.getAllByText('✓ HD');
            // 4 HD channels in mockChannels
            expect(hdBadges).toHaveLength(4);
        });

        it('should not show HD badge for SD channels', () => {
            const sdChannels: ChannelWithPreference[] = [
                {
                    id: 1,
                    guideNumber: '7.1',
                    guideName: 'ABC SD',
                    url: `${CHANNEL_URL_BASE}3`,
                    hd: 0,
                    videoCodec: H264_CODEC,
                    audioCodec: 'aac',
                    fk_tuner: 1,
                    isFavorite: false,
                    isHidden: false,
                },
            ];

            render(
                <ChannelSection
                    title="Channels"
                    channels={sdChannels}
                    tunerId={1}
                />
            );

            expect(screen.queryByText('✓ HD')).toBeNull();
        });
    });

    describe('AC4 Badge Display', () => {
        it('should show AC4 badge for channels with ac4 audio codec (lowercase)', () => {
            const ac4Channel: ChannelWithPreference[] = [
                {
                    id: 2,
                    guideNumber: '4.1',
                    guideName: 'CBS HD',
                    url: `${CHANNEL_URL_BASE}2`,
                    hd: 1,
                    videoCodec: 'hevc',
                    audioCodec: 'ac4',
                    fk_tuner: 1,
                    isFavorite: false,
                    isHidden: false,
                },
            ];

            render(
                <ChannelSection
                    title="Channels"
                    channels={ac4Channel}
                    tunerId={1}
                />
            );

            const ac4Badge = screen.getByText('⚠️ AC4');
            expect(ac4Badge).toBeDefined();
            expect(ac4Badge.getAttribute('title')).toBe('AC4 audio not supported - silent audio');
        });

        it('should show AC4 badge for channels with AC-4 audio codec (with hyphen, uppercase)', () => {
            const ac4Channel: ChannelWithPreference[] = [
                {
                    id: 4,
                    guideNumber: '11.1',
                    guideName: 'FOX HD',
                    url: `${CHANNEL_URL_BASE}4`,
                    hd: 1,
                    videoCodec: 'hevc',
                    audioCodec: 'AC-4',
                    fk_tuner: 1,
                    isFavorite: false,
                    isHidden: false,
                },
            ];

            render(
                <ChannelSection
                    title="Channels"
                    channels={ac4Channel}
                    tunerId={1}
                />
            );

            expect(screen.getByText('⚠️ AC4')).toBeDefined();
        });

        it('should not show AC4 badge for channels with non-AC4 audio codecs', () => {
            const nonAc4Channels: ChannelWithPreference[] = [
                {
                    id: 1,
                    guideNumber: '2.1',
                    guideName: 'NBC HD',
                    url: `${CHANNEL_URL_BASE}1`,
                    hd: 1,
                    videoCodec: H264_CODEC,
                    audioCodec: 'aac',
                    fk_tuner: 1,
                    isFavorite: false,
                    isHidden: false,
                },
            ];

            render(
                <ChannelSection
                    title="Channels"
                    channels={nonAc4Channels}
                    tunerId={1}
                />
            );

            expect(screen.queryByText('⚠️ AC4')).toBeNull();
        });

        it('should not show AC4 badge for channels with null audio codec', () => {
            const nullAudioChannel: ChannelWithPreference[] = [
                {
                    id: 5,
                    guideNumber: '13.1',
                    guideName: 'PBS HD',
                    url: `${CHANNEL_URL_BASE}5`,
                    hd: 1,
                    videoCodec: H264_CODEC,
                    audioCodec: null,
                    fk_tuner: 1,
                    isFavorite: false,
                    isHidden: false,
                },
            ];

            render(
                <ChannelSection
                    title="Channels"
                    channels={nullAudioChannel}
                    tunerId={1}
                />
            );

            expect(screen.queryByText('⚠️ AC4')).toBeNull();
        });

        it('should show both HD and AC4 badges for HD channels with AC4 audio', () => {
            const hdAc4Channel: ChannelWithPreference[] = [
                {
                    id: 2,
                    guideNumber: '4.1',
                    guideName: 'CBS HD',
                    url: `${CHANNEL_URL_BASE}2`,
                    hd: 1,
                    videoCodec: 'hevc',
                    audioCodec: 'ac4',
                    fk_tuner: 1,
                    isFavorite: false,
                    isHidden: false,
                },
            ];

            render(
                <ChannelSection
                    title="Channels"
                    channels={hdAc4Channel}
                    tunerId={1}
                />
            );

            expect(screen.getByText('✓ HD')).toBeDefined();
            expect(screen.getByText('⚠️ AC4')).toBeDefined();
        });

        it('should display AC4 badge count correctly when multiple AC4 channels exist', () => {
            render(
                <ChannelSection
                    title="Channels"
                    channels={mockChannels}
                    tunerId={1}
                />
            );

            const ac4Badges = screen.getAllByText('⚠️ AC4');
            // 2 AC4 channels in mockChannels (CBS with 'ac4', FOX with 'AC-4')
            expect(ac4Badges).toHaveLength(2);
        });
    });

    describe('Badge Accessibility', () => {
        it('should have proper aria-label for HD badge', () => {
            const hdChannel: ChannelWithPreference[] = [
                {
                    id: 1,
                    guideNumber: '2.1',
                    guideName: 'NBC HD',
                    url: `${CHANNEL_URL_BASE}1`,
                    hd: 1,
                    videoCodec: H264_CODEC,
                    audioCodec: 'aac',
                    fk_tuner: 1,
                    isFavorite: false,
                    isHidden: false,
                },
            ];

            render(
                <ChannelSection
                    title="Channels"
                    channels={hdChannel}
                    tunerId={1}
                />
            );

            const hdBadge = screen.getByLabelText('High Definition');
            expect(hdBadge).toBeDefined();
        });

        it('should have proper aria-label and title for AC4 badge', () => {
            const ac4Channel: ChannelWithPreference[] = [
                {
                    id: 2,
                    guideNumber: '4.1',
                    guideName: 'CBS HD',
                    url: `${CHANNEL_URL_BASE}2`,
                    hd: 1,
                    videoCodec: 'hevc',
                    audioCodec: 'ac4',
                    fk_tuner: 1,
                    isFavorite: false,
                    isHidden: false,
                },
            ];

            render(
                <ChannelSection
                    title="Channels"
                    channels={ac4Channel}
                    tunerId={1}
                />
            );

            const ac4Badge = screen.getByLabelText('AC4 audio codec - not supported');
            expect(ac4Badge).toBeDefined();
            expect(ac4Badge.getAttribute('title')).toBe('AC4 audio not supported - silent audio');
        });
    });

    describe('Channel Links', () => {
        it('should link to correct channel detail page', () => {
            render(
                <ChannelSection
                    title="Channels"
                    channels={[mockChannels[0]]}
                    tunerId={1}
                />
            );

            const link = screen.getByRole('link', { name: /NBC HD/i });
            expect(link.getAttribute('href')).toBe('/tuners/1/channel/1');
        });
    });

    describe('Action Buttons', () => {
        it('should render favorite and hide buttons for each channel', () => {
            render(
                <ChannelSection
                    title="Channels"
                    channels={[mockChannels[0]]}
                    tunerId={1}
                />
            );

            const favoriteButton = screen.getByLabelText(/Add to favorites: NBC HD/i);
            const hideButton = screen.getByLabelText(/Hide channel: NBC HD/i);

            expect(favoriteButton).toBeDefined();
            expect(hideButton).toBeDefined();
        });
    });

    describe('Edge Cases', () => {
        it('should handle channels with mixed case audio codec names', () => {
            const mixedCaseChannel: ChannelWithPreference[] = [
                {
                    id: 1,
                    guideNumber: '2.1',
                    guideName: 'Test Channel',
                    url: `${CHANNEL_URL_BASE}1`,
                    hd: 1,
                    videoCodec: 'hevc',
                    audioCodec: 'Ac4',
                    fk_tuner: 1,
                    isFavorite: false,
                    isHidden: false,
                },
            ];

            render(
                <ChannelSection
                    title="Channels"
                    channels={mixedCaseChannel}
                    tunerId={1}
                />
            );

            expect(screen.getByText('⚠️ AC4')).toBeDefined();
        });

        it('should handle empty audio codec string', () => {
            const emptyAudioChannel: ChannelWithPreference[] = [
                {
                    id: 1,
                    guideNumber: '2.1',
                    guideName: 'Test Channel',
                    url: `${CHANNEL_URL_BASE}1`,
                    hd: 1,
                    videoCodec: H264_CODEC,
                    audioCodec: '',
                    fk_tuner: 1,
                    isFavorite: false,
                    isHidden: false,
                },
            ];

            render(
                <ChannelSection
                    title="Channels"
                    channels={emptyAudioChannel}
                    tunerId={1}
                />
            );

            expect(screen.queryByText('⚠️ AC4')).toBeNull();
        });
    });
});
