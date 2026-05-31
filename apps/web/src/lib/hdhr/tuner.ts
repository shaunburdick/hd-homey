import type { IncomingMessage } from 'node:http';
import http from 'node:http';
import { and, eq, inArray, not, sql } from 'drizzle-orm';
import type { ChannelInfo } from './types';
import type { DB } from '@/lib/database/db';
import { channels, tuners  } from '@/lib/database/schema';
import type { Channel } from '@/lib/database/schema';

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

        const newChannels = await db.transaction((tx) => {
            const modifiedDate = new Date();

            // If lineup has channels, deactivate any that are no longer in the list
            if (lineup.length > 0) {
                tx.update(channels).set({
                    is_active: false,
                    modified_at: modifiedDate,
                    deleted_at: modifiedDate
                }).where(and(
                    eq(channels.fk_tuner, id),
                    not(inArray(channels.guideNumber, lineup.map(c => c.GuideNumber))),
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

            // set last scan timestamp
            tx.update(tuners).set({
                last_scanned: modifiedDate,
                modified_at: modifiedDate
            }).where(eq(tuners.id, id)).run();

            // insert any new channels and update any existing (only if lineup has channels)
            if (lineup.length > 0) {
                const result = tx.insert(channels).values(lineup.map(c => ({
                    fk_tuner: id,
                    guideNumber: c.GuideNumber,
                    guideName: c.GuideName,
                    audioCodec: c.AudioCodec ?? '',
                    videoCodec: c.VideoCodec ?? '',
                    hd: c.HD ?? 0,
                    url: c.URL
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

                return result;
            }

            // Return empty array if no channels in lineup
            return [];
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
            url.port = '5004'; // streaming is usually on port 5004
            // auto: use any tuner
            // channel should be prefixed with a `v`, if it isn't add one for convenience
            url.pathname = `auto/${channel.startsWith('v') ? '' : 'v'}${channel}`;

            http.get(url, (res) => {
                if (res.statusCode === 200) {
                    resolve(res);
                }

                reject(new Error(`Attempting to get: ${url}. Request failed with status code: ${res.statusCode}`));
            });
        });
    }
}
