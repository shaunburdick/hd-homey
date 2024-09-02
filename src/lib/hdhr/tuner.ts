import type { IncomingMessage } from 'http';
import http from 'http';
import type { ChannelInfo } from './types';

/**
 * Represents a HD Homerun Tuner
 */
export class HDTuner {
    public constructor(public address: string) {}

    /**
     * Get the lineup from the tuner.
     * It typically exists at `/lineup.json`
     *
     * @return The list of channels the tuner can provide
     */
    public async lineup(): Promise<ChannelInfo[]> {
        const reqUrl = new URL(this.address);
        reqUrl.pathname = 'lineup.json';

        const lineUpRequest = await fetch(reqUrl);

        return lineUpRequest.json();
    }

    /**
     * Get the channel stream from the tuner.
     *
     * @param channel The GuideNumber of the channel
     * @return A Readable Stream of the HTTP request for the channel
     */
    public async stream(channel: string): Promise<IncomingMessage> {
        return new Promise<IncomingMessage>((resolve, reject) => {
            const url = new URL(this.address);
            url.port = '5004'; // streaming is usually on port 5004
            // auto: use any tuner
            // channel should be prefixed with a `v`, if it isn't add one for convenience
            url.pathname = `auto/${channel.startsWith('v') ? '' : 'v'}${channel}`;

            http.get(url, (res) => {
                if (res.statusCode === 200) {
                    resolve(res);
                }

                reject(new Error(`Attempting to get: ${url}. Request failed with status code: ${res.statusCode}`));
            }).on('error', reject);
        });
    }
}
