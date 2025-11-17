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

    useEffect(() => {
        const video = videoRef.current;
        if (!video) {
            return;
        }

        // Check if browser supports HLS natively (Safari)
        if (video.canPlayType('application/vnd.apple.mpegurl')) {
            video.src = playlistUrl;
            video.addEventListener('loadedmetadata', () => {
                setLoading(false);
            });
            return;
        }

        // Use HLS.js for other browsers
        if (Hls.isSupported()) {
            const hls = new Hls({
                debug: false,
                enableWorker: true,
                lowLatencyMode: true,
                backBufferLength: 90,
            });

            hlsRef.current = hls;

            hls.loadSource(playlistUrl);
            hls.attachMedia(video);

            hls.on(Hls.Events.MANIFEST_PARSED, () => {
                setLoading(false);
                if (autoplay) {
                    void video.play();
                }
            });

            hls.on(Hls.Events.ERROR, (event, data) => {
                if (data.fatal) {
                    switch (data.type) {
                        case Hls.ErrorTypes.NETWORK_ERROR:
                            setError('Network error loading stream');
                            hls.startLoad();
                            break;
                        case Hls.ErrorTypes.MEDIA_ERROR:
                            setError('Media error');
                            hls.recoverMediaError();
                            break;
                        default:
                            setError('Fatal error occurred');
                            hls.destroy();
                            break;
                    }
                }
            });

            return () => {
                hls.destroy();
            };
        } else {
            setError('HLS is not supported in this browser');
        }
    }, [playlistUrl, autoplay]);

    if (error) {
        return (
            <div style={{ padding: '1rem', backgroundColor: '#fee', border: '1px solid #fcc' }}>
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
                    backgroundColor: '#000',
                }}
                playsInline
                aria-label={`Video player for ${channelName}`}
            />
        </div>
    );
}
