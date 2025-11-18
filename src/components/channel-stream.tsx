'use client';

import { useState, useEffect } from 'react';
import Logger from '@/lib/logger';
import type { Channel } from '@/lib/database/schema';

interface ChannelStreamProps {
    channel: Channel;
    streamUrl: string;
}

export default function ChannelStream({ streamUrl }: ChannelStreamProps) {
    const [isCopied, setIsCopied] = useState(false);
    const [channelLink, setChannelLink] = useState(streamUrl);

    // Convert relative URL to absolute for VLC (client-side only)
    useEffect(() => {
        if (streamUrl.startsWith('/')) {
            setChannelLink(new URL(streamUrl, window.location.origin).toString());
        }
    }, [streamUrl]);

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
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                        fontFamily: 'monospace',
                        fontSize: '0.85em',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        marginBottom: 'var(--space-3)',
                        backgroundColor: 'var(--color-bg-tertiary)',
                        color: 'var(--color-text-primary)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 'var(--radius-md)',
                        padding: 'var(--space-3)',
                    }}
                />
                <button
                    onClick={handleCopy}
                    style={{
                        minHeight: 'var(--button-height)',
                        padding: 'var(--space-3) var(--space-5)',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 'var(--font-weight-medium)',
                        fontSize: 'var(--font-size-base)',
                        cursor: 'pointer',
                        transition: 'all var(--transition-fast)',
                        border: '1px solid transparent',
                        backgroundColor: isCopied ? 'var(--color-success)' : 'var(--color-accent)',
                        color: 'white',
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
