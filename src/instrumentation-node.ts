import { count } from 'drizzle-orm';
import Config from '@/lib/config';
import Logger from '@/lib/logger';
import { getDb } from '@/lib/database/db';
import { user } from '@/lib/database/schema';
import { detectFFmpeg } from '@/lib/transcoding/ffmpeg';
import { getTranscodingSettings, updateTranscodingSettings } from '@/lib/settings';
import { getFormattedVersion } from '@/lib/version';

export async function run() {
    Logger.info(`HD Homey ${getFormattedVersion()} starting...`);
    Logger.info('Starting App with the following config: %o', Config);

    const db = await getDb();

    // Check user count (table may not exist yet if migrations haven't run)
    try {
        const userCount = await db.select({ count: count() }).from(user);
        Logger.info(`You have ${userCount[0].count} users configured`);
    } catch {
        Logger.warn('User table not yet initialized - run migrations first');
    }

    // Detect ffmpeg and enable transcoding if available
    try {
        const ffmpegInfo = await detectFFmpeg();
        if (ffmpegInfo.available) {
            const currentSettings = await getTranscodingSettings();

            // Auto-enable transcoding if ffmpeg is detected and not explicitly configured
            if (!currentSettings.enabled) {
                Logger.info('FFmpeg detected - enabling transcoding by default');
                await updateTranscodingSettings({
                    ...currentSettings,
                    enabled: true,
                });
            }
        } else {
            Logger.warn('FFmpeg not available - transcoding disabled');
        }
    } catch (error) {
        Logger.error({ error }, 'Failed to initialize transcoding');
    }
}
