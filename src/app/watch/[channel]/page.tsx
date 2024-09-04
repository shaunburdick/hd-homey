'use client';

import { useState } from 'react';
import Logger from '@/lib/logger';

export default function Page({ params }: { params: { channel: string } }) {

    const channelLink = `${location.origin}/stream/${params.channel}`;
    const [isCopied, setIsCopied] = useState(false);

    const handleCopy = async () => {
        try {
            Logger.debug(`Copying ${channelLink} to clipboard...`);
            await navigator.clipboard.writeText(channelLink);
            setIsCopied(true);
            setTimeout(() => setIsCopied(false), 2000);
        } catch (err) {
            Logger.error(err);
        }
    };

    return (
        <>
            <h1>Channel {params.channel}</h1>
            <p>
                Copy this <a href={`/stream/${params.channel}`}>Link</a> into your favorite media player.<br />
                <input
                    id="channelLink"
                    type='text'
                    value={channelLink}
                    onFocus={(e) => e.target.select()}
                    readOnly
                    style={{
                        width: `${channelLink.length}em`
                    }}
                />
                <button onClick={handleCopy}>{isCopied ? 'Copied!' : 'Copy'}</button>
            </p>
            <p>
                For example, in <a href="https://www.videolan.org/vlc/">VLC</a>:
                <ol>
                    <li>Navigate to <em>{'File > Open Network...'}</em></li>
                    <li>Paste in the link</li>
                </ol>
            </p>
        </>
    );
}
