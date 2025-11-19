'use server';

/**
 * Server actions for transcoding settings
 */

import { redirect } from 'next/navigation';
import { auth } from '@/auth';
import { AuthRoles } from '@/lib/auth-roles';
import { getTranscodingSettings, updateTranscodingSettings } from '@/lib/settings';
import { validateSettings , detectFFmpeg } from '@/lib/transcoding/ffmpeg';
import type { TranscodeSettings } from '@/lib/transcoding/types';
import { PRESET_SETTINGS } from '@/lib/transcoding/types';

export interface FormState {
    errors: Record<string, string[]>;
    success?: boolean;
}

/**
 * Get current transcoding settings
 */
export async function getTranscodingSettingsAction(): Promise<TranscodeSettings> {
    const session = await auth();
    if (session === null || session === undefined || session.user === null || session.user === undefined || session.user.role !== AuthRoles.Admin) {
        throw new Error('Unauthorized');
    }

    return await getTranscodingSettings();
}

/**
 * Get FFmpeg info
 */
export async function getFFmpegInfo() {
    const session = await auth();
    if (session === null || session === undefined || session.user === null || session.user === undefined || session.user.role !== AuthRoles.Admin) {
        throw new Error('Unauthorized');
    }

    return await detectFFmpeg();
}

/**
 * Update transcoding settings
 */
export async function updateTranscodingSettingsAction(
    state: FormState,
    formData: FormData
): Promise<FormState> {
    const session = await auth();
    if (session === null || session === undefined || session.user === null || session.user === undefined || session.user.role !== AuthRoles.Admin) {
        return { errors: { auth: ['Unauthorized'] } };
    }

    try {
        // Parse form data
        const enabled = formData.get('enabled') === 'on';
        const preset = formData.get('preset') as TranscodeSettings['preset'];
        const videoCodec = formData.get('videoCodec') as TranscodeSettings['videoCodec'];
        const videoBitrate = parseInt(formData.get('videoBitrate') as string, 10);
        const audioBitrate = parseInt(formData.get('audioBitrate') as string, 10);
        const resolution = formData.get('resolution') as TranscodeSettings['resolution'];
        const framerate = parseInt(formData.get('framerate') as string, 10) as TranscodeSettings['framerate'];
        const maxSessions = parseInt(formData.get('maxSessions') as string, 10);
        const segmentDuration = parseInt(formData.get('segmentDuration') as string, 10);
        const playlistSize = parseInt(formData.get('playlistSize') as string, 10);
        const hardwareAccel = formData.get('hardwareAccel') as TranscodeSettings['hardwareAccel'];

        const settings: TranscodeSettings = {
            enabled,
            preset,
            videoCodec,
            videoBitrate,
            audioBitrate,
            resolution,
            framerate,
            maxSessions,
            segmentDuration,
            playlistSize,
            hardwareAccel,
        };

        // Validate settings
        const validationErrors = validateSettings(settings);
        if (validationErrors.length > 0) {
            return {
                errors: { validation: validationErrors },
            };
        }

        // Save settings
        await updateTranscodingSettings(settings);

        redirect('/settings');
    } catch (error) {
        if (error instanceof Error && error.message === 'NEXT_REDIRECT') {
            throw error;
        }

        return {
            errors: { server: ['Failed to update settings'] },
        };
    }
}

/**
 * Apply a preset to settings (client-side helper)
 */
export async function applyPreset(
    currentSettings: TranscodeSettings,
    presetName: TranscodeSettings['preset']
): Promise<TranscodeSettings> {
    const preset = PRESET_SETTINGS[presetName];

    return {
        ...currentSettings,
        preset: presetName,
        ...preset,
    };
}
