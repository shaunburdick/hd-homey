import Link from 'next/link';

interface SuccessPageProps {
    searchParams: Promise<{ device?: string }>;
}

export default async function PairSuccessPage(props: SuccessPageProps) {
    const searchParams = await props.searchParams;
    const deviceName = searchParams.device || 'Device';

    return (
        <main className="container">
            <h1>✓ Device Authorized</h1>
            <p>
                <strong>{decodeURIComponent(deviceName)}</strong> has been successfully authorized!
            </p>
            <p>
                You can now close this window and return to your device.
            </p>
            <Link href="/">Return to Home</Link>
        </main>
    );
}
