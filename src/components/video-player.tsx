'use client';

/**
 * HLS Video Player Component
 * Uses HLS.js for browsers that don't support HLS natively
 */

import { useEffect, useRef, useState } from 'react';
import Hls from 'hls.js';

interface VideoPlayerProps {
    playlistUrl: string;
    channelName: string;
    autoplay?: boolean;
}

export default function VideoPlayer({ playlistUrl, channelName, autoplay = true }: VideoPlayerProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    // Check HLS support early (before effect)
    const hlsSupported = typeof window !== 'undefined' && (
        Hls.isSupported() ||
        document.createElement('video').canPlayType('application/vnd.apple.mpegurl') !== ''
    );

    useEffect(() => {
        const video = videoRef.current;
        if (!video) {
            return;
        }

        // Check if browser supports HLS natively (Safari)
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = playlistUrl;
            const handleLoaded = () => {
                setLoading(false);
                if (autoplay) {
                    video.play().catch(() => {
                        // Autoplay might fail due to browser policies
                    });
                }
            };
            video.addEventListener('loadedmetadata', handleLoaded);
            return () => {
                video.removeEventListener('loadedmetadata', handleLoaded);
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

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setLoading(false);
                if (autoplay) {
                    video.play().catch(() => {
                        // Autoplay might fail due to browser policies
                    });
                }
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
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
        <div>
            {loading && (
                <p>Loading stream...</p>
            )}
            <video
                ref={videoRef}
                controls
                style={{
                    width: '100%',
                    maxWidth: '1280px',
                    backgroundColor: 'black',
                }}
                playsInline
                aria-label={`Video player for ${channelName}`}
            >
                <track kind="captions" />
            </video>
        </div>
    );
}
