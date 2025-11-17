/**
 * Video transcoding type definitions
 */

export type TranscodePreset = 'low' | 'medium' | 'high' | 'custom';
export type VideoCodec = 'libx264' | 'h264_qsv' | 'h264_nvenc' | 'h264_vaapi' | 'h264_videotoolbox';
export type Resolution = '480p' | '720p' | '1080p' | 'source';
export type HardwareAccel = 'none' | 'qsv' | 'nvenc' | 'vaapi' | 'videotoolbox';

export interface TranscodeSettings {
    enabled: boolean;
    preset: TranscodePreset;
    videoCodec: VideoCodec;
    videoBitrate: number;  // kbps
    audioBitrate: number;  // kbps
    resolution: Resolution;
    framerate: 24 | 30 | 60 | 0;  // 0 = source
    maxSessions: number;
    segmentDuration: number;  // seconds
    playlistSize: number;  // number of segments
    hardwareAccel: HardwareAccel;
}

export interface FFmpegInfo {
    available: boolean;
    version?: string;
    codecs: string[];
    hwAccel: string[];
    path?: string;
}

export interface SessionStats {
    sessionId: string;
    tunerId: number;
    channelId: number;
    channelName: string;
    viewerCount: number;
    uptime: number;  // seconds
    status: 'starting' | 'running' | 'stopping' | 'error';
}

export const DEFAULT_SETTINGS: TranscodeSettings = {
    enabled: false,  // Will be set to true if ffmpeg detected
    preset: 'medium',
    videoCodec: 'libx264',
    videoBitrate: 2000,
    audioBitrate: 128,
    resolution: '1080p',
    framerate: 30,
    maxSessions: 5,
    segmentDuration: 2,
    playlistSize: 3,
    hardwareAccel: 'none',
};

export const PRESET_SETTINGS: Record<TranscodePreset, Partial<TranscodeSettings>> = {
    low: {
        videoCodec: 'libx264',
        videoBitrate: 1000,
        audioBitrate: 96,
        resolution: '720p',
        framerate: 30,
    },
    medium: {
        videoCodec: 'libx264',
        videoBitrate: 2000,
        audioBitrate: 128,
        resolution: '1080p',
        framerate: 30,
    },
    high: {
        videoCodec: 'libx264',
        videoBitrate: 4000,
        audioBitrate: 192,
        resolution: '1080p',
        framerate: 60,
    },
    custom: {},
};
