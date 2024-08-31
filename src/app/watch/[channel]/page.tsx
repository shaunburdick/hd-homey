export default function Page({ params }: { params: { channel: string } }) {

    return (
        <main>
            <h1>Channel {params.channel}</h1>
            <p>
                Copy this <a href={`/stream/${params.channel}`}>Link</a> into your favorite media player
            </p>
        </main>
    );
}
