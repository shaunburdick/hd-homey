import Image from 'next/image';
import hdHomey from '@public/hd-homey.webp';
import { Card } from '@/components';
import { PageContainer, InfoCard } from '@/components/layouts';
import { getVersion } from '@/lib/version';

export default function AboutPage() {
    const version = getVersion();

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
                <p className="mb-3">
                    HD Homey is a Next.js-based proxy application for HDHomeRun devices that enables
                    secure remote access to live TV streams over the internet.
                </p>
                <p className="m-0">
                    Built with modern web technologies, HD Homey provides a user-friendly interface
                    for managing tuners, discovering channels, and streaming live TV to any device.
                </p>
            </Card>

            <Card className="mb-5">
                <h2 className="mt-0 mb-3">
                    Features
                </h2>
                <ul className="grid gap-2 m-0" style={{ paddingLeft: 'var(--space-5)' }}>
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
                    { label: 'Framework', value: 'Next.js 16 (App Router)' },
                    { label: 'UI Library', value: 'React 19' },
                    { label: 'Language', value: 'TypeScript 5' },
                    { label: 'Database', value: 'SQLite with Drizzle ORM' },
                    { label: 'Authentication', value: 'NextAuth.js v5' },
                    { label: 'Styling', value: 'new.css with custom design tokens' },
                ]}
            />

            <Card>
                <h2 className="mt-0 mb-3">
                    Links & Resources
                </h2>
                <ul className="grid gap-2 m-0" style={{ listStyle: 'none', paddingLeft: 0 }}>
                    <li>
                        <a
                            href="https://github.com/shaunburdick/hd-homey"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-2 no-underline"
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
                            className="flex items-center gap-2 no-underline"
                        >
                            <span>🔗</span>
                            <span>HDHomeRun by SiliconDust</span>
                        </a>
                    </li>
                </ul>
            </Card>
        </PageContainer>
    );
}
