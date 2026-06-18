import Image from 'next/image';
import hdHomey from '@public/hd-homey.webp';
import { Card } from '@/components';
import { PageContainer, InfoCard } from '@/components/layouts';
import { getFormattedVersion } from '@/lib/version';

/** Size in pixels for the HD Homey logo displayed on the About page */
const LOGO_SIZE_PX = 80;

const TECH_STACK_ITEMS = [
    { label: 'Framework', value: 'Next.js 16 (App Router)' },
    { label: 'UI Library', value: 'React 19' },
    { label: 'Language', value: 'TypeScript 5' },
    { label: 'Database', value: 'SQLite with Drizzle ORM' },
    { label: 'Authentication', value: 'NextAuth.js v5' },
    { label: 'Styling', value: 'new.css with custom design tokens' },
];

/** Renders the logo and version header for the About page */
function AboutHeader({ version }: { version: string }) {
    return (
        <div className="flex items-center gap-4 mb-6">
            <Image
                src={hdHomey}
                alt="HD Homey"
                width={LOGO_SIZE_PX}
                height={LOGO_SIZE_PX}
                className="rounded-lg"
            />
            <div>
                <h1 className="mb-1">HD Homey</h1>
                <p className="text-secondary m-0 text-lg">
                    Version {version}
                </p>
            </div>
        </div>
    );
}

/** Renders the feature list card */
function FeaturesCard() {
    return (
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
    );
}

/** Renders the links and resources card */
function LinksCard() {
    return (
        <Card>
            <h2 className="mt-0 mb-3">
                Links & Resources
            </h2>
            <ul className="grid gap-2 m-0" style={{ listStyle: 'none', paddingLeft: 0 }}>
                <li>
                    <a
                        href="https://shaunburdick.github.io/hd-homey/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 no-underline"
                    >
                        <span>📖</span>
                        <span>Documentation</span>
                    </a>
                </li>
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
    );
}

export default function AboutPage() {
    const version = getFormattedVersion();

    return (
        <PageContainer maxWidth="lg">
            <AboutHeader version={version} />

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

            <FeaturesCard />

            <InfoCard
                title="Technology Stack"
                className="mb-5"
                items={TECH_STACK_ITEMS}
            />

            <LinksCard />
        </PageContainer>
    );
}
