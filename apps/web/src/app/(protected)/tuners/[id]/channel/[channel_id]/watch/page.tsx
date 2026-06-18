import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getDb } from '@/lib/database/db';
import { channels } from '@/lib/database/schema';
import { generateStreamToken } from '@/lib/stream-token';
import { getTranscodingSettings } from '@/lib/settings';
import VideoPlayer from '@/components/video-player';
import { Card } from '@/components';
import { PageContainer, InfoCard } from '@/components/layouts';
import Config from '@/lib/config';

export const dynamic = 'force-dynamic';

/** Radix for parsing integer route parameters */
const DECIMAL_RADIX = 10;

interface PageParams {
    id: string;
    channel_id: string;
}

/** Renders the disabled-transcoding message when in-browser playback is unavailable */
function TranscodingDisabledCard({ id, channel_id, guideNumber, guideName }: {
    id: string;
    channel_id: string;
    guideNumber: string;
    guideName: string;
}) {
    return (
        <PageContainer>
            <h1>
                Channel {guideNumber}: {guideName}
            </h1>

            <Card className="p-4 mb-4 bg-warning">
                <h3 className="mt-0">Transcoding Not Available</h3>
                <p>
                    In-browser playback is not available.
                    Transcoding is not enabled on this server.
                </p>
                <p className="m-0">
                    <Link href={`/tuners/${id}/channel/${channel_id}`}>
                        ← Back to Channel Info
                    </Link>
                </p>
            </Card>
        </PageContainer>
    );
}

interface ChannelInfo {
    guideNumber: string;
    guideName: string;
    videoCodec: string;
    audioCodec: string;
    hd: number | null;
}

/** Renders the video player section with channel info details and navigation links */
function WatchPlayerView({
    channel,
    id,
    channel_id,
    playlistUrl,
}: {
    channel: ChannelInfo;
    id: string;
    channel_id: string;
    playlistUrl: string;
}) {
    return (
        <PageContainer>
            <h1>
                Watch Channel {channel.guideNumber}: {channel.guideName}
            </h1>

            <VideoPlayer
                playlistUrl={playlistUrl}
                channelName={channel.guideName}
                autoplay={true}
            />

            <details className="mt-4">
                <summary style={{ cursor: 'pointer' }} className="p-3 font-semibold">
                    Channel Information
                </summary>
                <div className="mt-3">
                    <InfoCard
                        items={[
                            { label: 'Guide Number', value: channel.guideNumber },
                            { label: 'Name', value: channel.guideName },
                            { label: 'Video Codec', value: channel.videoCodec },
                            { label: 'Audio Codec', value: channel.audioCodec },
                            { label: 'HD', value: channel.hd ? 'Yes' : 'No' },
                        ]}
                    />
                </div>
            </details>

            <p className="mt-4">
                <Link href={`/tuners/${id}/channel/${channel_id}`}>
                    ← Back to Channel Info
                </Link>
                {' | '}
                <Link href={`/tuners/${id}`}>
                    View All Channels
                </Link>
            </p>
        </PageContainer>
    );
}

export default async function WatchPage({ params }: { params: Promise<PageParams> }) {
    const { id, channel_id } = await params;
    const db = await getDb();

    // Get channel info from database
    const channel = await db.query.channels.findFirst({
        where: and(
            eq(channels.id, parseInt(channel_id, DECIMAL_RADIX)),
            eq(channels.fk_tuner, parseInt(id, DECIMAL_RADIX)),
            isNull(channels.deleted_at)
        ),
    });

    if (!channel) {
        notFound();
    }

    // Check if transcoding is enabled
    const settings = await getTranscodingSettings();

    if (!settings.enabled) {
        return (
            <TranscodingDisabledCard
                id={id}
                channel_id={channel_id}
                guideNumber={channel.guideNumber}
                guideName={channel.guideName}
            />
        );
    }

    // Generate signed stream URL for HLS playlist.
    // Include the basePath prefix so the HLS player fetches segments from the correct path
    // when the app is deployed under a sub-path (e.g., /hd-homey/api/transcode/...).
    const token = await generateStreamToken(parseInt(id, DECIMAL_RADIX), parseInt(channel_id, DECIMAL_RADIX));
    const playlistUrl = `${Config.BASE_PATH}/api/transcode/${id}/${channel_id}/playlist.m3u8?token=${token}`;

    return (
        <WatchPlayerView
            channel={channel}
            id={id}
            channel_id={channel_id}
            playlistUrl={playlistUrl}
        />
    );
}
