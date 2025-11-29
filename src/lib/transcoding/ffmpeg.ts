/**
 * FFmpeg detection and command building utilities
 */

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { cpus } from 'node:os';
import type { FFmpegInfo, TranscodeSettings } from './types';
import Logger from '@/lib/logger';

const execFileAsync = promisify(execFile);

let cachedFFmpegInfo: FFmpegInfo | null = null;

/**
 * Detect if ffmpeg is available and get its capabilities
 */
export async function detectFFmpeg(): Promise<FFmpegInfo> {
    if (cachedFFmpegInfo !== null) {
        return cachedFFmpegInfo;
    }

    const ffmpegPath = process.env.FFMPEG_PATH ?? 'ffmpeg';

    try {
        // Use execFile instead of exec to avoid shell injection risks
        const { stdout: versionOutput } = await execFileAsync(ffmpegPath, ['-version']);
        const versionMatch = versionOutput.match(/ffmpeg version (\S+)/);
        const version = versionMatch !== null ? versionMatch[1] : 'unknown';

        const { stdout: codecOutput, stderr: codecStderr } = await execFileAsync(ffmpegPath, ['-codecs']);
        const codecsOutput = codecOutput + codecStderr;
        const codecs: string[] = [];

        if (codecsOutput.includes('h264') || codecsOutput.includes('libx264')) {
            codecs.push('h264');
        }
        if (codecsOutput.includes('aac')) {
            codecs.push('aac');
        }

        const { stdout: hwAccelOutput } = await execFileAsync(ffmpegPath, ['-hwaccels']);
        const hwAccel = hwAccelOutput
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
 * Determine encoding strategy based on source codecs
 */
function determineEncodingStrategy(codecs?: ChannelCodecs): EncodingStrategy {
    const audioCodec = codecs?.audioCodec?.toLowerCase() ?? '';
    const needsSilentAudio = audioCodec.includes('ac4') || audioCodec.includes('ac-4');

    const sourceVideo = codecs?.videoCodec?.toLowerCase() ?? '';
    const canCopyVideo = sourceVideo.includes('h264') || sourceVideo.includes('avc');

    const sourceAudio = codecs?.audioCodec?.toLowerCase() ?? '';
    const canCopyAudio = sourceAudio.includes('aac') && !needsSilentAudio;

    Logger.info({
        sourceVideoCodec: codecs?.videoCodec,
        sourceAudioCodec: codecs?.audioCodec,
        videoStrategy: canCopyVideo ? 'copy (already H.264)' : 'transcode',
        audioStrategy: needsSilentAudio
            ? 'silent (AC4 unsupported)'
            : canCopyAudio
                ? 'copy (already AAC)'
                : 'transcode',
    }, 'Building FFmpeg command with codec optimization');

    return { needsSilentAudio, canCopyVideo, canCopyAudio };
}

/**
 * Add input and stream mapping arguments
 */
function addInputAndMapping(
    args: string[],
    sourceUrl: string,
    needsSilentAudio: boolean
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
 * Build ffmpeg command arguments for transcoding
 */
export function buildFFmpegCommand(
    sourceUrl: string,
    outputDir: string,
    settings: TranscodeSettings,
    codecs?: ChannelCodecs
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
    addInputAndMapping(args, sourceUrl, strategy.needsSilentAudio);

    // Video encoding
    if (strategy.canCopyVideo) {
        // Source is already H.264 - just copy it (fast!)
        args.push('-c:v', 'copy');
    } else {
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
        const gopSize = settings.framerate === 0
            ? 60
            : settings.framerate * settings.segmentDuration;
        args.push('-g', gopSize.toString());
        args.push('-keyint_min', gopSize.toString());
        args.push('-sc_threshold', '0');

        // H.264 profile for compatibility (8-bit)
        args.push('-profile:v', 'high');
        args.push('-level', '4.0');
    }

    // Audio encoding
    if (strategy.canCopyAudio) {
        // Source is already AAC - just copy it (fast!)
        args.push('-c:a', 'copy');
    } else {
        // Need to transcode audio (includes silent audio from anullsrc)
        args.push('-c:a', 'aac');
        args.push('-b:a', `${settings.audioBitrate}k`);
        args.push('-ar', '48000');
        args.push('-ac', '2');
        // Strict experimental AAC encoder flags for compatibility
        args.push('-strict', '-2');
    }

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
