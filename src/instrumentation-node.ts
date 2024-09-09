import Config from '@/lib/config';
import Logger from '@/lib/logger';
import { getDb } from '@/lib/database/db';
import { count } from 'drizzle-orm';
import { users } from '@/lib/database/schema';

export async function run() {
    Logger.info('Starting App with the following config: %o', Config);

    if (!URL.canParse(Config.TUNER_PATH)) {
        throw new Error('Unable to parse tuner path, be sure to set HD_HOMEY_TUNER_PATH');
    }

    const db = await getDb();
    const userCount = await db.select({ count: count() }).from(users);

    Logger.info(`You have ${userCount[0].count} users configured`);
}
