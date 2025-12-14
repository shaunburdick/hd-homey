/**
 * Core transcoding logic using ffmpeg
 */

import { spawn  } from 'node:child_process';
import type { ChildProcess } from 'node:child_process';
import { promises as fs } from 'node:fs';
import type { TranscodeSettings } from './types';
import { buildFFmpegCommand } from './ffmpeg';
import Logger from '@/lib/logger';

/**
 * Transcoding process with error tracking
 */
export interface TranscodeProcess {
    process: ChildProcess;
    getStderr: () => string;
}

/**
 * Start a transcoding process
 */
export async function startTranscode(
    sourceUrl: string,
    outputDir: string,
    settings: TranscodeSettings,
    codecs?: { videoCodec: string; audioCodec: string }
): Promise<TranscodeProcess> {
    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    const ffmpegPath = process.env.FFMPEG_PATH ?? 'ffmpeg';
    const args = buildFFmpegCommand(sourceUrl, outputDir, settings, codecs);

    Logger.info(
        {
            sourceUrl,
            outputDir,
            settings,
            command: `${ffmpegPath} ${args.join(' ')}`,
        },
        'Starting ffmpeg transcode'
    );

    const ffmpeg = spawn(ffmpegPath, args, {
        stdio: ['ignore', 'pipe', 'pipe'],
    });

    // Capture FFmpeg stderr output for error reporting
    let stderrBuffer = '';
    const MAX_STDERR_BUFFER = 10000; // Keep last 10KB

    // Log ffmpeg output
    ffmpeg.stdout.on('data', (data) => {
        Logger.debug({ output: data.toString() }, 'FFmpeg stdout');
    });

    ffmpeg.stderr.on('data', (data) => {
        const output = data.toString();

        // Accumulate stderr for error reporting
        stderrBuffer += output;
        if (stderrBuffer.length > MAX_STDERR_BUFFER) {
            stderrBuffer = stderrBuffer.slice(-MAX_STDERR_BUFFER);
        }

        // FFmpeg writes ALL output to stderr, including progress
        // Log errors/warnings at appropriate level
        const hasError =
            output.includes('error') === true ||
            output.includes('Error') === true ||
            output.includes('ERROR') === true;
        const hasWarning =
            output.includes('warning') === true ||
            output.includes('Warning') === true ||
            output.includes('WARNING') === true;

        if (hasError) {
            Logger.error({ output }, 'FFmpeg error');
        } else if (hasWarning) {
            Logger.warn({ output }, 'FFmpeg warning');
        } else {
            Logger.debug({ output }, 'FFmpeg stderr');
        }
    });

    ffmpeg.on('error', (error) => {
        Logger.error(
            { error, sourceUrl, stderr: stderrBuffer },
            'FFmpeg process error'
        );
    });

    ffmpeg.on('exit', (code, signal) => {
        if (code !== 0 && code !== null) {
            Logger.error(
                { code, signal, sourceUrl, outputDir, stderr: stderrBuffer },
                'FFmpeg process exited with error'
            );
        } else {
            Logger.info(
                { code, signal, sourceUrl, outputDir },
                'FFmpeg process exited'
            );
        }
    });

    return {
        process: ffmpeg,
        getStderr: () => stderrBuffer,
    };
}

/**
 * Stop a transcoding process gracefully
 */
export async function stopTranscode(process: ChildProcess): Promise<void> {
    if (process.pid === undefined || process.pid === 0 || isNaN(process.pid)) {
        Logger.warn('Attempted to stop process with no PID');
        return;
    }

    // Check if process is already dead
    if (process.exitCode !== null || process.killed) {
        Logger.debug({ pid: process.pid, exitCode: process.exitCode }, 'Process already exited');
        return;
    }

    Logger.info({ pid: process.pid }, 'Stopping transcode process');

    return await new Promise((resolve) => {
        const timeout = setTimeout(() => {
            Logger.warn({ pid: process.pid }, 'Process did not exit gracefully, sending SIGKILL');
            process.kill('SIGKILL');
            // Don't resolve here - wait for the exit event
        }, 5000);

        // Remove any existing listeners to prevent duplicate event handling
        process.removeAllListeners('exit');

        process.once('exit', () => {
            clearTimeout(timeout);
            Logger.debug({ pid: process.pid }, 'Process exit confirmed');
            resolve();
        });

        // Send SIGTERM to gracefully stop FFmpeg
        try {
            process.kill('SIGTERM');
        } catch (error) {
            // Process might have already exited
            Logger.debug({ error, pid: process.pid }, 'Error sending SIGTERM (process may have already exited)');
            clearTimeout(timeout);
            resolve();
        }
    });
}

/**
 * Wait for the HLS playlist file to be created
 */
export async function waitForPlaylist(
    playlistPath: string,
    timeoutMs = 10000
): Promise<boolean> {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        try {
            await fs.access(playlistPath);
            Logger.debug({ playlistPath }, 'Playlist file found');
            return true;
        } catch {
            await new Promise((resolve) => setTimeout(resolve, 100));
        }
    }

    Logger.warn({ playlistPath, timeoutMs }, 'Playlist file not found within timeout');
    return false;
}

/**
 * Clean up temporary transcoding files
 */
export async function cleanupTranscodeFiles(outputDir: string): Promise<void> {
    try {
        Logger.debug({ outputDir }, 'Cleaning up transcode files');

        // Small delay to ensure FFmpeg has fully released all file handles
        // This prevents "No such file or directory" errors when FFmpeg
        // is still writing segments during shutdown
        await new Promise((resolve) => setTimeout(resolve, 100));

        await fs.rm(outputDir, { recursive: true, force: true });
        Logger.debug({ outputDir }, 'Transcode files cleaned up successfully');
    } catch (error) {
        Logger.error({ error, outputDir }, 'Failed to cleanup transcode files');
    }
}
