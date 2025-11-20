import crypto from 'node:crypto';
import { eq, inArray, sql } from 'drizzle-orm';
import { getDb } from './database/db';
import { settings } from './database/schema';
import Logger from './logger';
import type { TranscodeSettings } from './transcoding/types';
import { DEFAULT_SETTINGS } from './transcoding/types';

/**
 * Get a setting value from database
 */
export async function getSetting(key: string): Promise<string | null> {
    try {
        const db = await getDb();
        const setting = await db.query.settings.findFirst({
            where: eq(settings.key, key)
        });
        return setting?.value ?? null;
    } catch (err) {
        Logger.error({ err, key }, 'Failed to get setting');
        return null;
    }
}

/**
 * Get multiple settings in a single query
 */
export async function getSettings(keys: string[]): Promise<Record<string, string | null>> {
    try {
        if (keys.length === 0) {
            return {};
        }

        const db = await getDb();
        const results = await db.query.settings.findMany({
            where: inArray(settings.key, keys)
        });

        const settingsMap: Record<string, string | null> = {};
        for (const key of keys) {
            settingsMap[key] = results.find(s => s.key === key)?.value ?? null;
        }

        return settingsMap;
    } catch (err) {
        Logger.error({ err, keys }, 'Failed to get settings');
        return Object.fromEntries(keys.map(key => [key, null]));
    }
}

/**
 * Set a setting value in database
 */
export async function setSetting(key: string, value: string): Promise<void> {
    try {
        const db = await getDb();
        await db
            .insert(settings)
            .values({ key, value })
            .onConflictDoUpdate({
                target: settings.key,
                set: { value, modified_at: new Date() }
            });
    } catch (err) {
        Logger.error({ err, key }, 'Failed to set setting');
        throw err;
    }
}

/**
 * Set multiple settings in a single operation
 */
export async function setSettings(kvPairs: Record<string, string>): Promise<void> {
    try {
        const entries = Object.entries(kvPairs);
        if (entries.length === 0) {
            return;
        }

        const db = await getDb();
        const modifiedDate = new Date();

        await db
            .insert(settings)
            .values(entries.map(([key, value]) => ({ key, value })))
            .onConflictDoUpdate({
                target: settings.key,
                set: {
                    value: sql`excluded.value`,
                    modified_at: modifiedDate
                }
            });
    } catch (err) {
        Logger.error({ err, count: Object.keys(kvPairs).length }, 'Failed to set settings');
        throw err;
    }
}

/**
 * Generate a random stream secret
 */
export function generateStreamSecret(): string {
    return crypto.randomBytes(32).toString('hex');
}

/**
 * Get the current stream secret (generates one if missing)
 */
export async function getStreamSecret(): Promise<string> {
    let secret = await getSetting('stream_secret');

    if (secret === null || secret === '') {
        Logger.warn('Stream secret not found, generating new one');
        secret = generateStreamSecret();
        await setSetting('stream_secret', secret);
    }

    return secret;
}

/**
 * Regenerate the stream secret (invalidates all tokens)
 */
export async function regenerateStreamSecret(): Promise<string> {
    const newSecret = generateStreamSecret();
    await setSetting('stream_secret', newSecret);
    Logger.info('Stream secret regenerated');
    return newSecret;
}

/**
 * Check if a setting value is valid (not null or empty)
 */
function isValidSetting(value: string | null): boolean {
    return value !== null && value !== '';
}

/**
 * Parse string setting as integer with fallback
 */
function parseIntSetting(value: string | null, fallback: number): number {
    return isValidSetting(value) ? parseInt(value as string, 10) : fallback;
}

/**
 * Get transcoding settings from database (with defaults)
 */
export async function getTranscodingSettings(): Promise<TranscodeSettings> {
    try {
        const keys = [
            'transcoding.enabled',
            'transcoding.preset',
            'transcoding.video_codec',
            'transcoding.video_bitrate',
            'transcoding.audio_bitrate',
            'transcoding.resolution',
            'transcoding.framerate',
            'transcoding.max_sessions',
            'transcoding.segment_duration',
            'transcoding.playlist_size',
            'transcoding.hardware_accel',
        ];

        const values = await getSettings(keys);

        return {
            enabled: values['transcoding.enabled'] === 'true',
            preset: (isValidSetting(values['transcoding.preset'])
                ? values['transcoding.preset'] as TranscodeSettings['preset']
                : null) ?? DEFAULT_SETTINGS.preset,
            videoCodec: (isValidSetting(values['transcoding.video_codec'])
                ? values['transcoding.video_codec'] as TranscodeSettings['videoCodec']
                : null) ?? DEFAULT_SETTINGS.videoCodec,
            videoBitrate: parseIntSetting(values['transcoding.video_bitrate'], DEFAULT_SETTINGS.videoBitrate),
            audioBitrate: parseIntSetting(values['transcoding.audio_bitrate'], DEFAULT_SETTINGS.audioBitrate),
            resolution: (isValidSetting(values['transcoding.resolution'])
                ? values['transcoding.resolution'] as TranscodeSettings['resolution']
                : null) ?? DEFAULT_SETTINGS.resolution,
            framerate: parseIntSetting(
                values['transcoding.framerate'],
                DEFAULT_SETTINGS.framerate
            ) as TranscodeSettings['framerate'],
            maxSessions: parseIntSetting(values['transcoding.max_sessions'], DEFAULT_SETTINGS.maxSessions),
            segmentDuration: parseIntSetting(values['transcoding.segment_duration'], DEFAULT_SETTINGS.segmentDuration),
            playlistSize: parseIntSetting(values['transcoding.playlist_size'], DEFAULT_SETTINGS.playlistSize),
            hardwareAccel: (isValidSetting(values['transcoding.hardware_accel'])
                ? values['transcoding.hardware_accel'] as TranscodeSettings['hardwareAccel']
                : null) ?? DEFAULT_SETTINGS.hardwareAccel,
        };
    } catch (err) {
        Logger.error({ err }, 'Failed to get transcoding settings');
        return DEFAULT_SETTINGS;
    }
}

/**
 * Update transcoding settings in database
 */
export async function updateTranscodingSettings(newSettings: TranscodeSettings): Promise<void> {
    try {
        await setSettings({
            'transcoding.enabled': newSettings.enabled.toString(),
            'transcoding.preset': newSettings.preset,
            'transcoding.video_codec': newSettings.videoCodec,
            'transcoding.video_bitrate': newSettings.videoBitrate.toString(),
            'transcoding.audio_bitrate': newSettings.audioBitrate.toString(),
            'transcoding.resolution': newSettings.resolution,
            'transcoding.framerate': newSettings.framerate.toString(),
            'transcoding.max_sessions': newSettings.maxSessions.toString(),
            'transcoding.segment_duration': newSettings.segmentDuration.toString(),
            'transcoding.playlist_size': newSettings.playlistSize.toString(),
            'transcoding.hardware_accel': newSettings.hardwareAccel,
        });

        Logger.info({ settings: newSettings }, 'Transcoding settings updated');
    } catch (err) {
        Logger.error({ err }, 'Failed to update transcoding settings');
        throw err;
    }
}
