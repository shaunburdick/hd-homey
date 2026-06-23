'use client';

/**
 * TuningControl — Per-slot channel selection and tuning controls.
 *
 * Renders a channel dropdown, a "Tune" button, and a "Clear" button for a
 * single tuner slot. Controls are hidden for non-admin users. Fetches the
 * channel lineup from `/api/tuners/[tunerId]/channels` on mount.
 *
 * On a 409 viewer-conflict response the component shows an inline confirmation
 * prompt. If the user confirms, the tune request is resent with `?force=true`.
 *
 * @module components/signal/TuningControl
 */

import { useCallback, useEffect, useState } from 'react';
import { useSession } from '@/lib/auth/auth-client';
import { AuthRoles } from '@/lib/auth-roles';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** HTTP status code for viewer conflict */
const HTTP_CONFLICT = 409;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Channel {
    guideNumber: string;
    guideName: string;
    videoCodec: string;
}

interface ChannelsApiResponse {
    data: Channel[];
}

interface ConflictState {
    viewers: number;
    pendingGuideNumber: string;
}

export interface TuningControlProps {
    /** DB tuner ID from the URL — used for API calls */
    tunerId: number;
    /** Physical slot name, e.g. "tuner2" */
    resource: string;
    /** Currently tuned channel name (from live signal state) */
    vctName?: string;
    /** Currently tuned channel number (from live signal state) */
    vctNumber?: string;
    /** Whether this slot is idle (no channel tuned) */
    idle: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Check if a channel's video codec indicates ATSC 3.0 (HEVC/H.265).
 *
 * @param videoCodec - The video codec string from the channel lineup API
 * @returns `true` when the codec is HEVC or H.265, `false` otherwise
 */
function isAtsc3(videoCodec: string): boolean {
    const codec = videoCodec.toLowerCase();
    return codec.includes('hevc') || codec.includes('h265');
}

/**
 * POST a JSON body to the given URL.
 * Returns the Response, or null if a network error occurred.
 *
 * @param url - API endpoint URL
 * @param body - JSON-serialisable request body
 */
async function postSignalCommand(url: string, body: Record<string, string>): Promise<Response | null> {
    try {
        return await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    } catch {
        return null;
    }
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

interface CurrentChannelBadgeProps {
    vctNumber?: string;
    vctName?: string;
}

/**
 * Badge showing the currently locked channel.
 *
 * @param props - vctNumber and vctName from live signal state
 */
function CurrentChannelBadge({ vctNumber, vctName }: CurrentChannelBadgeProps) {
    const label = [vctNumber, vctName].filter(Boolean).join(' ');
    if (label === '') {
        return null;
    }
    return <span className="tuning-controls-current-badge">{label}</span>;
}

interface ChannelSelectProps {
    channels: Channel[];
    loading: boolean;
    selectedGuideNumber: string;
    busy: boolean;
    onChange: (guideNumber: string) => void;
}

/**
 * Channel dropdown — shows loading/empty states and the channel list.
 *
 * @param props - Channel select props
 */
function ChannelSelect({ channels, loading, selectedGuideNumber, busy, onChange }: ChannelSelectProps) {
    const hasChannels = channels.length > 0;

    return (
        <select
            className="tuning-controls-select"
            value={selectedGuideNumber}
            onChange={(e) => {
                onChange(e.target.value);
            }}
            disabled={loading || !hasChannels || busy}
            aria-label="Select channel to tune"
        >
            {loading && <option value="">Loading channels…</option>}
            {!loading && !hasChannels && <option value="">No channels available</option>}
            {!loading && hasChannels && channels.map((ch) => (
                <option key={ch.guideNumber} value={ch.guideNumber}>
                    {ch.guideNumber} — {ch.guideName}{isAtsc3(ch.videoCodec) ? ' (3.0)' : ''}
                </option>
            ))}
        </select>
    );
}

interface ConflictPromptProps {
    viewers: number;
    onConfirm: () => void;
    onCancel: () => void;
}

/**
 * Inline confirmation prompt shown when a tune request returns a 409 conflict.
 *
 * @param props - Viewer count and confirm/cancel callbacks
 */
function ConflictPrompt({ viewers, onConfirm, onCancel }: ConflictPromptProps) {
    return (
        <div className="tuning-controls-conflict" role="alert">
            <span>
                {`This will interrupt ${viewers} viewer${viewers === 1 ? '' : 's'}. Continue?`}
            </span>
            <div className="tuning-controls-conflict-actions">
                <button type="button" onClick={onConfirm}>Yes, interrupt</button>
                <button type="button" onClick={onCancel}>Cancel</button>
            </div>
        </div>
    );
}

interface Atsc3WarningProps {
    channels: Channel[];
    selectedGuideNumber: string;
}

/**
 * Inline note shown when the selected channel uses an ATSC 3.0 codec.
 * Returns null when the selection is empty or the codec is not HEVC/H.265.
 *
 * @param props - Channel list and currently selected guide number
 */
function Atsc3Warning({ channels, selectedGuideNumber }: Atsc3WarningProps) {
    if (selectedGuideNumber === '') {
        return null;
    }
    const selectedCh = channels.find((ch) => ch.guideNumber === selectedGuideNumber);
    if (selectedCh === undefined || !isAtsc3(selectedCh.videoCodec)) {
        return null;
    }
    return (
        <p className="tuning-controls-warning" role="note">
            ATSC 3.0 channel — may not be available on all tuner slots
        </p>
    );
}

// ---------------------------------------------------------------------------
// Hooks
// ---------------------------------------------------------------------------

/**
 * Fetch the channel lineup for the given tunerId.
 *
 * Loading state is initialised to `true` so the first render shows the loading
 * placeholder without any synchronous setState call inside an effect body.
 *
 * @param tunerId - DB tuner ID used to fetch the lineup
 */
function useChannelLineup(tunerId: number): { channels: Channel[]; loading: boolean } {
    const [channels, setChannels] = useState<Channel[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();

        void fetch(`/api/tuners/${tunerId}/channels`, { signal: controller.signal })
            .then((res) => {
                if (!res.ok) {
                    return null;
                }
                return res.json() as Promise<ChannelsApiResponse>;
            })
            .then((json) => {
                if (json !== null) {
                    // Sort numerically by major.minor (e.g. 2.1 before 10.1)
                    const sorted = [...json.data].sort((chA, chB) => {
                        const [aMaj = 0, aMin = 0] = chA.guideNumber.split('.').map(Number);
                        const [bMaj = 0, bMin = 0] = chB.guideNumber.split('.').map(Number);
                        return aMaj !== bMaj ? aMaj - bMaj : aMin - bMin;
                    });
                    setChannels(sorted);
                }
                setLoading(false);
                return json;
            })
            .catch(() => {
                // AbortError expected on unmount / Strict Mode cleanup
                setLoading(false);
            });

        return () => {
            controller.abort();
        };
    }, [tunerId]);

    return { channels, loading };
}

interface TuningHandlers {
    handleTune: () => void;
    handleClear: () => void;
    handleConflictConfirm: () => void;
    handleConflictCancel: () => void;
    conflict: ConflictState | null;
    busy: boolean;
}

interface TuningHandlerOptions {
    tunerId: number;
    resource: string;
    selectedGuideNumber: string;
}

/**
 * Wire up tune, clear, and conflict-resolution handlers.
 *
 * @param options - tunerId, resource, and the currently selected guide number
 */
function useTuningHandlers(options: TuningHandlerOptions): TuningHandlers {
    const { tunerId, resource, selectedGuideNumber } = options;
    const [busy, setBusy] = useState(false);
    const [conflict, setConflict] = useState<ConflictState | null>(null);

    const clearBusy = useCallback(() => {
        setBusy(false);
    }, []);

    const sendTune = useCallback(async (guideNumber: string, force: boolean) => {
        const url = force ? `/api/signal/${tunerId}/tune?force=true` : `/api/signal/${tunerId}/tune`;
        const res = await postSignalCommand(url, { guideNumber, resource });
        if (res !== null && res.status === HTTP_CONFLICT) {
            const json = await res.json() as { viewers?: number };
            setConflict({ viewers: json.viewers ?? 0, pendingGuideNumber: guideNumber });
        }
    }, [tunerId, resource]);

    const handleTune = useCallback(() => {
        if (selectedGuideNumber === '' || busy) {
            return;
        }
        setBusy(true);
        void sendTune(selectedGuideNumber, false).finally(clearBusy);
    }, [selectedGuideNumber, busy, sendTune, clearBusy]);

    const handleClear = useCallback(() => {
        if (busy) {
            return;
        }
        setBusy(true);
        void postSignalCommand(`/api/signal/${tunerId}/clear`, { resource }).finally(clearBusy);
    }, [busy, tunerId, resource, clearBusy]);

    const handleConflictConfirm = useCallback(() => {
        if (conflict === null) {
            return;
        }
        const { pendingGuideNumber } = conflict;
        setConflict(null);
        setBusy(true);
        void sendTune(pendingGuideNumber, true).finally(clearBusy);
    }, [conflict, sendTune, clearBusy]);

    const handleConflictCancel = useCallback(() => {
        setConflict(null);
    }, []);

    return { handleTune, handleClear, handleConflictConfirm, handleConflictCancel, conflict, busy };
}

// ---------------------------------------------------------------------------
// Component — inner controls (admin-only)
// ---------------------------------------------------------------------------

interface TuningControlsInnerProps {
    tunerId: number;
    resource: string;
    vctName?: string;
    vctNumber?: string;
    idle: boolean;
}

/**
 * Inner controls rendered only for admin users.
 * Separated from TuningControl to keep each function under the line limit.
 *
 * @param props - Tuning control props (admin role already verified by parent)
 */
function TuningControlsInner({ tunerId, resource, vctName, vctNumber, idle }: TuningControlsInnerProps) {
    const { channels, loading } = useChannelLineup(tunerId);
    const [userSelection, setUserSelection] = useState<string | null>(null);
    // Derive effective selection: user intent takes priority; fall back to first channel
    const selectedGuideNumber = userSelection ?? channels[0]?.guideNumber ?? '';
    const { handleTune, handleClear, handleConflictConfirm, handleConflictCancel, conflict, busy } =
        useTuningHandlers({ tunerId, resource, selectedGuideNumber });

    return (
        <div className="tuning-controls">
            {!idle && <CurrentChannelBadge vctNumber={vctNumber} vctName={vctName} />}
            {conflict !== null && (
                <ConflictPrompt
                    viewers={conflict.viewers}
                    onConfirm={handleConflictConfirm}
                    onCancel={handleConflictCancel}
                />
            )}
            <div className="tuning-controls-row" style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <ChannelSelect
                    channels={channels}
                    loading={loading}
                    selectedGuideNumber={selectedGuideNumber}
                    busy={busy}
                    onChange={setUserSelection}
                />
                <Atsc3Warning channels={channels} selectedGuideNumber={selectedGuideNumber} />
                <div className="tuning-controls-actions" style={{ display: 'flex', gap: '0.5rem' }}>
                    <button
                        type="button"
                        className="tuning-controls-tune-button"
                        onClick={handleTune}
                        disabled={loading || channels.length === 0 || selectedGuideNumber === '' || busy}
                        aria-label={`Tune ${resource} to selected channel`}
                    >
                        Tune
                    </button>
                    <button
                        type="button"
                        className="tuning-controls-clear-button"
                        onClick={handleClear}
                        disabled={busy}
                        aria-label={`Clear ${resource}`}
                    >
                        Clear
                    </button>
                </div>
            </div>
        </div>
    );
}

// ---------------------------------------------------------------------------
// Component — public surface
// ---------------------------------------------------------------------------

/**
 * Renders tuning controls (channel dropdown, Tune button, Clear button) for a
 * single physical tuner slot. Returns null for non-admin users.
 *
 * @param props - Tuning control props
 */
export function TuningControl({ tunerId, resource, vctName, vctNumber, idle }: TuningControlProps) {
    const { data: session } = useSession();

    if (session?.user?.role !== AuthRoles.Admin) {
        return null;
    }

    return (
        <TuningControlsInner
            tunerId={tunerId}
            resource={resource}
            vctName={vctName}
            vctNumber={vctNumber}
            idle={idle}
        />
    );
}
