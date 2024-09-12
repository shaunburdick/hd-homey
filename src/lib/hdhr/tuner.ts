import type { IncomingMessage } from 'http';
import http from 'http';
import type { ChannelInfo } from './types';
import type { DB } from '@/lib/database/db';
import { channels, tuners, type Channel } from '@/lib/database/schema';
import { and, eq, inArray, not, sql } from 'drizzle-orm';

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
     * Update the stored lineup for the tuner
     *
     * @param db A database connection
     * @return A list of current channels for the tuner
     */
    public async updateLineup(db: DB, id: number): Promise<Channel[]> {
        const lineup = await this.lineup();

        const newChannels = await db.transaction(async (tx) => {
            const modifiedDate = new Date();
            // delete any channels no longer in the list
            await tx.update(channels).set({
                is_active: false,
                modified_at: modifiedDate,
                deleted_at: modifiedDate
            }).where(and(
                eq(channels.fk_tuner, id),
                not(inArray(channels.guideNumber, lineup.map(c => c.GuideNumber))),
                eq(channels.is_active, true)
            ));

            // set last scan timestamp
            await tx.update(tuners).set({
                last_scanned: modifiedDate,
                modified_at: modifiedDate
            }).where(eq(tuners.id, id));

            // insert any new channels and update any existing
            return tx.insert(channels).values(lineup.map(c => ({
                fk_tuner: id,
                guideNumber: c.GuideNumber,
                guideName: c.GuideName,
                audioCodec: c.AudioCodec,
                videoCodec: c.VideoCodec,
                hd: c.HD || 0,
                url: c.URL
            }))).onConflictDoUpdate({
                target: [channels.fk_tuner, channels.guideNumber],
                set: {
                    guideName: sql`excluded.GuideName`,
                    audioCodec: sql`excluded.AudioCodec`,
                    videoCodec: sql`excluded.VideoCodec`,
                    hd: sql`excluded.HD || 0`,
                    url: sql`excluded.URL`
                }
            }).returning();
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
