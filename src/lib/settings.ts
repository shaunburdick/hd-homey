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

        const hasPreset = preset !== null && preset !== '';
        const hasVideoCodec = videoCodec !== null && videoCodec !== '';
        const hasVideoBitrate = videoBitrate !== null && videoBitrate !== '';
        const hasAudioBitrate = audioBitrate !== null && audioBitrate !== '';
        const hasResolution = resolution !== null && resolution !== '';
        const hasFramerate = framerate !== null && framerate !== '';
        const hasMaxSessions = maxSessions !== null && maxSessions !== '';
        const hasSegmentDuration = segmentDuration !== null && segmentDuration !== '';
        const hasPlaylistSize = playlistSize !== null && playlistSize !== '';
        const hasHardwareAccel = hardwareAccel !== null && hardwareAccel !== '';

        return {
            enabled: enabled === 'true',
            preset: (hasPreset ? preset as TranscodeSettings['preset'] : null) ?? DEFAULT_SETTINGS.preset,
            videoCodec:
                (hasVideoCodec ? videoCodec as TranscodeSettings['videoCodec'] : null)
                ?? DEFAULT_SETTINGS.videoCodec,
            videoBitrate: hasVideoBitrate
                ? parseInt(videoBitrate, 10)
                : DEFAULT_SETTINGS.videoBitrate,
            audioBitrate: hasAudioBitrate
                ? parseInt(audioBitrate, 10)
                : DEFAULT_SETTINGS.audioBitrate,
            resolution: (hasResolution ? resolution as TranscodeSettings['resolution'] : null)
                ?? DEFAULT_SETTINGS.resolution,
            framerate: hasFramerate
                ? parseInt(framerate, 10) as TranscodeSettings['framerate']
                : DEFAULT_SETTINGS.framerate,
            maxSessions: hasMaxSessions
                ? parseInt(maxSessions, 10)
                : DEFAULT_SETTINGS.maxSessions,
            segmentDuration: hasSegmentDuration
                ? parseInt(segmentDuration, 10)
                : DEFAULT_SETTINGS.segmentDuration,
            playlistSize: hasPlaylistSize
                ? parseInt(playlistSize, 10)
                : DEFAULT_SETTINGS.playlistSize,
            hardwareAccel:
                (hasHardwareAccel ? hardwareAccel as TranscodeSettings['hardwareAccel'] : null)
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
