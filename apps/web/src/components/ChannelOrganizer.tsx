import { and, asc, eq, isNull } from 'drizzle-orm';
import { ChannelSection } from './ChannelSection';
import type { ChannelWithPreference } from '@/lib/database/schema';
import { channels, userChannelPreferences } from '@/lib/database/schema';
import { getDb } from '@/lib/database/db';


interface ChannelOrganizerProps {
    tunerId: number;
    userId: string;
}

interface ChannelGroups {
    favorites: ChannelWithPreference[];
    regular: ChannelWithPreference[];
    hidden: ChannelWithPreference[];
}

/**
 * Compares two channels numerically by their guide number string.
 * Used as the comparator for Array.sort.
 */
function compareByGuideNumber(
    channelA: ChannelWithPreference,
    channelB: ChannelWithPreference
): number {
    return parseFloat(channelA.guideNumber) - parseFloat(channelB.guideNumber);
}

/**
 * Groups a flat list of channels into favorites, regular, and hidden buckets.
 */
function groupChannels(channelList: ChannelWithPreference[]): ChannelGroups {
    const favorites: ChannelWithPreference[] = [];
    const hidden: ChannelWithPreference[] = [];
    const regular: ChannelWithPreference[] = [];

    for (const channel of channelList) {
        if (channel.isFavorite === true) {
            favorites.push(channel);
        } else if (channel.isHidden === true) {
            hidden.push(channel);
        } else {
            // null or false for both preferences
            regular.push(channel);
        }
    }

    return { favorites, regular, hidden };
}

/**
 * Fetches all active channels for the given tuner, joined with the user's
 * channel preferences (LEFT JOIN so all channels are included).
 */
async function fetchChannelsWithPreferences({
    tunerId,
    userId,
}: {
    tunerId: number;
    userId: string;
}): Promise<ChannelWithPreference[]> {
    const db = await getDb();

    return db
        .select({
            id: channels.id,
            guideNumber: channels.guideNumber,
            guideName: channels.guideName,
            url: channels.url,
            hd: channels.hd,
            videoCodec: channels.videoCodec,
            audioCodec: channels.audioCodec,
            fk_tuner: channels.fk_tuner,
            isFavorite: userChannelPreferences.isFavorite,
            isHidden: userChannelPreferences.isHidden,
        })
        .from(channels)
        .leftJoin(
            userChannelPreferences,
            and(
                eq(userChannelPreferences.channelId, channels.id),
                eq(userChannelPreferences.userId, userId)
            )
        )
        .where(
            and(
                eq(channels.fk_tuner, tunerId),
                eq(channels.is_active, true),
                isNull(channels.deleted_at)
            )
        )
        .orderBy(asc(channels.guideNumber))
        .all();
}

/**
 * Server Component: Fetches channels with user preferences and organizes them into sections.
 *
 * Displays channels in three groups:
 * - Favorites: Channels marked as favorite
 * - Regular: Channels with no preferences or neutral preferences
 * - Hidden: Channels marked as hidden
 *
 * @param tunerId - The tuner ID to fetch channels for
 * @param userId - The user ID to fetch preferences for
 */
export async function ChannelOrganizer({ tunerId, userId }: ChannelOrganizerProps) {
    const channelsWithPrefs = await fetchChannelsWithPreferences({ tunerId, userId });

    // Sort channels numerically by guide number
    const sortedChannels = channelsWithPrefs.sort(compareByGuideNumber);

    const { favorites, regular, hidden } = groupChannels(sortedChannels);

    return (
        <section aria-label="Channel organizer">
            <ChannelSection
                title="Favorites"
                channels={favorites}
                tunerId={tunerId}
                emptyMessage="No favorite channels yet. Mark channels as favorites to see them here."
            />
            <ChannelSection
                title="Channels"
                channels={regular}
                tunerId={tunerId}
                emptyMessage="All channels are either favorited or hidden."
            />
            <ChannelSection
                title="Hidden"
                channels={hidden}
                tunerId={tunerId}
                emptyMessage="No hidden channels. Hide channels you don't want to see in the main list."
                defaultExpanded={false}
            />
        </section>
    );
}
