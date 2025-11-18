import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getDb } from '@/lib/database/db';
import { channels } from '@/lib/database/schema';
import { generateStreamToken } from '@/lib/stream-token';
import { getTranscodingSettings } from '@/lib/settings';
import ChannelStream from '@/components/channel-stream';
import { Card } from '@/components';

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
        <div className="container" style={{ maxWidth: '1200px' }}>
            <div style={{ marginBottom: 'var(--space-6)' }}>
                <Link
                    href={`/tuners/${id}`}
                    style={{
                        color: 'var(--color-text-secondary)',
                        textDecoration: 'none',
                        fontSize: 'var(--font-size-sm)',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 'var(--space-2)',
                        marginBottom: 'var(--space-4)',
                    }}
                >
                    ← Back to Tuner
                </Link>

                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    flexWrap: 'wrap',
                    gap: 'var(--space-4)',
                }}>
                    <div>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 'var(--space-3)',
                            marginBottom: 'var(--space-2)',
                        }}>
                            <span style={{
                                backgroundColor: 'var(--color-bg-secondary)',
                                padding: 'var(--space-2) var(--space-3)',
                                borderRadius: 'var(--radius-md)',
                                fontWeight: 'var(--font-weight-semibold)',
                                color: 'var(--color-accent)',
                                fontSize: 'var(--font-size-lg)',
                            }}>
                                {channel.guideNumber}
                            </span>
                            <h1 style={{ margin: 0 }}>{channel.guideName}</h1>
                        </div>
                        {channel.hd && (
                            <span style={{
                                display: 'inline-block',
                                backgroundColor: 'var(--color-success-bg)',
                                color: 'var(--color-success)',
                                padding: 'var(--space-1) var(--space-2)',
                                borderRadius: 'var(--radius-sm)',
                                fontSize: 'var(--font-size-xs)',
                                fontWeight: 'var(--font-weight-semibold)',
                            }}>
                                HD
                            </span>
                        )}
                    </div>

                    {settings.enabled && (
                        <Link href={`/tuners/${id}/channel/${channel_id}/watch`}>
                            <button style={{
                                minHeight: 'var(--button-height)',
                                padding: 'var(--space-3) var(--space-5)',
                                borderRadius: 'var(--radius-md)',
                                fontWeight: 'var(--font-weight-medium)',
                                fontSize: 'var(--font-size-base)',
                                cursor: 'pointer',
                                transition: 'all var(--transition-fast)',
                                backgroundColor: 'var(--color-accent)',
                                color: 'white',
                                border: 'none',
                            }}>
                                ▶️ Watch in Browser
                            </button>
                        </Link>
                    )}
                </div>
            </div>

            <div style={{
                display: 'grid',
                gap: 'var(--space-5)',
                gridTemplateColumns: '1fr',
            }}>
                <Card>
                    <h2 style={{ marginTop: 0, marginBottom: 'var(--space-4)' }}>
                        Channel Information
                    </h2>
                    <dl style={{
                        display: 'grid',
                        gridTemplateColumns: 'auto 1fr',
                        gap: 'var(--space-3)',
                        marginBottom: 0,
                    }}>
                        <dt style={{
                            fontWeight: 'var(--font-weight-semibold)',
                            color: 'var(--color-text-secondary)',
                        }}>
                            Guide Number
                        </dt>
                        <dd style={{ margin: 0 }}>{channel.guideNumber}</dd>

                        <dt style={{
                            fontWeight: 'var(--font-weight-semibold)',
                            color: 'var(--color-text-secondary)',
                        }}>
                            Name
                        </dt>
                        <dd style={{ margin: 0 }}>{channel.guideName}</dd>

                        <dt style={{
                            fontWeight: 'var(--font-weight-semibold)',
                            color: 'var(--color-text-secondary)',
                        }}>
                            Video Codec
                        </dt>
                        <dd style={{ margin: 0 }}>{channel.videoCodec}</dd>

                        <dt style={{
                            fontWeight: 'var(--font-weight-semibold)',
                            color: 'var(--color-text-secondary)',
                        }}>
                            Audio Codec
                        </dt>
                        <dd style={{ margin: 0 }}>{channel.audioCodec}</dd>

                        <dt style={{
                            fontWeight: 'var(--font-weight-semibold)',
                            color: 'var(--color-text-secondary)',
                        }}>
                            HD Quality
                        </dt>
                        <dd style={{ margin: 0 }}>{channel.hd ? 'Yes' : 'No'}</dd>
                    </dl>
                </Card>

                <Card>
                    <h2 style={{ marginTop: 0, marginBottom: 'var(--space-4)' }}>
                        Stream URL
                    </h2>
                    <ChannelStream channel={channel} streamUrl={streamUrl} />
                    <p style={{
                        marginTop: 'var(--space-4)',
                        marginBottom: 0,
                        fontSize: 'var(--font-size-sm)',
                        color: 'var(--color-text-tertiary)',
                    }}>
                        💡 Copy this URL to use in VLC, Plex, or other media players
                    </p>
                </Card>
            </div>
        </div>
    );
}
