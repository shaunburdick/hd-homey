import type { IncomingMessage } from 'node:http';
import http from 'node:http';
import { and, eq, inArray, not, sql } from 'drizzle-orm';
import type { ChannelInfo } from './types';
import type { DB } from '@/lib/database/db';
import { channels, tuners  } from '@/lib/database/schema';
import type { Channel } from '@/lib/database/schema';

/** The standard HDHomeRun streaming port */
const HDHOMERUN_STREAM_PORT = '5004';

/** HTTP status code indicating success */
const HTTP_OK_STATUS = 200;

interface DeactivateChannelsOptions {
    tx: DB;
    lineup: ChannelInfo[];
    id: number;
    modifiedDate: Date;
}

/**
 * Deactivate channels that are no longer in the lineup (or all channels if lineup is empty)
 */
function deactivateRemovedChannels(
    { tx, lineup, id, modifiedDate }: DeactivateChannelsOptions
): void {
    if (lineup.length > 0) {
        tx.update(channels).set({
            is_active: false,
            modified_at: modifiedDate,
            deleted_at: modifiedDate
        }).where(and(
            eq(channels.fk_tuner, id),
            not(inArray(channels.guideNumber, lineup.map(ch => ch.GuideNumber))),
            eq(channels.is_active, true)
        )).run();
    } else {
        // If lineup is empty, deactivate all channels for this tuner
        tx.update(channels).set({
            is_active: false,
            modified_at: modifiedDate,
            deleted_at: modifiedDate
        }).where(and(
            eq(channels.fk_tuner, id),
            eq(channels.is_active, true)
        )).run();
    }
}

interface UpsertChannelsOptions {
    tx: DB;
    lineup: ChannelInfo[];
    id: number;
}

/**
 * Upsert channels from lineup into the database
 */
function upsertChannels({ tx, lineup, id }: UpsertChannelsOptions): Channel[] {
    if (lineup.length === 0) {
        return [];
    }

    return tx.insert(channels).values(lineup.map(ch => ({
        fk_tuner: id,
        guideNumber: ch.GuideNumber,
        guideName: ch.GuideName,
        audioCodec: ch.AudioCodec ?? '',
        videoCodec: ch.VideoCodec ?? '',
        hd: ch.HD ?? 0,
        url: ch.URL
    }))).onConflictDoUpdate({
        target: [channels.fk_tuner, channels.guideNumber],
        set: {
            guideName: sql`excluded.guideName`,
            audioCodec: sql`excluded.audioCodec`,
            videoCodec: sql`excluded.videoCodec`,
            hd: sql`excluded.hd`,
            url: sql`excluded.url`
        }
    }).returning().all();
}

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

        return await lineUpRequest.json();
    }

    /**
     * Update the stored lineup for the tuner
     *
     * @param db A database connection
     * @return A list of current channels for the tuner
     */
    public async updateLineup(db: DB, id: number): Promise<Channel[]> {
        const lineup = await this.lineup();

        const newChannels = db.transaction((tx) => {
            const modifiedDate = new Date();

            deactivateRemovedChannels({ tx, lineup, id, modifiedDate });

            // set last scan timestamp
            tx.update(tuners).set({
                last_scanned: modifiedDate,
                modified_at: modifiedDate
            }).where(eq(tuners.id, id)).run();

            return upsertChannels({ tx, lineup, id });
        });

        return newChannels;
    }

    /**
     * Get the channel stream from the tuner.
     *
     * @param channel The GuideNumber of the channel
     * @return A Readable Stream of the HTTP request for the channel
     */
    public async stream(channel: string): Promise<IncomingMessage> {
        return await new Promise<IncomingMessage>((resolve, reject) => {
            const url = new URL(this.address);
            url.port = HDHOMERUN_STREAM_PORT; // streaming is usually on port 5004
            // auto: use any tuner
            // channel should be prefixed with a `v`, if it isn't add one for convenience
            url.pathname = `auto/${channel.startsWith('v') ? '' : 'v'}${channel}`;

            http.get(url, (res) => {
                if (res.statusCode === HTTP_OK_STATUS) {
                    resolve(res);
                }

                reject(new Error(`Attempting to get: ${url}. Request failed with status code: ${res.statusCode}`));
            });
        });
    }
}
