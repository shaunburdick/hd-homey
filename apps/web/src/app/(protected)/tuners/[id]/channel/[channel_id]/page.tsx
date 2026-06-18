import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getDb } from '@/lib/database/db';
import { channels } from '@/lib/database/schema';
import type { Channel } from '@/lib/database/schema';
import { generateStreamToken } from '@/lib/stream-token';
import { getTranscodingSettings } from '@/lib/settings';
import ChannelStream from '@/components/channel-stream';
import { Card, Button } from '@/components';
import { PageContainer, InfoCard } from '@/components/layouts';
import Config from '@/lib/config';
interface PageParams {
    id: string;
    channel_id: string;
}

/**
 * Check if audio codec is AC4
 */
function isAC4Audio(audioCodec: string): boolean {
    const codec = audioCodec.toLowerCase();
    return codec.includes('ac4') || codec.includes('ac-4');
}

/** Renders a warning banner when a channel uses the unsupported AC4 audio codec */
function AC4Warning() {
    return (
        <div
            className="p-4 rounded-md mb-5"
            style={{
                backgroundColor: 'var(--color-warning-bg)',
                border: '1px solid var(--color-warning)',
            }}
        >
            <div className="flex items-start gap-3">
                <span style={{ fontSize: '1.5rem', lineHeight: '1' }}>⚠️</span>
                <div>
                    <h3 className="mt-0 mb-2" style={{ color: 'var(--color-warning)' }}>
                        AC4 Audio Not Supported
                    </h3>
                    <p className="m-0 text-sm">
                        This channel uses AC4 audio codec which is not yet supported by most media players.
                        <strong> Video will play but audio will be silent</strong> when transcoding is enabled.
                        Try using the direct stream URL in a compatible player, or wait for broader AC4 support.
                    </p>
                </div>
            </div>
        </div>
    );
}

/** Renders the channel guide number badge, name heading, and HD quality badge */
function ChannelTitle({ guideNumber, guideName, isHD }: { guideNumber: string; guideName: string; isHD: boolean }) {
    return (
        <div>
            <div className="flex items-center gap-3 mb-2">
                <span className="rounded font-semibold text-lg" style={{
                    backgroundColor: 'var(--color-bg-secondary)',
                    padding: 'var(--space-2) var(--space-3)',
                    color: 'var(--color-accent)',
                }}>
                    {guideNumber}
                </span>
                <h1 className="m-0">{guideName}</h1>
            </div>
            {isHD && (
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
    );
}

/** Renders the channel title, HD badge, and optional Watch in Browser link */
function ChannelHeader({
    channel,
    id,
    channel_id,
    transcodeEnabled,
}: {
    channel: Channel;
    id: string;
    channel_id: string;
    transcodeEnabled: boolean;
}) {
    return (
        <div className="mb-6">
            <Link
                href={`/tuners/${id}`}
                className="text-secondary no-underline text-sm inline-flex items-center gap-2 mb-4"
            >
                ← Back to Tuner
            </Link>

            <div className="flex justify-between items-start flex-wrap gap-4">
                <ChannelTitle
                    guideNumber={channel.guideNumber}
                    guideName={channel.guideName}
                    isHD={channel.hd === 1}
                />

                {transcodeEnabled && (
                    <Link href={`/tuners/${id}/channel/${channel_id}/watch`}>
                        <Button>▶️ Watch in Browser</Button>
                    </Link>
                )}
            </div>
        </div>
    );
}

/** Renders the channel info card and stream URL card */
function ChannelDetailsPanel({
    channel,
    streamUrl,
    hasAC4Audio,
}: {
    channel: Channel;
    streamUrl: string;
    hasAC4Audio: boolean;
}) {
    return (
        <div className="grid gap-5">
            <InfoCard
                title="Channel Information"
                items={[
                    { label: 'Guide Number', value: channel.guideNumber },
                    { label: 'Name', value: channel.guideName },
                    { label: 'Video Codec', value: channel.videoCodec },
                    {
                        label: 'Audio Codec',
                        value: hasAC4Audio
                            ? `${channel.audioCodec} ⚠️ (Not supported - silent audio)`
                            : channel.audioCodec
                    },
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
    );
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
    // Include the basePath prefix so the URL works when served under a sub-path
    // (e.g., https://example.com/hd-homey/tuners/.../stream?token=...).
    // External media players (VLC, Plex) need the full URL path including the prefix.
    const streamUrl = `${Config.BASE_PATH}/tuners/${id}/channel/${channel_id}/stream?token=${token}`;
    const settings = await getTranscodingSettings();
    const hasAC4Audio = isAC4Audio(channel.audioCodec);

    return (
        <PageContainer maxWidth="xl">
            <ChannelHeader
                channel={channel}
                id={id}
                channel_id={channel_id}
                transcodeEnabled={settings.enabled}
            />

            {hasAC4Audio && <AC4Warning />}

            <ChannelDetailsPanel channel={channel} streamUrl={streamUrl} hasAC4Audio={hasAC4Audio} />
        </PageContainer>
    );
}
