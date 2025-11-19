import crypto from 'node:crypto';
import { eq } from 'drizzle-orm';
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
        const enabled = await getSetting('transcoding.enabled');
        const preset = await getSetting('transcoding.preset');
        const videoCodec = await getSetting('transcoding.video_codec');
        const videoBitrate = await getSetting('transcoding.video_bitrate');
        const audioBitrate = await getSetting('transcoding.audio_bitrate');
        const resolution = await getSetting('transcoding.resolution');
        const framerate = await getSetting('transcoding.framerate');
        const maxSessions = await getSetting('transcoding.max_sessions');
        const segmentDuration = await getSetting('transcoding.segment_duration');
        const playlistSize = await getSetting('transcoding.playlist_size');
        const hardwareAccel = await getSetting('transcoding.hardware_accel');

        return {
            enabled: enabled === 'true',
            preset: (isValidSetting(preset) ? preset as TranscodeSettings['preset'] : null)
                ?? DEFAULT_SETTINGS.preset,
            videoCodec: (isValidSetting(videoCodec) ? videoCodec as TranscodeSettings['videoCodec'] : null)
                ?? DEFAULT_SETTINGS.videoCodec,
            videoBitrate: parseIntSetting(videoBitrate, DEFAULT_SETTINGS.videoBitrate),
            audioBitrate: parseIntSetting(audioBitrate, DEFAULT_SETTINGS.audioBitrate),
            resolution: (isValidSetting(resolution) ? resolution as TranscodeSettings['resolution'] : null)
                ?? DEFAULT_SETTINGS.resolution,
            framerate: parseIntSetting(framerate, DEFAULT_SETTINGS.framerate) as TranscodeSettings['framerate'],
            maxSessions: parseIntSetting(maxSessions, DEFAULT_SETTINGS.maxSessions),
            segmentDuration: parseIntSetting(segmentDuration, DEFAULT_SETTINGS.segmentDuration),
            playlistSize: parseIntSetting(playlistSize, DEFAULT_SETTINGS.playlistSize),
            hardwareAccel: (isValidSetting(hardwareAccel) ? hardwareAccel as TranscodeSettings['hardwareAccel'] : null)
                ?? DEFAULT_SETTINGS.hardwareAccel,
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
        await setSetting('transcoding.enabled', newSettings.enabled.toString());
        await setSetting('transcoding.preset', newSettings.preset);
        await setSetting('transcoding.video_codec', newSettings.videoCodec);
        await setSetting('transcoding.video_bitrate', newSettings.videoBitrate.toString());
        await setSetting('transcoding.audio_bitrate', newSettings.audioBitrate.toString());
        await setSetting('transcoding.resolution', newSettings.resolution);
        await setSetting('transcoding.framerate', newSettings.framerate.toString());
        await setSetting('transcoding.max_sessions', newSettings.maxSessions.toString());
        await setSetting('transcoding.segment_duration', newSettings.segmentDuration.toString());
        await setSetting('transcoding.playlist_size', newSettings.playlistSize.toString());
        await setSetting('transcoding.hardware_accel', newSettings.hardwareAccel);

        Logger.info({ settings: newSettings }, 'Transcoding settings updated');
    } catch (err) {
        Logger.error({ err }, 'Failed to update transcoding settings');
        throw err;
    }
}
