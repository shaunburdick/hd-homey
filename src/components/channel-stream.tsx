'use client';

import { useState } from 'react';
import Logger from '@/lib/logger';
import type { Channel } from '@/lib/database/schema';

interface ChannelStreamProps {
    channel: Channel;
}

export default function ChannelStream({ channel }: ChannelStreamProps) {
    const [isCopied, setIsCopied] = useState(false);
    const channelLink = new URL(
        `/tuners/${channel.fk_tuner}/channel/${channel.id}/stream`,
        window.location.origin
    ).toString();

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
                Copy this <a href={channelLink}>Link</a> into your favorite media player.<br />
                <input
                    id="channelLink"
                    type='text'
                    value={channelLink}
                    onFocus={(e) => e.target.select()}
                    readOnly
                    style={{
                        width: `${channelLink.length}ch`
                    }}
                />
                <button onClick={handleCopy}>
                    {isCopied ? 'Copied!' : 'Copy'}
                </button>
            </p>

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
