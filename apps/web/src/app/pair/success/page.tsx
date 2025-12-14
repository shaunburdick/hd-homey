import Link from 'next/link';
import Image from 'next/image';
import { Card } from '@/components';
import { PageContainer } from '@/components/layouts';

interface SuccessPageProps {
    searchParams: Promise<{ device?: string }>;
}

export default async function PairSuccessPage(props: SuccessPageProps) {
    const searchParams = await props.searchParams;
    const deviceName = searchParams.device || 'Device';

    return (
        <main className="flex items-center justify-center p-6" style={{ minHeight: '100vh' }}>
            <PageContainer maxWidth="sm">
                <div className="text-center" style={{ marginBottom: 'var(--space-8)' }}>
                    <Image
                        src="/icon.png"
                        alt="HD Homey"
                        width={64}
                        height={64}
                        className="rounded-lg"
                    />
                    <h1 className="mb-2" style={{ marginTop: 'var(--space-4)' }}>
                        ✓ Device Authorized
                    </h1>
                    <p className="text-secondary text-base">
                        Your device is ready to use
                    </p>
                </div>

                <Card>
                    <div className="space-y-4">
                        <div className="text-center p-4 rounded" style={{
                            backgroundColor: 'var(--color-success-bg)',
                            border: '1px solid var(--color-success)',
                        }}>
                            <p className="font-semibold" style={{ color: 'var(--color-success)' }}>
                                <strong>{decodeURIComponent(deviceName)}</strong> has been successfully authorized!
                            </p>
                        </div>

                        <div className="text-center space-y-2">
                            <p className="text-secondary">
                                You can now close this window and return to your device.
                            </p>
                            <p className="text-sm text-tertiary">
                                Your device will automatically connect and you can start streaming channels.
                            </p>
                        </div>

                        <div className="pt-4">
                            <Link
                                href="/"
                                className="block text-center px-4 py-2 rounded"
                                style={{
                                    backgroundColor: 'var(--color-primary)',
                                    color: 'white',
                                    textDecoration: 'none',
                                }}
                            >
                                Return to Home
                            </Link>
                        </div>
                    </div>
                </Card>
            </PageContainer>
        </main>
    );
}
