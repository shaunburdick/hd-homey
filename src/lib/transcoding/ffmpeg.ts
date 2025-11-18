/**
 * FFmpeg detection and command building utilities
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { cpus } from 'os';
import type { FFmpegInfo, TranscodeSettings } from './types';
import Logger from '@/lib/logger';

const execAsync = promisify(exec);

let cachedFFmpegInfo: FFmpegInfo | null = null;

/**
 * Detect if ffmpeg is available and get its capabilities
 */
export async function detectFFmpeg(): Promise<FFmpegInfo> {
    if (cachedFFmpegInfo) {
        return cachedFFmpegInfo;
    }

    const ffmpegPath = process.env.FFMPEG_PATH || 'ffmpeg';

    try {
        const { stdout: versionOutput } = await execAsync(`${ffmpegPath} -version`);
        const versionMatch = versionOutput.match(/ffmpeg version (\S+)/);
        const version = versionMatch ? versionMatch[1] : 'unknown';

        const { stdout: codecOutput } = await execAsync(`${ffmpegPath} -codecs 2>&1`);
        const codecs: string[] = [];

        if (codecOutput.includes('h264') || codecOutput.includes('libx264')) {
            codecs.push('h264');
        }
        if (codecOutput.includes('aac')) {
            codecs.push('aac');
        }

        const { stdout: hwAccelOutput } = await execAsync(`${ffmpegPath} -hwaccels 2>&1`);
        const hwAccel = hwAccelOutput
            .split('\n')
            .slice(1)
            .map(line => line.trim())
            .filter(line => line && !line.startsWith('Hardware'));

        cachedFFmpegInfo = {
            available: true,
            version,
            codecs,
            hwAccel,
            path: ffmpegPath,
        };

        Logger.info(
            {
                version,
                codecs,
                hwAccel,
                path: ffmpegPath,
            },
            'FFmpeg detected successfully'
        );

        return cachedFFmpegInfo;
    } catch (error) {
        Logger.warn({ error, ffmpegPath }, 'FFmpeg not available');

        cachedFFmpegInfo = {
            available: false,
            codecs: [],
            hwAccel: [],
        };

        return cachedFFmpegInfo;
    }
}

/**
 * Validate transcoding settings
 */
export function validateSettings(settings: TranscodeSettings): string[] {
    const errors: string[] = [];

    if (settings.videoBitrate < 500 || settings.videoBitrate > 10000) {
        errors.push('Video bitrate must be between 500 and 10000 kbps');
    }

    if (settings.audioBitrate < 64 || settings.audioBitrate > 320) {
        errors.push('Audio bitrate must be between 64 and 320 kbps');
    }

    if (settings.maxSessions < 1 || settings.maxSessions > 20) {
        errors.push('Max sessions must be between 1 and 20');
    }

    if (settings.segmentDuration < 1 || settings.segmentDuration > 10) {
        errors.push('Segment duration must be between 1 and 10 seconds');
    }

    if (settings.playlistSize < 2 || settings.playlistSize > 20) {
        errors.push('Playlist size must be between 2 and 20 segments');
    }

    return errors;
}

/**
 * Build ffmpeg command arguments for transcoding
 */
export function buildFFmpegCommand(
    sourceUrl: string,
    outputDir: string,
    settings: TranscodeSettings
): string[] {
    const args: string[] = [];

    // Input
    args.push('-i', sourceUrl);

    // Video encoding
    args.push('-c:v', settings.videoCodec);
    args.push('-preset', 'ultrafast');
    args.push('-tune', 'zerolatency');

    // Video bitrate
    args.push('-b:v', `${settings.videoBitrate}k`);
    args.push('-maxrate', `${settings.videoBitrate}k`);
    args.push('-bufsize', `${settings.videoBitrate * 2}k`);

    // Resolution
    if (settings.resolution !== 'source') {
        const resolutionMap = {
            '480p': '854x480',
            '720p': '1280x720',
            '1080p': '1920x1080',
        };
        args.push('-s', resolutionMap[settings.resolution]);
    }

    // Framerate
    if (settings.framerate !== 0) {
        args.push('-r', settings.framerate.toString());
    }

    // GOP size (match segment duration for keyframe alignment)
    const gopSize = settings.framerate === 0 ? 60 : settings.framerate * settings.segmentDuration;
    args.push('-g', gopSize.toString());
    args.push('-keyint_min', gopSize.toString());
    args.push('-sc_threshold', '0');

    // H.264 profile for compatibility
    args.push('-profile:v', 'baseline');
    args.push('-level', '3.1');

    // Audio encoding with proper timing
    args.push('-c:a', 'aac');
    args.push('-b:a', `${settings.audioBitrate}k`);
    args.push('-ar', '48000');
    args.push('-ac', '2');
    // Strict audio timing to prevent drift
    args.push('-async', '1');
    args.push('-af', 'aresample=async=1:min_hard_comp=0.100000:first_pts=0');

    // HLS output format
    args.push('-f', 'hls');
    args.push('-hls_time', settings.segmentDuration.toString());
    // Keep a rolling window of segments for live streaming
    args.push('-hls_list_size', settings.playlistSize.toString());
    // Use delete_threshold instead of delete_segments for better player compatibility
    args.push('-hls_delete_threshold', '1');
    args.push('-hls_flags', 'independent_segments+omit_endlist+program_date_time+discont_start');
    args.push('-hls_segment_type', 'mpegts');
    args.push('-hls_segment_filename', `${outputDir}/segment%03d.ts`);
    args.push('-start_number', '0');
    // Force timestamp normalization and continuous stream
    args.push('-avoid_negative_ts', 'make_zero');
    args.push('-fflags', '+genpts');

    // Output playlist
    args.push(`${outputDir}/playlist.m3u8`);

    return args;
}

/**
 * Get recommended settings based on system resources
 */
export function getRecommendedSettings(): Partial<TranscodeSettings> {
    const cpuCount = cpus().length;

    return {
        maxSessions: Math.min(cpuCount + 1, 10),
        preset: cpuCount >= 8 ? 'high' : cpuCount >= 4 ? 'medium' : 'low',
    };
}
