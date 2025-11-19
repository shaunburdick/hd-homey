import Image from 'next/image';
import hdHomey from '@public/hd-homey.webp';
import { Card } from '@/components';
import { PageContainer, InfoCard } from '@/components/layouts';

export default function AboutPage() {
    const version = process.env.npm_package_version || '1.0.0-alpha.3';

    return (
        <PageContainer maxWidth="lg">
            <div className="flex items-center gap-4 mb-6">
                <Image
                    src={hdHomey}
                    alt="HD Homey"
                    width={80}
                    height={80}
                    className="rounded-lg"
                />
                <div>
                    <h1 className="mb-1">HD Homey</h1>
                    <p className="text-secondary m-0 text-lg">
                        Version {version}
                    </p>
                </div>
            </div>

            <Card className="mb-5">
                <h2 className="mt-0 mb-3">
                    About HD Homey
                </h2>
                <p style={{ marginBottom: 'var(--space-3)' }}>
                    HD Homey is a Next.js-based proxy application for HDHomeRun devices that enables
                    secure remote access to live TV streams over the internet.
                </p>
                <p style={{ marginBottom: 0 }}>
                    Built with modern web technologies, HD Homey provides a user-friendly interface
                    for managing tuners, discovering channels, and streaming live TV to any device.
                </p>
            </Card>

            <Card style={{ marginBottom: 'var(--space-5)' }}>
                <h2 style={{ marginTop: 0, marginBottom: 'var(--space-3)' }}>
                    Features
                </h2>
                <ul style={{
                    display: 'grid',
                    gap: 'var(--space-2)',
                    paddingLeft: 'var(--space-5)',
                    marginBottom: 0,
                }}>
                    <li>📡 HDHomeRun tuner management</li>
                    <li>📺 Automatic channel lineup discovery</li>
                    <li>🔐 User authentication with role-based access</li>
                    <li>🎬 Optional video transcoding for browser playback</li>
                    <li>🌐 Secure stream proxying with token authentication</li>
                    <li>♿ WCAG 2.2 Level AA accessible interface</li>
                </ul>
            </Card>

            <InfoCard
                title="Technology Stack"
                className="mb-5"
                items={[
                    { label: 'Framework', value: 'Next.js 15 (App Router)' },
                    { label: 'Language', value: 'TypeScript 5' },
                    { label: 'Database', value: 'SQLite with Drizzle ORM' },
                    { label: 'Authentication', value: 'NextAuth.js v5' },
                    { label: 'Styling', value: 'new.css with custom design tokens' },
                ]}
            />

            <Card>
                <h2 style={{ marginTop: 0, marginBottom: 'var(--space-3)' }}>
                    Links & Resources
                </h2>
                <ul style={{
                    display: 'grid',
                    gap: 'var(--space-2)',
                    listStyle: 'none',
                    paddingLeft: 0,
                    marginBottom: 0,
                }}>
                    <li>
                        <a
                            href="https://github.com/shaunburdick/hd-homey"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-2)',
                                textDecoration: 'none',
                            }}
                        >
                            <span>🔗</span>
                            <span>GitHub Repository</span>
                        </a>
                    </li>
                    <li>
                        <a
                            href="https://www.silicondust.com/hdhomerun/"
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 'var(--space-2)',
                                textDecoration: 'none',
                            }}
                        >
                            <span>🔗</span>
                            <span>HDHomeRun by SiliconDust</span>
                        </a>
                    </li>
                </ul>
            </Card>

            <div className="mt-6 text-center text-sm text-tertiary">
                <p>© 2024 Shaun Burdick</p>
                <p>Licensed under MIT License</p>
            </div>
        </PageContainer>
    );
}
