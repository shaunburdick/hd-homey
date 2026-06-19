import type { IncomingMessage } from 'node:http';
import { NextRequest } from 'next/server';
import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';
import { getDb } from '@/lib/database/db';
import { channels } from '@/lib/database/schema';
import { verifyStreamToken } from '@/lib/stream-token';
import Logger from '@/lib/logger';
import { HDTuner } from '@/lib/hdhr/tuner';
/**
 * Force dynamic rendering for this route
 */
export const dynamic = 'force-dynamic';

/**
 * A custom Response subclass that accepts a Readable Stream.
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
                'Access-Control-Allow-Origin': '*',
                'Cache-Control': 'no-store'
            },
        });
    }
}

interface TokenValidationOptions {
    token: string | null;
    id: string;
    channel_id: string;
}

/** Validates the token and verifies it matches the requested tuner/channel */
async function validateToken({ token, id, channel_id }: TokenValidationOptions) {
    if (!token) {
        Logger.warn({ tunerId: id, channelId: channel_id }, 'Stream request missing token');
        return null;
    }

    const tokenData = await verifyStreamToken(token);
    if (!tokenData) {
        Logger.warn({ tunerId: id, channelId: channel_id }, 'Invalid or expired stream token');
        return null;
    }

    if (tokenData.tunerId !== parseInt(id, 10) ||
        tokenData.channelId !== parseInt(channel_id, 10)) {
        Logger.warn({
            requested: { tunerId: id, channelId: channel_id },
            token: tokenData
        }, 'Token resource mismatch');
        return null;
    }

    return tokenData;
}

export async function GET(
    req: NextRequest,
    context: { params: Promise<{ id: string; channel_id: string }> }
) {
    try {
        const { id, channel_id } = await context.params;
        const token = req.nextUrl.searchParams.get('token');

        const tokenData = await validateToken({ token, id, channel_id });
        if (!tokenData) {
            return new Response('Unauthorized or invalid token', { status: token ? 403 : 401 });
        }

        // Get channel from database
        const db = await getDb();
        const channel = await db.query.channels.findFirst({
            where: and(
                eq(channels.id, tokenData.channelId),
                eq(channels.fk_tuner, tokenData.tunerId),
                isNull(channels.deleted_at)
            ),
            with: {
                tuners: true
            }
        });

        if (!channel || !channel.tuners) {
            notFound();
        }

        // Check if tuner is active
        if (!channel.tuners.is_active) {
            Logger.warn({ tunerId: id, channelId: channel_id, tunerName: channel.tuners.name },
                'Stream request for inactive tuner');
            return new Response('Tuner is not active', { status: 403 });
        }

        const tuner = new HDTuner(channel.tuners.path);
        const stream = await tuner.stream(channel.guideNumber);
        return new MessageResponse(stream);
    } catch (err) {
        Logger.error({ err }, 'Error fetching channel stream');
        return new Response('Internal server error', { status: 500 });
    }
}
