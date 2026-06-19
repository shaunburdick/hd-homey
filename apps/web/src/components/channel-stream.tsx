'use client';

import { useState } from 'react';
import Logger from '@/lib/logger';
import type { Channel } from '@/lib/database/schema';

/** Duration (ms) to show the "Copied!" feedback before reverting the button label. */
const COPY_FEEDBACK_DURATION_MS = 2000;

interface ChannelStreamProps {
    channel: Channel;
    streamUrl: string;
}

/**
 * Resolves a potentially relative stream URL to an absolute URL suitable for
 * external media players such as VLC. Falls back to the original value on the
 * server or when the URL is already absolute.
 */
function resolveAbsoluteUrl(streamUrl: string): string {
    if (typeof window !== 'undefined' && streamUrl.startsWith('/')) {
        return new URL(streamUrl, window.location.origin).toString();
    }
    return streamUrl;
}

/** Instruction list for opening the stream in VLC. */
function VlcInstructions() {
    return (
        <div>
            For example, in <a href="https://www.videolan.org/vlc/">VLC</a>:
            <ol>
                <li>Navigate to <em>{'File > Open Network...'}</em></li>
                <li>Paste in the link</li>
                <li>Click Play</li>
            </ol>
        </div>
    );
}

export default function ChannelStream({ streamUrl }: ChannelStreamProps) {
    const [isCopied, setIsCopied] = useState(false);

    const channelLink = resolveAbsoluteUrl(streamUrl);

    const handleCopy = async () => {
        try {
            Logger.debug(`Copying ${channelLink} to clipboard...`);
            await navigator.clipboard.writeText(channelLink);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), COPY_FEEDBACK_DURATION_MS);
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
                    type="text"
                    value={channelLink}
                    onFocus={(inputEvent) => inputEvent.target.select()}
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
                    type="button"
                    onClick={handleCopy}
                    style={{
                        backgroundColor: isCopied ? 'var(--color-success)' : undefined,
                    }}
                >
                    {isCopied ? '✓ Copied!' : '📋 Copy to Clipboard'}
                </button>
            </div>

            <h3>Playback Instructions</h3>
            <VlcInstructions />
        </>
    );
}
