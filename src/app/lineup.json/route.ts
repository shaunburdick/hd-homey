import Config from '@/config';

interface ChannelInfo {
    GuideNumber: string;
    GuideName: string;
    VideoCodec: string;
    AudioCodec: string;
    URL: string;
}

export async function GET(req: Request) {
    const reqUrl = new URL(req.url);
    const lineUpRequest = await fetch(`${Config.TUNER_PATH}/lineup.json`);

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
