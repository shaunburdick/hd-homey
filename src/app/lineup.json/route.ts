import Config from '@/lib/config';
import Logger from '@/lib/logger';
import { HDTuner } from '@/lib/hdhr/tuner';

export async function GET(req: Request) {
    // The URL to use as a source when rewriting the URLs in the lineup
    const reqUrl = new URL(Config.PROXY_HOST || req.url);
    const tuner = new HDTuner(Config.TUNER_PATH);

    Logger.info(`Fetching tuner lineup from: ${tuner.address}`);

    const lineup = await tuner.lineup();
    const altered = lineup.map((channel) => {
        const url = new URL(channel.URL);
        url.protocol = reqUrl.protocol;
        url.host = reqUrl.host;
        url.port = reqUrl.port;
        url.pathname = `stream/v${channel.GuideNumber}`;

        channel.URL = url.toString();

        return channel;
    });

    return Response.json(altered);
}
