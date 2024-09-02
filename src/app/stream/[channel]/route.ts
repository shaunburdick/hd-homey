import type { IncomingMessage } from 'http';
import Config from '@/lib/config';
import Logger from '@/lib/logger';
import { notFound } from 'next/navigation';
import { HDTuner } from '@/lib/hdhr/tuner';
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

export async function GET(
    _req: Request,
    context: { params: { channel: string } }
) {
    try {
        const tuner = new HDTuner(Config.TUNER_PATH);
        const stream = await tuner.stream(context.params.channel);
        return new MessageResponse(stream);
    } catch (err) {
        Logger.error('Error fetching channel stream', { err });
        notFound();
    }
}
