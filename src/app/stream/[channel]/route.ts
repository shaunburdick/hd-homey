import type { IncomingMessage } from 'http';
import http from 'http';
import Config from '@/config';
import Logger from '@/logger';
import { notFound } from 'next/navigation';
/**
 * A custom Response subclass that accepts a Readable Steam.
 * This allows creating a streaming Response from http requests
 */
class MessageResponse extends Response {
    public constructor(res: IncomingMessage, init?: ResponseInit) {
        super(res as never, {
            ...init,
            status: 200,
            headers: {
                'Content-Type': res.headers['content-type'] || 'video/mpeg',
                'Access-Control-Allow-Headers': '*',
                'Access-Control-Allow-Origin': '*'
            },
        });
    }
}

async function fetchChannelStream(channel: string): Promise<IncomingMessage> {
    return new Promise<IncomingMessage>((resolve, reject) => {
        const url = `${Config.TUNER_PATH}:5004/auto/${channel}?transcode=mobile`;
        http.get(url, (res) => {
            if (res.statusCode === 200) {
                resolve(res);
            }

            reject(new Error(`Attempting to get: ${url}. Request failed with status code: ${res.statusCode}`));
        }).on('error', reject);
    });
}

export async function GET(
    _req: Request,
    context: { params: { channel: string } }
) {
    try {
        const stream = await fetchChannelStream(context.params.channel);
        return new MessageResponse(stream);
    } catch (err) {
        Logger.error('Error fetching channel stream', { err });
        notFound();
    }
}
