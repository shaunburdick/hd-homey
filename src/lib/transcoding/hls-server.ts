/**
 * HLS file serving utilities
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import Logger from '@/lib/logger';

/**
 * Serve an HLS playlist file
 */
export async function servePlaylist(
    outputDir: string
): Promise<Response> {
    const playlistPath = join(outputDir, 'playlist.m3u8');

    try {
        const content = await fs.readFile(playlistPath, 'utf-8');

        return new Response(content, {
            status: 200,
            headers: {
                'Content-Type': 'application/vnd.apple.mpegurl',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': '*',
            },
        });
    } catch (error) {
        Logger.error({ error, playlistPath }, 'Failed to serve playlist');
        return new Response('Playlist not found', { status: 404 });
    }
}

/**
 * Serve an HLS segment file
 */
export async function serveSegment(
    outputDir: string,
    segmentName: string
): Promise<Response> {
    // Validate segment name to prevent directory traversal
    if (segmentName.includes('..') || segmentName.includes('/')) {
        Logger.warn({ segmentName }, 'Invalid segment name');
        return new Response('Invalid segment name', { status: 400 });
    }

    // Only allow .ts files
    if (!segmentName.endsWith('.ts')) {
        Logger.warn({ segmentName }, 'Invalid segment file extension');
        return new Response('Invalid segment file', { status: 400 });
    }

    const segmentPath = join(outputDir, segmentName);

    try {
        const content = await fs.readFile(segmentPath);

        return new Response(content, {
            status: 200,
            headers: {
                'Content-Type': 'video/mp2t',
                'Cache-Control': 'public, max-age=31536000, immutable',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Headers': '*',
            },
        });
    } catch (error) {
        // Segment might not be ready yet, return 404
        Logger.debug({ error, segmentPath }, 'Segment not found');
        return new Response('Segment not found', { status: 404 });
    }
}
