'use client';

/**
 * HLS Video Player Component
 * Uses HLS.js for browsers that don't support HLS natively
 */

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Hls, { type HlsConfig, type ErrorData } from 'hls.js';
import styles from './video-player.module.css';
import Logger from '@/lib/logger';

/** Minimum duration (ms) to show the loading overlay to avoid a flash on fast loads. */
const MIN_LOADING_DISPLAY_MS = 300;

interface VideoPlayerProps {
    playlistUrl: string;
    channelName: string;
    autoplay?: boolean;
}

/**
 * HLS.js configuration for live-stream playback.
 * Tuned for reliability over low-latency.
 */
const HLS_CONFIG: Partial<HlsConfig> = {
    debug: false,
    enableWorker: true,
    lowLatencyMode: false,
    backBufferLength: 10,
    maxBufferLength: 30,
    maxMaxBufferLength: 60,
    maxBufferSize: 60 * 1000 * 1000,
    maxBufferHole: 0.5,
    liveSyncDurationCount: 2,
    liveMaxLatencyDurationCount: Infinity,
    liveDurationInfinity: true,
    manifestLoadPolicy: {
        default: {
            maxTimeToFirstByteMs: 10000,
            maxLoadTimeMs: 10000,
            timeoutRetry: { maxNumRetry: 3, retryDelayMs: 500, maxRetryDelayMs: 0 },
            errorRetry:   { maxNumRetry: 3, retryDelayMs: 500, maxRetryDelayMs: 8000 },
        },
    },
    fragLoadPolicy: {
        default: {
            maxTimeToFirstByteMs: 20000,
            maxLoadTimeMs: 20000,
            timeoutRetry: { maxNumRetry: 6, retryDelayMs: 500, maxRetryDelayMs: 0 },
            errorRetry:   { maxNumRetry: 6, retryDelayMs: 500, maxRetryDelayMs: 8000 },
        },
    },
};

/** Fallback shown when the current browser does not support HLS at all. */
function HlsUnsupportedError() {
    return (
        <div className="p-4 bg-error">
            <h3>Playback Error</h3>
            <p>HLS is not supported in this browser</p>
        </div>
    );
}

/** Fallback shown when a fatal HLS playback error occurs. */
function PlaybackError({ playlistUrl }: { playlistUrl: string }) {
    return (
        <div className="p-4 bg-error">
            <h3>Playback Error</h3>
            <p>
                You can try opening the stream directly:{' '}
                <a href={playlistUrl}>Open Stream</a>
            </p>
        </div>
    );
}

/** Overlay displayed while the stream is buffering / connecting. */
function LoadingOverlay() {
    return (
        <div
            className={styles.loadingOverlay}
            role="status"
            aria-live="polite"
            aria-label="Loading video stream"
        >
            <Image
                src="/hd-homey.webp"
                alt=""
                width={120}
                height={120}
                className={styles.loadingLogo}
                aria-hidden="true"
                priority
            />
            <p className={styles.loadingMessage}>Loading stream...</p>
        </div>
    );
}

/**
 * Schedules hiding of the loading overlay, enforcing a minimum display time.
 * Returns the timer ID (if deferred) so callers can clean it up.
 */
function scheduleHideLoading(
    startTime: number,
    onHide: () => void
): ReturnType<typeof setTimeout> | undefined {
    const elapsed = Date.now() - startTime;
    const remaining = MIN_LOADING_DISPLAY_MS - elapsed;

    if (remaining > 0) {
        return setTimeout(onHide, remaining);
    }
    onHide();
    return undefined;
}

/**
 * Wires up the native HLS path (Safari) for the given video element.
 * Returns a cleanup function.
 */
function setupNativeHls({
    video,
    playlistUrl,
    loadingStartTime,
    setShowLoading,
    autoplay,
}: {
    video: HTMLVideoElement;
    playlistUrl: string;
    loadingStartTime: number;
    setShowLoading: (value: boolean) => void;
    autoplay: boolean;
}): () => void {
    let loadingTimer: ReturnType<typeof setTimeout> | undefined;

    const onLoaded = () => {
        loadingTimer = scheduleHideLoading(loadingStartTime, () => setShowLoading(false));
        if (autoplay) {
            video.play().catch(() => {
                // Autoplay might fail due to browser policies — handled silently
            });
        }
    };

    video.src = playlistUrl;
    video.addEventListener('loadedmetadata', onLoaded);

    return () => {
        video.removeEventListener('loadedmetadata', onLoaded);
        if (loadingTimer) {
            clearTimeout(loadingTimer);
        }
        video.src = '';
    };
}

/**
 * Handle an hls.js error event: log it, then recover or destroy.
 * - NETWORK_ERROR: restart loading
 * - MEDIA_ERROR: attempt recovery
 * - Other fatal errors: show error UI and destroy
 * - Non-fatal errors: already logged, no further action
 */
function handleHlsError({
    hls,
    data,
    setShowLoading,
    setError,
}: {
    hls: Hls;
    data: ErrorData;
    setShowLoading: (value: boolean) => void;
    setError: (message: string | null) => void;
}): void {
    // Log ALL errors (fatal and non-fatal) so we can diagnose playback issues.
    // With debug: false in config, hls.js itself won't log anything.
    const logData = {
        type: data.type,
        details: data.details,
        reason: data.reason ?? '',
    };
    if (data.fatal) {
        Logger.error(logData, 'hls.js fatal error');
    } else {
        Logger.warn(logData, 'hls.js non-fatal error');
    }

    if (!data.fatal) {
        return;
    }
    if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
        setError(null);
        hls.startLoad();
    } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        setError(null);
        hls.recoverMediaError();
    } else {
        setError(`Playback error: ${data.details ?? 'Unknown error'}`);
        setShowLoading(false);
        hls.destroy();
    }
}

/**
 * Wires up HLS.js for non-Safari browsers.
 * Returns a cleanup function.
 */
function setupHlsJs({
    video,
    playlistUrl,
    loadingStartTime,
    setShowLoading,
    setError,
    autoplay,
}: {
    video: HTMLVideoElement;
    playlistUrl: string;
    loadingStartTime: number;
    setShowLoading: (value: boolean) => void;
    setError: (message: string | null) => void;
    autoplay: boolean;
}): () => void {
    let loadingTimer: ReturnType<typeof setTimeout> | undefined;

    const hls = new Hls(HLS_CONFIG);
    hls.loadSource(playlistUrl);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
        loadingTimer = scheduleHideLoading(loadingStartTime, () => setShowLoading(false));
        if (autoplay) {
            video.play().catch(() => {
                // Autoplay might fail due to browser policies — handled silently
            });
        }
    });

    hls.on(Hls.Events.ERROR, (_event, data) => {
        handleHlsError({ hls, data, setShowLoading, setError });
    });

    return () => {
        if (loadingTimer) {
            clearTimeout(loadingTimer);
        }
        hls.destroy();
    };
}

/**
 * Detects whether HLS playback is supported in the current environment.
 * Must be called lazily (inside useState initializer) to avoid running on server.
 */
function detectHlsSupport(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }
    return (
        Hls.isSupported() ||
        document.createElement('video').canPlayType('application/vnd.apple.mpegurl') !== ''
    );
}

/**
 * Custom hook that wires up HLS.js (or native HLS) to the given video element.
 * Handles loading state, error state, and cleanup on unmount or URL change.
 */
function useHlsPlayer({
    videoRef,
    playlistUrl,
    autoplay,
    setShowLoading,
    setError,
}: {
    videoRef: React.RefObject<HTMLVideoElement | null>;
    playlistUrl: string;
    autoplay: boolean;
    setShowLoading: (value: boolean) => void;
    setError: (value: string | null) => void;
}): void {
    const loadingStartTimeRef = useRef<number>(0);

    useEffect(() => {
        loadingStartTimeRef.current = Date.now();
        const video = videoRef.current;
        if (!video) {
            return;
        }

        if (video.canPlayType('application/vnd.apple.mpegurl')) {
            return setupNativeHls({
                video,
                playlistUrl,
                loadingStartTime: loadingStartTimeRef.current,
                setShowLoading,
                autoplay,
            });
        }

        if (!Hls.isSupported()) {
            return;
        }

        return setupHlsJs({
            video,
            playlistUrl,
            loadingStartTime: loadingStartTimeRef.current,
            setShowLoading,
            setError,
            autoplay,
        });
    }, [videoRef, playlistUrl, autoplay, setShowLoading, setError]);
}

export default function VideoPlayer({ playlistUrl, channelName, autoplay = true }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [error, setError] = useState<string | null>(null);
    const [showLoading, setShowLoading] = useState(true);
    const [hlsSupported] = useState<boolean>(detectHlsSupport);

    useHlsPlayer({ videoRef, playlistUrl, autoplay, setShowLoading, setError });

    if (!hlsSupported) {
        return <HlsUnsupportedError />;
    }
    if (error) {
        return <PlaybackError playlistUrl={playlistUrl} />;
    }

    return (
        <div className={styles.videoContainer}>
            {showLoading && <LoadingOverlay />}
            <video
                ref={videoRef}
                controls
                playsInline
                aria-label={`Video player for ${channelName}`}
            >
                <track kind="captions" />
            </video>
        </div>
    );
}
