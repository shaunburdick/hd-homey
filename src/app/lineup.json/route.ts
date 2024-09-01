import Config from '@/config';
import Logger from '@/logger';

interface ChannelInfo {
    GuideNumber: string;
    GuideName: string;
    VideoCodec: string;
    AudioCodec: string;
    URL: string;
}

export async function GET(req: Request) {
    const reqUrl = new URL(req.url);
    const lineupUrl = `${Config.TUNER_PATH}/lineup.json`;

    Logger.info(`Fetching tuner lineup from: ${lineupUrl}`);
    const lineUpRequest = await fetch(lineupUrl);

    const lineup: ChannelInfo[] = await lineUpRequest.json();
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
