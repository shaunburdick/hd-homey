'use client';

/**
 * Form field sub-components for the Transcoding Settings page.
 * These are split out to keep transcoding-settings.tsx within line limits.
 */

import type { TranscodeSettings, FFmpegInfo } from '@/lib/transcoding/types';

/** Maximum value for the HLS segment-duration input. */
const MAX_SEGMENT_DURATION = 10;

/** Maximum value for the playlist-size input. */
const MAX_PLAYLIST_SIZE = 20;

/** Maximum number of concurrent transcoding sessions. */
const MAX_CONCURRENT_SESSIONS = 20;

/**
 * Parses a string from a number input element to an integer.
 * Using Number() avoids the magic-number radix in parseInt(val, 10).
 */
export function parseIntegerInput(value: string): number {
    return Math.trunc(Number(value));
}

/** Video codec selector (libx264 + any available hardware accelerators). */
export function VideoCodecSelect({
    settings,
    ffmpegInfo,
    onSettingsChange,
}: {
    settings: TranscodeSettings;
    ffmpegInfo: FFmpegInfo;
    onSettingsChange: (updated: TranscodeSettings) => void;
}) {
    return (
        <p>
            <label htmlFor="videoCodec">Video Codec:</label>
            <select
                id="videoCodec"
                name="videoCodec"
                value={settings.videoCodec}
                onChange={(changeEvent) =>
                    onSettingsChange({
                        ...settings,
                        videoCodec: changeEvent.target.value as TranscodeSettings['videoCodec'],
                    })
                }
            >
                <option value="libx264">libx264 (Software)</option>

                {ffmpegInfo.hwAccel.includes('videotoolbox') && (
                    <option value="h264_videotoolbox">VideoToolbox (Hardware)</option>
                )}
                {ffmpegInfo.hwAccel.includes('qsv') && (
                    <option value="h264_qsv">Quick Sync (Hardware)</option>
                )}
                {ffmpegInfo.hwAccel.includes('nvenc') && (
                    <option value="h264_nvenc">NVENC (Hardware)</option>
                )}
                {ffmpegInfo.hwAccel.includes('vaapi') && (
                    <option value="h264_vaapi">VA-API (Hardware)</option>
                )}
            </select>
        </p>
    );
}

/** Resolution and framerate selectors for the custom preset. */
export function ResolutionFramerateSelects({
    settings,
    onSettingsChange,
}: {
    settings: TranscodeSettings;
    onSettingsChange: (updated: TranscodeSettings) => void;
}) {
    return (
        <>
            <p>
                <label htmlFor="resolution">Maximum Resolution:</label>
                <select
                    id="resolution"
                    name="resolution"
                    value={settings.resolution}
                    onChange={(changeEvent) =>
                        onSettingsChange({
                            ...settings,
                            resolution: changeEvent.target.value as TranscodeSettings['resolution'],
                        })
                    }
                >
                    <option value="480p">480p</option>
                    <option value="720p">720p</option>
                    <option value="1080p">1080p</option>
                    <option value="source">Source (no scaling)</option>
                </select>
            </p>

            <p>
                <label htmlFor="framerate">Framerate:</label>
                <select
                    id="framerate"
                    name="framerate"
                    value={settings.framerate}
                    onChange={(changeEvent) =>
                        onSettingsChange({
                            ...settings,
                            framerate: parseIntegerInput(changeEvent.target.value) as TranscodeSettings['framerate'],
                        })
                    }
                >
                    <option value="24">24 fps</option>
                    <option value="30">30 fps</option>
                    <option value="60">60 fps</option>
                    <option value="0">Source (no change)</option>
                </select>
            </p>
        </>
    );
}

/** Custom codec/bitrate/resolution/framerate fields, shown only when preset is "custom". */
export function CustomSettingsFields({
    settings,
    ffmpegInfo,
    onSettingsChange,
}: {
    settings: TranscodeSettings;
    ffmpegInfo: FFmpegInfo;
    onSettingsChange: (updated: TranscodeSettings) => void;
}) {
    return (
        <>
            <h4>Custom Settings</h4>

            <VideoCodecSelect
                settings={settings}
                ffmpegInfo={ffmpegInfo}
                onSettingsChange={onSettingsChange}
            />

            <p>
                <label htmlFor="videoBitrate">Video Bitrate (kbps):</label>
                <input
                    type="number"
                    id="videoBitrate"
                    name="videoBitrate"
                    value={settings.videoBitrate}
                    onChange={(changeEvent) =>
                        onSettingsChange({ ...settings, videoBitrate: parseIntegerInput(changeEvent.target.value) })
                    }
                    min="500"
                    max="10000"
                />
            </p>

            <p>
                <label htmlFor="audioBitrate">Audio Bitrate (kbps):</label>
                <input
                    type="number"
                    id="audioBitrate"
                    name="audioBitrate"
                    value={settings.audioBitrate}
                    onChange={(changeEvent) =>
                        onSettingsChange({ ...settings, audioBitrate: parseIntegerInput(changeEvent.target.value) })
                    }
                    min="64"
                    max="320"
                />
            </p>

            <ResolutionFramerateSelects settings={settings} onSettingsChange={onSettingsChange} />
        </>
    );
}

/** Hidden inputs that carry the current preset values when custom fields are hidden. */
export function PresetHiddenFields({ settings }: { settings: TranscodeSettings }) {
    return (
        <>
            <input type="hidden" name="videoCodec" value={settings.videoCodec} />
            <input type="hidden" name="videoBitrate" value={settings.videoBitrate} />
            <input type="hidden" name="audioBitrate" value={settings.audioBitrate} />
            <input type="hidden" name="resolution" value={settings.resolution} />
            <input type="hidden" name="framerate" value={settings.framerate} />
        </>
    );
}

/** Max sessions field with recommendation hint. */
function MaxSessionsField({
    settings,
    recommendedMaxSessions,
    onSettingsChange,
}: {
    settings: TranscodeSettings;
    recommendedMaxSessions: number;
    onSettingsChange: (updated: TranscodeSettings) => void;
}) {
    return (
        <p>
            <label htmlFor="maxSessions">Maximum Concurrent Sessions:</label>
            <input
                type="number"
                id="maxSessions"
                name="maxSessions"
                value={settings.maxSessions}
                onChange={(changeEvent) =>
                    onSettingsChange({ ...settings, maxSessions: parseIntegerInput(changeEvent.target.value) })
                }
                min="1"
                max={MAX_CONCURRENT_SESSIONS}
            />
            <small> Recommended: {recommendedMaxSessions}</small>
        </p>
    );
}

/** Segment duration and playlist size fields. */
function HlsBufferFields({
    settings,
    onSettingsChange,
}: {
    settings: TranscodeSettings;
    onSettingsChange: (updated: TranscodeSettings) => void;
}) {
    return (
        <>
            <p>
                <label htmlFor="segmentDuration">HLS Segment Duration (seconds):</label>
                <input
                    type="number"
                    id="segmentDuration"
                    name="segmentDuration"
                    value={settings.segmentDuration}
                    onChange={(changeEvent) =>
                        onSettingsChange({
                            ...settings,
                            segmentDuration: parseIntegerInput(changeEvent.target.value),
                        })
                    }
                    min="1"
                    max={MAX_SEGMENT_DURATION}
                />
                <small> Lower = less latency, higher = better compatibility</small>
            </p>

            <p>
                <label htmlFor="playlistSize">Playlist Size (segments):</label>
                <input
                    type="number"
                    id="playlistSize"
                    name="playlistSize"
                    value={settings.playlistSize}
                    onChange={(changeEvent) =>
                        onSettingsChange({ ...settings, playlistSize: parseIntegerInput(changeEvent.target.value) })
                    }
                    min="2"
                    max={MAX_PLAYLIST_SIZE}
                />
                <small> Recommended: 3-5 segments</small>
            </p>
        </>
    );
}

/** Advanced settings section (max sessions, segment duration, playlist size). */
export function AdvancedSettingsFields({
    settings,
    recommendedMaxSessions,
    onSettingsChange,
}: {
    settings: TranscodeSettings;
    recommendedMaxSessions: number;
    onSettingsChange: (updated: TranscodeSettings) => void;
}) {
    return (
        <>
            <h4>Advanced Settings</h4>
            <MaxSessionsField
                settings={settings}
                recommendedMaxSessions={recommendedMaxSessions}
                onSettingsChange={onSettingsChange}
            />
            <HlsBufferFields settings={settings} onSettingsChange={onSettingsChange} />
        </>
    );
}
