import { describe, it, expect } from 'vitest';
const FFMPEG_CMD = 'ffmpeg';
import { validateSettings, buildFFmpegCommand, getRecommendedSettings } from './ffmpeg';
import { DEFAULT_SETTINGS } from './types';

describe('ffmpeg utilities', () => {
    describe('validateSettings', () => {
        it('should pass validation for default settings', () => {
            const errors = validateSettings(DEFAULT_SETTINGS);
            expect(errors).toEqual([]);
        });

        it('should reject video bitrate below 500', () => {
            const settings = { ...DEFAULT_SETTINGS, videoBitrate: 400 };
            const errors = validateSettings(settings);
            expect(errors).toContain('Video bitrate must be between 500 and 10000 kbps');
        });

        it('should reject video bitrate above 10000', () => {
            const settings = { ...DEFAULT_SETTINGS, videoBitrate: 15000 };
            const errors = validateSettings(settings);
            expect(errors).toContain('Video bitrate must be between 500 and 10000 kbps');
        });

        it('should reject audio bitrate below 64', () => {
            const settings = { ...DEFAULT_SETTINGS, audioBitrate: 32 };
            const errors = validateSettings(settings);
            expect(errors).toContain('Audio bitrate must be between 64 and 320 kbps');
        });

        it('should reject max sessions below 1', () => {
            const settings = { ...DEFAULT_SETTINGS, maxSessions: 0 };
            const errors = validateSettings(settings);
            expect(errors).toContain('Max sessions must be between 1 and 20');
        });

        it('should reject segment duration below 1', () => {
            const settings = { ...DEFAULT_SETTINGS, segmentDuration: 0 };
            const errors = validateSettings(settings);
            expect(errors).toContain('Segment duration must be between 1 and 10 seconds');
        });

        it('should reject playlist size below 2', () => {
            const settings = { ...DEFAULT_SETTINGS, playlistSize: 1 };
            const errors = validateSettings(settings);
            expect(errors).toContain('Playlist size must be between 2 and 20 segments');
        });

        it('should return multiple errors for multiple violations', () => {
            const settings = { ...DEFAULT_SETTINGS, videoBitrate: 100, audioBitrate: 10 };
            const errors = validateSettings(settings);
            expect(errors.length).toBe(2);
        });
    });

    describe('buildFFmpegCommand', () => {
        it('should build basic command with default settings', () => {
            const args = buildFFmpegCommand(
                'http://tuner:5004/auto/v10.1',
                '/tmp/output',
                DEFAULT_SETTINGS
            );

            expect(args).toContain('-i');
            expect(args).toContain('http://tuner:5004/auto/v10.1');
            expect(args).toContain('-c:v');
            expect(args).toContain('libx264');
            expect(args).toContain('-c:a');
            expect(args).toContain('aac');
            expect(args).toContain('-f');
            expect(args).toContain('hls');
            expect(args).toContain('/tmp/output/playlist.m3u8');
        });

        it('should include resolution scaling when not source', () => {
            const settings = { ...DEFAULT_SETTINGS, resolution: '720p' as const };
            const args = buildFFmpegCommand('http://test', '/tmp', settings);

            expect(args).toContain('-s');
            expect(args).toContain('1280x720');
        });

        it('should not include resolution scaling when source', () => {
            const settings = { ...DEFAULT_SETTINGS, resolution: 'source' as const };
            const args = buildFFmpegCommand('http://test', '/tmp', settings);

            expect(args).not.toContain('-s');
        });

        it('should include framerate when specified', () => {
            const settings = { ...DEFAULT_SETTINGS, framerate: 60 as const };
            const args = buildFFmpegCommand('http://test', '/tmp', settings);

            expect(args).toContain('-r');
            expect(args).toContain('60');
        });

        it('should not include framerate when source (0)', () => {
            const settings = { ...DEFAULT_SETTINGS, framerate: 0 as const };
            const args = buildFFmpegCommand('http://test', '/tmp', settings);

            const rIndex = args.indexOf('-r');
            expect(rIndex).toBe(-1);
        });

        it('should calculate GOP size based on framerate and segment duration', () => {
            const settings = { ...DEFAULT_SETTINGS, framerate: 30 as const, segmentDuration: 2 };
            const args = buildFFmpegCommand('http://test', '/tmp', settings);

            const gIndex = args.indexOf('-g');
            expect(args[gIndex + 1]).toBe('60'); // 30fps * 2s = 60
        });

        it('should include bitrate settings', () => {
            const settings = { ...DEFAULT_SETTINGS, videoBitrate: 3000, audioBitrate: 192 };
            const args = buildFFmpegCommand('http://test', '/tmp', settings);

            expect(args).toContain('3000k');
            expect(args).toContain('192k');
        });

        it('should include HLS segment settings', () => {
            const settings = { ...DEFAULT_SETTINGS, segmentDuration: 3, playlistSize: 5 };
            const args = buildFFmpegCommand('http://test', '/tmp', settings);

            const timeIndex = args.indexOf('-hls_time');
            expect(args[timeIndex + 1]).toBe('3');

            const sizeIndex = args.indexOf('-hls_list_size');
            expect(args[sizeIndex + 1]).toBe('5');
        });
    });

    describe('getRecommendedSettings', () => {
        it('should recommend settings based on CPU count', () => {
            const settings = getRecommendedSettings();

            expect(settings.maxSessions).toBeGreaterThan(0);
            expect(settings.maxSessions).toBeLessThanOrEqual(10);
            expect(settings.preset).toMatch(/^(low|medium|high)$/);
        });
    });
});
