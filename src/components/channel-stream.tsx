'use client';

import { useState } from 'react';
import Logger from '@/lib/logger';
import type { Channel } from '@/lib/database/schema';

interface ChannelStreamProps {
    channel: Channel;
    streamUrl: string;
}

export default function ChannelStream({ streamUrl }: ChannelStreamProps) {
    const [isCopied, setIsCopied] = useState(false);

    // Convert relative URL to absolute for VLC (client-side only)
    const channelLink = typeof window !== 'undefined' && streamUrl.startsWith('/')
        ? new URL(streamUrl, window.location.origin).toString()
        : streamUrl;

    const handleCopy = async () => {
        try {
            Logger.debug(`Copying ${channelLink} to clipboard...`);
            await navigator.clipboard.writeText(channelLink.toString());
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            Logger.error({ err }, 'Failed to copy to clipboard');
        }
    };

    return (
        <>
            <p>
                Copy this <a href={channelLink}>Link</a> into your favorite media player.
            </p>
            <div style={{ marginBottom: 'var(--space-4)' }}>
                <input
                    id="channelLink"
                    type='text'
                    value={channelLink}
                    onFocus={(e) => e.target.select()}
                    readOnly
                    style={{
                        width: '100%',
                        fontFamily: 'monospace',
                        fontSize: '0.85em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginBottom: 'var(--space-3)',
                    }}
                />
                <button
                    onClick={handleCopy}
                    style={{
                        backgroundColor: isCopied ? 'var(--color-success)' : undefined,
                    }}
                >
                    {isCopied ? '✓ Copied!' : '📋 Copy to Clipboard'}
                </button>
            </div>

            <h3>Playback Instructions</h3>
            <div>
                For example, in <a href="https://www.videolan.org/vlc/">VLC</a>:
                <ol>
                    <li>Navigate to <em>{'File > Open Network...'}</em></li>
                    <li>Paste in the link</li>
                    <li>Click Play</li>
                </ol>
            </div>
        </>
    );
}
