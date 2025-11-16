import type { IncomingMessage } from 'http';
import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/database/db';
import { channels } from '@/lib/database/schema';
import Logger from '@/lib/logger';
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
    context: { params: Promise<{ id: string; channel_id: string }> }
) {
    try {
        const db = await getDb();
        const { id, channel_id } = await context.params;

        // Get channel info from database
        const channel = await db.query.channels.findFirst({
            where: and(
                eq(channels.id, parseInt(channel_id, 10)),
                eq(channels.fk_tuner, parseInt(id, 10)),
                isNull(channels.deleted_at)
            ),
            with: {
                tuners: true
            }
        });

        if (!channel || !channel.tuners) {
            notFound();
        }

        const tuner = new HDTuner(channel.tuners.path);
        const stream = await tuner.stream(channel.guideNumber);
        return new MessageResponse(stream);
    } catch (err) {
        Logger.error({ err }, 'Error fetching channel stream');
        notFound();
    }
}
