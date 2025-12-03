import { and, asc, eq, isNull } from 'drizzle-orm';
import { ChannelSection } from './ChannelSection';
import type { ChannelWithPreference } from '@/lib/database/schema';
import { channels, userChannelPreferences } from '@/lib/database/schema';
import { getDb } from '@/lib/database/db';


interface ChannelOrganizerProps {
    tunerId: number;
    userId: string;
}

/**
 * Server Component: Fetches channels with user preferences and organizes them into sections
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
    const db = await getDb();

    // Fetch channels with their preferences using LEFT JOIN
    // This ensures we get all channels, even those without preferences
    const channelsWithPrefs = await db
        .select({
            // All channel fields
            id: channels.id,
            guideNumber: channels.guideNumber,
            guideName: channels.guideName,
            url: channels.url,
            hd: channels.hd,
            videoCodec: channels.videoCodec,
            audioCodec: channels.audioCodec,
            fk_tuner: channels.fk_tuner,
            // Preference fields (may be null)
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

    // Sort channels numerically by guide number
    const sortedChannels = channelsWithPrefs.sort((a, b) => parseFloat(a.guideNumber) - parseFloat(b.guideNumber));

    // Group channels by preference state
    const favorites: ChannelWithPreference[] = [];
    const hidden: ChannelWithPreference[] = [];
    const regular: ChannelWithPreference[] = [];

    for (const channel of sortedChannels) {
        if (channel.isFavorite === true) {
            favorites.push(channel);
        } else if (channel.isHidden === true) {
            hidden.push(channel);
        } else {
            // null or false for both preferences
            regular.push(channel);
        }
    }

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
            />
        </section>
    );
}
