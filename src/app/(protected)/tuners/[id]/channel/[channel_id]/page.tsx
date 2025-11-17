import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/database/db';
import { channels } from '@/lib/database/schema';
import { generateStreamToken } from '@/lib/stream-token';
import ChannelStream from '@/components/channel-stream';

interface PageParams {
    id: string;
    channel_id: string;
}

export default async function Page({ params }: { params: Promise<PageParams> }) {
    const { id, channel_id } = await params;
    const db = await getDb();

    // Get channel info from database
    const channel = await db.query.channels.findFirst({
        where: and(
            eq(channels.id, parseInt(channel_id, 10)),
            eq(channels.fk_tuner, parseInt(id, 10)),
            isNull(channels.deleted_at)
        )
    });

    if (!channel) {
        notFound();
    }

    // Generate signed stream URL
    const token = await generateStreamToken(parseInt(id, 10), parseInt(channel_id, 10));
    const streamUrl = `/tuners/${id}/channel/${channel_id}/stream?token=${token}`;

    return (
        <main>
            <h1>Channel {channel.guideNumber}: {channel.guideName}</h1>

            <h2>Channel Information</h2>
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

            <h2>Stream</h2>
            <ChannelStream channel={channel} streamUrl={streamUrl} />

            <p>
                <a href={`/tuners/${id}`}>← Back to Tuner</a>
            </p>
        </main>
    );
}
