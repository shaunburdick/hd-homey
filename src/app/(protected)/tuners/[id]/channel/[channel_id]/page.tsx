import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getDb } from '@/lib/database/db';
import { channels } from '@/lib/database/schema';
import { generateStreamToken } from '@/lib/stream-token';
import { getTranscodingSettings } from '@/lib/settings';
import ChannelStream from '@/components/channel-stream';
import { Card, Button } from '@/components';
import { PageContainer, InfoCard } from '@/components/layouts';

interface PageParams {
    id: string;
    channel_id: string;
}

export default async function Page({ params }: { params: Promise<PageParams> }) {
    const { id, channel_id } = await params;
    const db = await getDb();

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

    const token = await generateStreamToken(parseInt(id, 10), parseInt(channel_id, 10));
    const streamUrl = `/tuners/${id}/channel/${channel_id}/stream?token=${token}`;
    const settings = await getTranscodingSettings();

    return (
        <PageContainer maxWidth="xl">
            <div className="mb-6">
                <Link
                    href={`/tuners/${id}`}
                    className="text-secondary no-underline text-sm inline-flex items-center gap-2 mb-4"
                >
                    ← Back to Tuner
                </Link>

                <div className="flex justify-between items-start flex-wrap gap-4">
                    <div>
                        <div className="flex items-center gap-3 mb-2">
                            <span className="rounded font-semibold text-lg" style={{
                                backgroundColor: 'var(--color-bg-secondary)',
                                padding: 'var(--space-2) var(--space-3)',
                                color: 'var(--color-accent)',
                            }}>
                                {channel.guideNumber}
                            </span>
                            <h1 className="m-0">{channel.guideName}</h1>
                        </div>
                        {channel.hd && (
                            <span className="inline-block text-xs font-semibold" style={{
                                backgroundColor: 'var(--color-success-bg)',
                                color: 'var(--color-success)',
                                padding: 'var(--space-1) var(--space-2)',
                                borderRadius: 'var(--radius-sm)',
                            }}>
                                HD
                            </span>
                        )}
                    </div>

                    {settings.enabled && (
                        <Link href={`/tuners/${id}/channel/${channel_id}/watch`}>
                            <Button>▶️ Watch in Browser</Button>
                        </Link>
                    )}
                </div>
            </div>

            <div className="grid gap-5">
                <InfoCard
                    title="Channel Information"
                    items={[
                        { label: 'Guide Number', value: channel.guideNumber },
                        { label: 'Name', value: channel.guideName },
                        { label: 'Video Codec', value: channel.videoCodec },
                        { label: 'Audio Codec', value: channel.audioCodec },
                        { label: 'HD Quality', value: channel.hd ? 'Yes' : 'No' },
                    ]}
                />

                <Card>
                    <h2 className="mt-0 mb-4">Stream URL</h2>
                    <ChannelStream channel={channel} streamUrl={streamUrl} />
                    <p className="mt-4 m-0 text-sm text-tertiary">
                        💡 Copy this URL to use in VLC, Plex, or other media players
                    </p>
                </Card>
            </div>
        </PageContainer>
    );
}
