import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/database/db';
import { channels } from '@/lib/database/schema';
import { generateStreamToken } from '@/lib/stream-token';
import { getTranscodingSettings } from '@/lib/settings';
import VideoPlayer from '@/components/video-player';

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
            <main>
                <h1>
                    Channel
                    {' '}
                    {channel.guideNumber}
                    :
                    {' '}
                    {channel.guideName}
                </h1>

                <div
                    style={{
                        padding: '1rem',
                        backgroundColor: '#fff3cd',
                        border: '1px solid #ffc107',
                        marginBottom: '1rem',
                    }}
                >
                    <h3>Transcoding Not Available</h3>
                    <p>
                        In-browser playback is not available.
                        Transcoding is not enabled on this server.
                    </p>
                    <p>
                        <a href={`/tuners/${id}/channel/${channel_id}`}>
                            ← Back to Channel Info
                        </a>
                    </p>
                </div>
            </main>
        );
    }

    // Generate signed stream URL for HLS playlist
    const token = await generateStreamToken(parseInt(id, 10), parseInt(channel_id, 10));
    const playlistUrl = `/api/transcode/${id}/${channel_id}/playlist.m3u8?token=${token}`;

    return (
        <main>
            <h1>
                Watch Channel
                {' '}
                {channel.guideNumber}
                :
                {' '}
                {channel.guideName}
            </h1>

            <VideoPlayer
                playlistUrl={playlistUrl}
                channelName={channel.guideName}
                autoplay={true}
            />

            <details style={{ marginTop: '1rem' }}>
                <summary>Channel Information</summary>
                <dl>
                    <dt>Guide Number</dt>
                    <dd>{channel.guideNumber}</dd>

                    <dt>Name</dt>
                    <dd>{channel.guideName}</dd>

                    <dt>Video Codec</dt>
                    <dd>{channel.videoCodec}</dd>

                    <dt>Audio Codec</dt>
                    <dd>{channel.audioCodec}</dd>

                    <dt>HD</dt>
                    <dd>{channel.hd ? 'Yes' : 'No'}</dd>
                </dl>
            </details>

            <p style={{ marginTop: '1rem' }}>
                <a href={`/tuners/${id}/channel/${channel_id}`}>
                    ← Back to Channel Info
                </a>
                {' '}
                |
                {' '}
                <a href={`/tuners/${id}`}>
                    View All Channels
                </a>
            </p>
        </main>
    );
}
