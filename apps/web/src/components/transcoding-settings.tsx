'use client';

/**
 * Transcoding Settings Form Component
 */

import { useActionState, useEffect, useState } from 'react';
import {
    CustomSettingsFields,
    PresetHiddenFields,
    AdvancedSettingsFields,
} from './transcoding-fields';
import type { FormState } from '@/lib/errors';
import { updateTranscodingSettingsAction, applyPreset } from '@/lib/actions/transcoding';
import type { TranscodeSettings, FFmpegInfo } from '@/lib/transcoding/types';
import { InfoCard } from '@/components/layouts';

/** Minimum recommended-max-sessions count for the "High" quality preset. */
const HIGH_PRESET_MIN_SESSIONS = 8;

/** Minimum recommended-max-sessions count for the "Medium" quality preset. */
const MEDIUM_PRESET_MIN_SESSIONS = 4;

interface TranscodingSettingsProps {
    initialSettings: TranscodeSettings;
    ffmpegInfo: FFmpegInfo;
    recommendedMaxSessions: number;
}

/**
 * Derives a human-readable quality preset recommendation label based on the
 * number of recommended concurrent sessions.
 */
function getRecommendedPresetLabel(recommendedMaxSessions: number): string {
    if (recommendedMaxSessions >= HIGH_PRESET_MIN_SESSIONS) {
        return 'High';
    }
    if (recommendedMaxSessions >= MEDIUM_PRESET_MIN_SESSIONS) {
        return 'Medium';
    }
    return 'Low';
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


function SettingsErrorBanners({ state }: { state: FormState }) {
    return (
        <>
            {state.errors.auth && (
                <div className="p-4 mb-4 bg-error">
                    {state.errors.auth.map((errorMessage) => (
                        <p key={errorMessage}>{errorMessage}</p>
                    ))}
                </div>
            )}

            {state.errors.validation && (
                <div className="p-4 mb-4 bg-error">
                    <strong>Validation Errors:</strong>
                    <ul>
                        {state.errors.validation.map((errorMessage) => (
                            <li key={errorMessage}>{errorMessage}</li>
                        ))}
                    </ul>
                </div>
            )}
        </>
    );
}

/** Enable-transcoding checkbox and quality preset selector. */
function BasicSettingsFields({
    settings,
    recommendedLabel,
    onSettingsChange,
    onPresetChange,
}: {
    settings: TranscodeSettings;
    recommendedLabel: string;
    onSettingsChange: (updated: TranscodeSettings) => void;
    onPresetChange: (preset: TranscodeSettings['preset']) => void;
}) {
    return (
        <>
            <p>
                <label>
                    <input
                        type="checkbox"
                        name="enabled"
                        checked={settings.enabled}
                        onChange={(changeEvent) =>
                            onSettingsChange({ ...settings, enabled: changeEvent.target.checked })
                        }
                    />
                    {' '}
                    Enable Transcoding
                </label>
            </p>

            <p>
                <label htmlFor="preset">Quality Preset:</label>
                <select
                    id="preset"
                    name="preset"
                    value={settings.preset}
                    onChange={(changeEvent) =>
                        onPresetChange(changeEvent.target.value as TranscodeSettings['preset'])
                    }
                >
                    <option value="low">Low (720p, 1000kbps)</option>
                    <option value="medium">Medium (1080p, 2000kbps)</option>
                    <option value="high">High (1080p, 4000kbps)</option>
                    <option value="custom">Custom</option>
                </select>
                <small> Recommended: {recommendedLabel}</small>
            </p>
        </>
    );
}

/**
 * Handles a preset selection change.
 * Returns the new showCustom flag and triggers an async preset application for non-custom presets.
 * Extracted to module scope to satisfy consistent-function-scoping.
 */
function applyPresetChange({
    preset,
    currentSettings,
    setShowCustom,
    setSettings,
}: {
    preset: TranscodeSettings['preset'];
    currentSettings: TranscodeSettings;
    setShowCustom: (value: boolean) => void;
    setSettings: (value: TranscodeSettings) => void;
}): void {
    if (preset === 'custom') {
        setShowCustom(true);
        setSettings({ ...currentSettings, preset });
        return;
    }
    setShowCustom(false);
    void applyPreset(currentSettings, preset).then((newSettings) => {
        setSettings(newSettings);
        return newSettings;
    });
}

/** Quality preset row and optional custom/advanced fields. */
function PresetAndAdvancedSection({
    settings,
    ffmpegInfo,
    recommendedMaxSessions,
    showCustom,
    onSettingsChange,
    onPresetChange,
}: {
    settings: TranscodeSettings;
    ffmpegInfo: FFmpegInfo;
    recommendedMaxSessions: number;
    showCustom: boolean;
    onSettingsChange: (updated: TranscodeSettings) => void;
    onPresetChange: (preset: TranscodeSettings['preset']) => void;
}) {
    const recommendedLabel = getRecommendedPresetLabel(recommendedMaxSessions);

    return (
        <>
            <BasicSettingsFields
                settings={settings}
                recommendedLabel={recommendedLabel}
                onSettingsChange={onSettingsChange}
                onPresetChange={onPresetChange}
            />
            {showCustom ? (
                <CustomSettingsFields settings={settings} ffmpegInfo={ffmpegInfo} onSettingsChange={onSettingsChange} />
            ) : (
                <PresetHiddenFields settings={settings} />
            )}
            <AdvancedSettingsFields
                settings={settings}
                recommendedMaxSessions={recommendedMaxSessions}
                onSettingsChange={onSettingsChange}
            />
        </>
    );
}

/** The complete transcoding settings form body. */
function TranscodingSettingsForm({
    state,
    formAction,
    isPending,
    settings,
    ffmpegInfo,
    recommendedMaxSessions,
    showCustom,
    onSettingsChange,
    onPresetChange,
}: {
    state: FormState;
    formAction: (formData: FormData) => void;
    isPending: boolean;
    settings: TranscodeSettings;
    ffmpegInfo: FFmpegInfo;
    recommendedMaxSessions: number;
    showCustom: boolean;
    onSettingsChange: (updated: TranscodeSettings) => void;
    onPresetChange: (preset: TranscodeSettings['preset']) => void;
}) {
    return (
        <form action={formAction} style={{
            padding: 'var(--space-4)',
            backgroundColor: 'var(--color-bg-secondary)',
            border: '1px solid var(--color-border)',
            borderRadius: 'var(--radius-lg)',
        }}>
            <h3 style={{ marginTop: 0 }}>Transcoding Settings</h3>
            <SettingsErrorBanners state={state} />
            <PresetAndAdvancedSection
                settings={settings}
                ffmpegInfo={ffmpegInfo}
                recommendedMaxSessions={recommendedMaxSessions}
                showCustom={showCustom}
                onSettingsChange={onSettingsChange}
                onPresetChange={onPresetChange}
            />
            <input type="hidden" name="hardwareAccel" value={settings.hardwareAccel} />
            <div style={{ marginTop: 'var(--space-6)' }}>
                <button type="submit" disabled={isPending}>
                    {isPending ? 'Saving...' : '💾 Save Settings'}
                </button>
            </div>
        </form>
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

    const handlePresetChange = (preset: TranscodeSettings['preset']) => {
        applyPresetChange({ preset, currentSettings: settings, setShowCustom, setSettings });
    };

    useEffect(() => {
        if (state.success) {
            // Settings saved successfully - page will redirect
        }
    }, [state.success]);

    return (
        <TranscodingSettingsForm
            state={state}
            formAction={formAction}
            isPending={isPending}
            settings={settings}
            ffmpegInfo={ffmpegInfo}
            recommendedMaxSessions={recommendedMaxSessions}
            showCustom={showCustom}
            onSettingsChange={setSettings}
            onPresetChange={handlePresetChange}
        />
    );
}
