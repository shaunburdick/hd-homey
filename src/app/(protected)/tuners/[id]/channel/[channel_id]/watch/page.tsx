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

export const dynamic = 'force-dynamic';

interface PageParams {
    id: string;
    channel_id: string;
}

export default async function WatchPage({ params }: { params: Promise<PageParams> }) {
    const { id, channel_id } = await params;
    const db = await getDb();

    // Get channel info from database
    const channel = await db.query.channels.findFirst({
        where: and(
            eq(channels.id, parseInt(channel_id, 10)),
            eq(channels.fk_tuner, parseInt(id, 10)),
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
            <PageContainer>
                <h1>
                    Channel {channel.guideNumber}: {channel.guideName}
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

    // Generate signed stream URL for HLS playlist
    const token = await generateStreamToken(parseInt(id, 10), parseInt(channel_id, 10));
    const playlistUrl = `/api/transcode/${id}/${channel_id}/playlist.m3u8?token=${token}`;

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
