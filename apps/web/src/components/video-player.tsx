'use client';

/**
 * HLS Video Player Component
 * Uses HLS.js for browsers that don't support HLS natively
 */

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Hls from 'hls.js';
import styles from './video-player.module.css';

interface VideoPlayerProps {
    playlistUrl: string;
    channelName: string;
    autoplay?: boolean;
}

export default function VideoPlayer({ playlistUrl, channelName, autoplay = true }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [showLoading, setShowLoading] = useState(true);
    const loadingStartTimeRef = useRef<number>(0);

    // Check HLS support early (before effect)
    const hlsSupported = typeof window !== 'undefined' && (
        Hls.isSupported() ||
        document.createElement('video').canPlayType('application/vnd.apple.mpegurl') !== ''
    );

    useEffect(() => {
        // Initialize loading start time when component mounts
        loadingStartTimeRef.current = Date.now();
        const video = videoRef.current;
        if (!video) {
            return;
        }

        /**
         * Handle the completion of loading with a minimum display time
         * to avoid flashing on fast loads
         */
        const handleLoadingComplete = () => {
            const loadingDuration = Date.now() - loadingStartTimeRef.current;
            const minimumDisplayTime = 300; // ms

            if (loadingDuration < minimumDisplayTime) {
                // Wait for the remaining time to meet minimum display time
                setTimeout(() => {
                    setShowLoading(false);
                }, minimumDisplayTime - loadingDuration);
            } else {
                setShowLoading(false);
            }

            if (autoplay) {
                video.play().catch(() => {
                    // Autoplay might fail due to browser policies
                });
            }
        };

        // Check if browser supports HLS natively (Safari)
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = playlistUrl;
            video.addEventListener('loadedmetadata', handleLoadingComplete);
            return () => {
                video.removeEventListener('loadedmetadata', handleLoadingComplete);
                video.src = '';
            };
        }

        // Use HLS.js for other browsers
        if (Hls.isSupported()) {
            const hls = new Hls({
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
                // Use modern loader policy instead of deprecated timeout/retry options
                manifestLoadPolicy: {
                    default: {
                        maxTimeToFirstByteMs: 10000,
                        maxLoadTimeMs: 10000,
                        timeoutRetry: {
                            maxNumRetry: 3,
                            retryDelayMs: 500,
                            maxRetryDelayMs: 0,
                        },
                        errorRetry: {
                            maxNumRetry: 3,
                            retryDelayMs: 500,
                            maxRetryDelayMs: 8000,
                        },
                    },
                },
                fragLoadPolicy: {
                    default: {
                        maxTimeToFirstByteMs: 20000,
                        maxLoadTimeMs: 20000,
                        timeoutRetry: {
                            maxNumRetry: 6,
                            retryDelayMs: 500,
                            maxRetryDelayMs: 0,
                        },
                        errorRetry: {
                            maxNumRetry: 6,
                            retryDelayMs: 500,
                            maxRetryDelayMs: 8000,
                        },
                    },
                },
            });

            hlsRef.current = hls;

            hls.loadSource(playlistUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, handleLoadingComplete);

            hls.on(Hls.Events.ERROR, (_event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            setError(null);
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            setError(null);
                            hls.recoverMediaError();
                            break;
                        default:
                            setError(`Playback error: ${data.details || 'Unknown error'}`);
                            setShowLoading(false);
                            hls.destroy();
                            break;
                    }
                }
            });

            return () => {
                hls.destroy();
            };
        }
    }, [playlistUrl, autoplay]);

    if (!hlsSupported) {
        return (
            <div className="p-4 bg-error">
                <h3>Playback Error</h3>
                <p>HLS is not supported in this browser</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-4 bg-error">
                <h3>Playback Error</h3>
                <p>{error}</p>
                <p>
                    You can try opening the stream directly:
                    {' '}
                    <a href={playlistUrl}>Open Stream</a>
                </p>
            </div>
        );
    }

    return (
        <div className={styles.videoContainer}>
            {showLoading && (
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
            )}
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
