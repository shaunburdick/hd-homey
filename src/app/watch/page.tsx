'use client';

import useSWR, { Fetcher } from 'swr';
import { ChannelInfo } from '@/lib/hdhr/types';
import Link from 'next/link';

const fetcher: Fetcher<ChannelInfo[], string> = (...args) => fetch(...args).then(res => res.json());

export default function Watch() {
    const { data, error, isLoading } = useSWR('/lineup.json', fetcher);

    return (
        <>
            <h1>Channel List</h1>
            {isLoading && <div>Loading...</div>}
            {error && <div>Failed to load!</div>}
            {data &&
                <ul>
                    {data.map((channelInfo, key) => {
                        return (
                            <li key={key}>
                                <Link href={`watch/v${channelInfo.GuideNumber}`}>
                                    {channelInfo.GuideNumber}: {channelInfo.GuideName}
                                </Link>
                            </li>
                        );
                    })}
                </ul>}
        </>
    );
}
