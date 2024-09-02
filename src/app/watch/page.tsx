import { HDTuner } from '@/lib/hdhr/tuner';
import Config from '@/lib/config';
import Link from 'next/link';

export default async function Watch() {
    const tuner = new HDTuner(Config.TUNER_PATH);
    const lineup = await tuner.lineup();

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
