'use client';

import Link from 'next/link';
import { ChannelInfo } from '@/lib/hdhr/types';
import { useState } from 'react';

export default function Watch() {
    const [lineup, setLineup] = useState<ChannelInfo[]>([]);

    useState(() => {
        fetch('/lineup.json').then(res => {
            res.json().then(setLineup);
        });
    });

    return (
        <main>
            <h1>Channel List</h1>
            <ul>
                {lineup.map((channelInfo, key) => {
                    return (
                        <li key={key}>
                            <Link href={`watch/v${channelInfo.GuideNumber}`}>
                                {channelInfo.GuideNumber}: {channelInfo.GuideName}
                            </Link>
                        </li>
                    );
                })}
            </ul>
        </main>
    );
}
