/**
 * FFmpeg detection and command building utilities
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { cpus } from 'node:os';
import type { FFmpegInfo, Resolution, TranscodeSettings } from './types';
import Logger from '@/lib/logger';

const execFileAsync = promisify(execFile);

let cachedFFmpegInfo: FFmpegInfo | null = null;

// Validation bounds for transcoding settings
/** Minimum video bitrate in kbps */
const MIN_VIDEO_BITRATE = 500;
/** Maximum video bitrate in kbps */
const MAX_VIDEO_BITRATE = 10000;
/** Minimum audio bitrate in kbps */
const MIN_AUDIO_BITRATE = 64;
/** Maximum audio bitrate in kbps */
const MAX_AUDIO_BITRATE = 320;
/** Maximum concurrent transcoding sessions */
const MAX_CONCURRENT_SESSIONS = 20;
/** Maximum HLS segment duration in seconds */
const MAX_SEGMENT_DURATION = 10;
/** Maximum HLS playlist window size in segments */
const MAX_PLAYLIST_SIZE = 20;
/** Minimum HLS playlist window size in segments */
const MIN_PLAYLIST_SIZE = 2;
/** Default GOP size when no framerate is specified */
const DEFAULT_GOP_SIZE = 60;
/** Maximum recommended sessions based on CPU count */
const MAX_RECOMMENDED_SESSIONS = 10;
/** CPU count threshold for high preset */
const HIGH_PRESET_CPU_THRESHOLD = 8;
/** CPU count threshold for medium preset */
const MEDIUM_PRESET_CPU_THRESHOLD = 4;

/**
 * Parse available hardware accelerators from ffmpeg output
 */
function parseHwAccel(hwAccelOutput: string): string[] {
    return hwAccelOutput
        .split('\n')
        .slice(1) // Skip the "Hardware acceleration methods:" line
        .map(line => line.trim())
        .filter(line => {
            // Filter out empty lines and FFmpeg version/build info
            return line !== '' &&
                !line.includes('ffmpeg version') &&
                !line.includes('built with') &&
                !line.includes('configuration:') &&
                !line.includes('lib');
        });
}

/**
 * Parse available codecs from ffmpeg output
 */
function parseCodecs(codecsOutput: string): string[] {
    const codecs: string[] = [];

    if (codecsOutput.includes('h264') || codecsOutput.includes('libx264')) {
        codecs.push('h264');
    }
    if (codecsOutput.includes('aac')) {
        codecs.push('aac');
    }

    return codecs;
}

/**
 * Detect if ffmpeg is available and get its capabilities
 */
export async function detectFFmpeg(): Promise<FFmpegInfo> {
    if (cachedFFmpegInfo !== null) {
        return cachedFFmpegInfo;
    }

    const ffmpegPath = process.env.FFMPEG_PATH ?? 'ffmpeg';

    try {
        const { stdout: versionOutput } = await execFileAsync(ffmpegPath, ['-version']);
        const versionMatch = versionOutput.match(/ffmpeg version (\S+)/);
        const version = versionMatch !== null ? versionMatch[1] : 'unknown';

        const { stdout: codecOutput, stderr: codecStderr } = await execFileAsync(ffmpegPath, ['-codecs']);
        const codecsOutput = codecOutput + codecStderr;
        const codecs = parseCodecs(codecsOutput);

        const { stdout: hwAccelOutput } = await execFileAsync(ffmpegPath, ['-hwaccels']);
        const hwAccel = parseHwAccel(hwAccelOutput);

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
 * Validate a single range for a numeric setting
 */
function validateRange(
    { value, min, max, label, suffix }: { value: number; min: number; max: number; label: string; suffix?: string }
): string | null {
    if (value < min || value > max) {
        const unitPart = suffix !== undefined ? ` ${suffix}` : '';
        return `${label} must be between ${min} and ${max}${unitPart}`;
    }
    return null;
}

/**
 * Validate transcoding settings
 */
export function validateSettings(settings: TranscodeSettings): string[] {
    const checks = [
        validateRange({
            value: settings.videoBitrate,
            min: MIN_VIDEO_BITRATE,
            max: MAX_VIDEO_BITRATE,
            label: 'Video bitrate',
            suffix: 'kbps',
        }),
        validateRange({
            value: settings.audioBitrate,
            min: MIN_AUDIO_BITRATE,
            max: MAX_AUDIO_BITRATE,
            label: 'Audio bitrate',
            suffix: 'kbps',
        }),
        validateRange({ value: settings.maxSessions, min: 1, max: MAX_CONCURRENT_SESSIONS, label: 'Max sessions' }),
        validateRange({
            value: settings.segmentDuration,
            min: 1,
            max: MAX_SEGMENT_DURATION,
            label: 'Segment duration',
            suffix: 'seconds',
        }),
        validateRange({
            value: settings.playlistSize,
            min: MIN_PLAYLIST_SIZE,
            max: MAX_PLAYLIST_SIZE,
            label: 'Playlist size',
            suffix: 'segments',
        }),
    ];

    return checks.filter((msg): msg is string => msg !== null);
}

/**
 * Channel codec information
 */
export interface ChannelCodecs {
    videoCodec: string;
    audioCodec: string;
}

interface EncodingStrategy {
    needsSilentAudio: boolean;
    canCopyVideo: boolean;
    canCopyAudio: boolean;
}

/**
 * Build the log label for the audio encoding strategy
 */
function buildAudioStrategyLabel(needsSilentAudio: boolean, canCopyAudio: boolean): string {
    if (needsSilentAudio) {
        return 'silent (AC4 unsupported)';
    }
    if (canCopyAudio) {
        return 'copy (already AAC)';
    }
    return 'transcode';
}

/**
 * Determine if the audio codec requires silent audio substitution (AC4 is unsupported)
 */
function requiresSilentAudio(codecs?: ChannelCodecs): boolean {
    const audioCodec = codecs?.audioCodec?.toLowerCase() ?? '';
    return audioCodec.includes('ac4') || audioCodec.includes('ac-4');
}

/**
 * Determine if the video stream can be stream-copied (already H.264/AVC)
 */
function canStreamCopyVideo(codecs?: ChannelCodecs): boolean {
    const sourceVideo = codecs?.videoCodec?.toLowerCase() ?? '';
    return sourceVideo.includes('h264') || sourceVideo.includes('avc');
}

/**
 * Determine if the audio stream can be stream-copied (already AAC, and no silent substitution needed)
 */
function canStreamCopyAudio(codecs?: ChannelCodecs, needsSilentAudio = false): boolean {
    const sourceAudio = codecs?.audioCodec?.toLowerCase() ?? '';
    return sourceAudio.includes('aac') && !needsSilentAudio;
}

/**
 * Determine encoding strategy based on source codecs
 */
function determineEncodingStrategy(codecs?: ChannelCodecs): EncodingStrategy {
    const needsSilentAudio = requiresSilentAudio(codecs);
    const canCopyVideo = canStreamCopyVideo(codecs);
    const canCopyAudio = canStreamCopyAudio(codecs, needsSilentAudio);

    Logger.info({
        sourceVideoCodec: codecs?.videoCodec,
        sourceAudioCodec: codecs?.audioCodec,
        videoStrategy: canCopyVideo ? 'copy (already H.264)' : 'transcode',
        audioStrategy: buildAudioStrategyLabel(needsSilentAudio, canCopyAudio),
    }, 'Building FFmpeg command with codec optimization');

    return { needsSilentAudio, canCopyVideo, canCopyAudio };
}

/**
 * Add input and stream mapping arguments
 */
function addInputAndMapping(
    { args, sourceUrl, needsSilentAudio }: { args: string[]; sourceUrl: string; needsSilentAudio: boolean }
): void {
    args.push('-i', sourceUrl);

    if (needsSilentAudio) {
        // Input 2: Silent audio (workaround for AC4/unsupported codecs)
        args.push('-f', 'lavfi');
        args.push('-i', 'anullsrc=channel_layout=stereo:sample_rate=48000');

        // Map streams: video from input 0, audio from input 1 (silent)
        args.push('-map', '0:v:0'); // Video from source
        args.push('-map', '1:a:0'); // Audio from silent generator
        args.push('-shortest'); // Stop when shortest stream ends
    } else {
        // Normal audio - map both video and audio from source
        args.push('-map', '0:v:0'); // Video from source
        args.push('-map', '0:a:0'); // First audio stream
    }
}

/**
 * Append video encoding arguments to the args array
 */
function addVideoEncoding(
    { args, settings, canCopyVideo }: { args: string[]; settings: TranscodeSettings; canCopyVideo: boolean }
): void {
    if (canCopyVideo) {
        // Source is already H.264 - just copy it (fast!)
        args.push('-c:v', 'copy');
        return;
    }

    // Need to transcode video
    args.push('-c:v', settings.videoCodec);
    args.push('-preset', 'ultrafast');
    args.push('-tune', 'zerolatency');

    // Video bitrate
    args.push('-b:v', `${settings.videoBitrate}k`);
    args.push('-maxrate', `${settings.videoBitrate}k`);
    args.push('-bufsize', `${settings.videoBitrate * 2}k`);

    // Convert 10-bit to 8-bit (for sources like HEVC Main 10)
    // This is needed because h264 'main' profile only supports 8-bit
    args.push('-pix_fmt', 'yuv420p');

    // Resolution
    if (settings.resolution !== 'source') {
        const resolutionMap: Partial<Record<Resolution, string>> = {
            '480p': '854x480',
            '720p': '1280x720',
            '1080p': '1920x1080',
        };
        const resolution = resolutionMap[settings.resolution];
        if (resolution !== undefined) {
            args.push('-s', resolution);
        }
    }

    // Framerate
    if (settings.framerate !== 0) {
        args.push('-r', settings.framerate.toString());
    }

    // GOP size (match segment duration for keyframe alignment)
    const gopSize = settings.framerate === 0
        ? DEFAULT_GOP_SIZE
        : settings.framerate * settings.segmentDuration;
    args.push('-g', gopSize.toString());
    args.push('-keyint_min', gopSize.toString());
    args.push('-sc_threshold', '0');

    // H.264 profile for compatibility (8-bit)
    args.push('-profile:v', 'high');
    args.push('-level', '4.0');
}

/**
 * Append audio encoding arguments to the args array
 */
function addAudioEncoding(
    { args, settings, canCopyAudio }: { args: string[]; settings: TranscodeSettings; canCopyAudio: boolean }
): void {
    if (canCopyAudio) {
        // Source is already AAC - just copy it (fast!)
        args.push('-c:a', 'copy');
        return;
    }

    // Need to transcode audio (includes silent audio from anullsrc)
    args.push('-c:a', 'aac');
    args.push('-b:a', `${settings.audioBitrate}k`);
    args.push('-ar', '48000');
    args.push('-ac', '2');
    // Strict experimental AAC encoder flags for compatibility
    args.push('-strict', '-2');
}

/**
 * Build ffmpeg command arguments for transcoding
 */
export function buildFFmpegCommand(
    { sourceUrl, outputDir, settings, codecs }: {
        sourceUrl: string;
        outputDir: string;
        settings: TranscodeSettings;
        codecs?: ChannelCodecs;
    }
): string[] {
    const args: string[] = [];

    // HTTP options for better reliability with HDHomeRun tuners
    args.push('-reconnect', '1');
    args.push('-reconnect_streamed', '1');
    args.push('-reconnect_delay_max', '2');
    args.push('-timeout', '10000000'); // 10 seconds in microseconds
    args.push('-analyzeduration', '10000000'); // 10 seconds
    args.push('-probesize', '10000000'); // 10MB

    const strategy = determineEncodingStrategy(codecs);
    addInputAndMapping({ args, sourceUrl, needsSilentAudio: strategy.needsSilentAudio });

    addVideoEncoding({ args, settings, canCopyVideo: strategy.canCopyVideo });
    addAudioEncoding({ args, settings, canCopyAudio: strategy.canCopyAudio });

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

    let preset: 'high' | 'medium' | 'low';
    if (cpuCount >= HIGH_PRESET_CPU_THRESHOLD) {
        preset = 'high';
    } else if (cpuCount >= MEDIUM_PRESET_CPU_THRESHOLD) {
        preset = 'medium';
    } else {
        preset = 'low';
    }

    return {
        maxSessions: Math.min(cpuCount + 1, MAX_RECOMMENDED_SESSIONS),
        preset,
    };
}
