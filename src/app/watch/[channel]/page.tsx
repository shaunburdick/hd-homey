'use client';

export default function Page({ params }: { params: { channel: string } }) {

    return (
        <main>
            <h1>Channel {params.channel}</h1>
            <p>
                Copy this <a href={`/stream/${params.channel}`}>Link</a> into your favorite media player.
            </p>
            <p>
                For example, in <a href="https://www.videolan.org/vlc/">VLC</a>:
                <ol>
                    <li>Navigate to <em>{'File > Open Network...'}</em></li>
                    <li>Paste in this link: <strong>{`${location.origin}/stream/${params.channel}`}</strong></li>
                </ol>
            </p>
        </main>
    );
}
