'use client';

/**
 * Transcoding Settings Form Component
 */

import { useActionState, useEffect, useState } from 'react';
import type { FormState } from '@/lib/actions/transcoding';
import { updateTranscodingSettingsAction, applyPreset } from '@/lib/actions/transcoding';
import type { TranscodeSettings, FFmpegInfo } from '@/lib/transcoding/types';
import { InfoCard } from '@/components/layouts';

interface TranscodingSettingsProps {
    initialSettings: TranscodeSettings;
    ffmpegInfo: FFmpegInfo;
    recommendedMaxSessions: number;
}

export function FFmpegStatusCard({ ffmpegInfo }: { ffmpegInfo: FFmpegInfo }) {
    if (!ffmpegInfo.available) {
        return (
            <div style={{
                padding: 'var(--space-4)',
                backgroundColor: 'var(--color-error-bg)',
                border: '1px solid var(--color-error)',
                borderRadius: 'var(--radius-md)',
            }}>
                <h3 style={{ marginTop: 0, color: 'var(--color-error)' }}>FFmpeg Not Available</h3>
                <p style={{ marginBottom: 0, color: 'var(--color-error)' }}>
                    Transcoding requires FFmpeg to be installed.
                    Please install FFmpeg and restart the application.
                </p>
            </div>
        );
    }

    return (
        <InfoCard
            title="FFmpeg Status"
            items={[
                { label: 'Version', value: ffmpegInfo.version },
                { label: 'Available Codecs', value: ffmpegInfo.codecs.join(', ') },
                {
                    label: 'Hardware Acceleration',
                    value: ffmpegInfo.hwAccel.length > 0 ? ffmpegInfo.hwAccel.join(', ') : 'None'
                },
            ]}
        />
    );
}

const initialState: FormState = { errors: {} };

export default function TranscodingSettings({
    initialSettings,
    ffmpegInfo,
    recommendedMaxSessions,
}: TranscodingSettingsProps) {
    const [state, formAction, isPending] = useActionState(
        updateTranscodingSettingsAction,
        initialState
    );
    const [settings, setSettings] = useState<TranscodeSettings>(initialSettings);
    const [showCustom, setShowCustom] = useState(initialSettings.preset === 'custom');

    // Handle preset change
    const handlePresetChange = (preset: TranscodeSettings['preset']) => {
        if (preset === 'custom') {
            setShowCustom(true);
            setSettings({ ...settings, preset });
        } else {
            setShowCustom(false);
            void applyPreset(settings, preset).then((newSettings) => {
                setSettings(newSettings);
                return newSettings;
            });
        }
    };

    useEffect(() => {
        if (state.success) {
            // Settings saved successfully - page will redirect
        }
    }, [state.success]);

    return (
        <form action={formAction} style={{
            padding: 'var(--space-4)',
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
        }}>
            <h3 style={{ marginTop: 0 }}>Transcoding Settings</h3>

            {state.errors.auth && (
                <div className="p-4 mb-4 bg-error">
                    {state.errors.auth.map((error) => (
                        <p key={error}>{error}</p>
                    ))}
                </div>
            )}

            {state.errors.validation && (
                <div className="p-4 mb-4 bg-error">
                    <strong>Validation Errors:</strong>
                    <ul>
                        {state.errors.validation.map((error) => (
                            <li key={error}>{error}</li>
                        ))}
                    </ul>
                </div>
            )}

            <p>
                <label>
                    <input
                        type="checkbox"
                        name="enabled"
                        checked={settings.enabled}
                        onChange={(e) => setSettings({ ...settings, enabled: e.target.checked })}
                    />
                    {' '}
                    Enable Transcoding
                </label>
            </p>

            <p>
                <label htmlFor="preset">
                    Quality Preset:
                </label>
                <select
                    id="preset"
                    name="preset"
                    value={settings.preset}
                    onChange={(e) =>
                        handlePresetChange(e.target.value as TranscodeSettings['preset'])
                    }
                >
                    <option value="low">Low (720p, 1000kbps)</option>
                    <option value="medium">Medium (1080p, 2000kbps)</option>
                    <option value="high">High (1080p, 4000kbps)</option>
                    <option value="custom">Custom</option>
                </select>
                <small>
                    {' '}
                    Recommended:
                    {' '}
                    {recommendedMaxSessions >= 8 ? 'High' : recommendedMaxSessions >= 4 ? 'Medium' : 'Low'}
                </small>
            </p>

            {showCustom && (
                <>
                    <h4>Custom Settings</h4>

                    <p>
                        <label htmlFor="videoCodec">
                            Video Codec:
                        </label>
                        <select
                            id="videoCodec"
                            name="videoCodec"
                            value={settings.videoCodec}
                            onChange={(e) =>
                                setSettings({
                                    ...settings,
                                    videoCodec: e.target.value as TranscodeSettings['videoCodec'],
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

                    <p>
                        <label htmlFor="videoBitrate">
                            Video Bitrate (kbps):
                        </label>
                        <input
                            type="number"
                            id="videoBitrate"
                            name="videoBitrate"
                            value={settings.videoBitrate}
                            onChange={(e) =>
                                setSettings({ ...settings, videoBitrate: parseInt(e.target.value, 10) })
                            }
                            min="500"
                            max="10000"
                        />
                    </p>

                    <p>
                        <label htmlFor="audioBitrate">
                            Audio Bitrate (kbps):
                        </label>
                        <input
                            type="number"
                            id="audioBitrate"
                            name="audioBitrate"
                            value={settings.audioBitrate}
                            onChange={(e) =>
                                setSettings({ ...settings, audioBitrate: parseInt(e.target.value, 10) })
                            }
                            min="64"
                            max="320"
                        />
                    </p>

                    <p>
                        <label htmlFor="resolution">
                            Maximum Resolution:
                        </label>
                        <select
                            id="resolution"
                            name="resolution"
                            value={settings.resolution}
                            onChange={(e) =>
                                setSettings({
                                    ...settings,
                                    resolution: e.target.value as TranscodeSettings['resolution'],
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
                        <label htmlFor="framerate">
                            Framerate:
                        </label>
                        <select
                            id="framerate"
                            name="framerate"
                            value={settings.framerate}
                            onChange={(e) =>
                                setSettings({
                                    ...settings,
                                    framerate: parseInt(e.target.value, 10) as TranscodeSettings['framerate'],
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
            )}

            {!showCustom && (
                <>
                    <input type="hidden" name="videoCodec" value={settings.videoCodec} />
                    <input type="hidden" name="videoBitrate" value={settings.videoBitrate} />
                    <input type="hidden" name="audioBitrate" value={settings.audioBitrate} />
                    <input type="hidden" name="resolution" value={settings.resolution} />
                    <input type="hidden" name="framerate" value={settings.framerate} />
                </>
            )}

            <h4>Advanced Settings</h4>

            <p>
                <label htmlFor="maxSessions">
                    Maximum Concurrent Sessions:
                </label>
                <input
                    type="number"
                    id="maxSessions"
                    name="maxSessions"
                    value={settings.maxSessions}
                    onChange={(e) =>
                        setSettings({ ...settings, maxSessions: parseInt(e.target.value, 10) })
                    }
                    min="1"
                    max="20"
                />
                <small>
                    {' '}
                    Recommended:
                    {' '}
                    {recommendedMaxSessions}
                </small>
            </p>

            <p>
                <label htmlFor="segmentDuration">
                    HLS Segment Duration (seconds):
                </label>
                <input
                    type="number"
                    id="segmentDuration"
                    name="segmentDuration"
                    value={settings.segmentDuration}
                    onChange={(e) =>
                        setSettings({ ...settings, segmentDuration: parseInt(e.target.value, 10) })
                    }
                    min="1"
                    max="10"
                />
                <small>
                    {' '}
                    Lower = less latency, higher = better compatibility
                </small>
            </p>

            <p>
                <label htmlFor="playlistSize">
                    Playlist Size (segments):
                </label>
                <input
                    type="number"
                    id="playlistSize"
                    name="playlistSize"
                    value={settings.playlistSize}
                    onChange={(e) =>
                        setSettings({ ...settings, playlistSize: parseInt(e.target.value, 10) })
                    }
                    min="2"
                    max="20"
                />
                <small>
                    {' '}
                    Recommended: 3-5 segments
                </small>
            </p>

            <input type="hidden" name="hardwareAccel" value={settings.hardwareAccel} />

            <div style={{ marginTop: 'var(--space-6)' }}>
                <button
                    type="submit"
                    disabled={isPending}
                >
                    {isPending ? 'Saving...' : '💾 Save Settings'}
                </button>
            </div>
        </form>
    );
}
