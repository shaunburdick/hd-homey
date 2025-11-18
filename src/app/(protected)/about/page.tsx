import Image from 'next/image';
import hdHomey from '@public/hd-homey.webp';
import { Card } from '@/components';

export default function AboutPage() {
    const version = process.env.npm_package_version || '1.0.0-alpha.3';

    return (
        <div className="container" style={{ maxWidth: '800px' }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--space-4)',
                marginBottom: 'var(--space-6)',
            }}>
                <Image
                    src={hdHomey}
                    alt="HD Homey"
                    width={80}
                    height={80}
                    style={{ borderRadius: 'var(--radius-lg)' }}
                />
                <div>
                    <h1 style={{ marginBottom: 'var(--space-1)' }}>HD Homey</h1>
                    <p style={{
                        color: 'var(--color-text-secondary)',
                        marginBottom: 0,
                        fontSize: 'var(--font-size-lg)',
                    }}>
                        Version {version}
                    </p>
                </div>
            </div>

            <Card style={{ marginBottom: 'var(--space-5)' }}>
                <h2 style={{ marginTop: 0, marginBottom: 'var(--space-3)' }}>
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

            <Card style={{ marginBottom: 'var(--space-5)' }}>
                <h2 style={{ marginTop: 0, marginBottom: 'var(--space-3)' }}>
                    Technology Stack
                </h2>
                <dl style={{
                    display: 'grid',
                    gridTemplateColumns: 'auto 1fr',
                    gap: 'var(--space-3)',
                    marginBottom: 0,
                }}>
                    <dt style={{
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-text-secondary)',
                    }}>
                        Framework
                    </dt>
                    <dd style={{ margin: 0 }}>Next.js 15 (App Router)</dd>

                    <dt style={{
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-text-secondary)',
                    }}>
                        Language
                    </dt>
                    <dd style={{ margin: 0 }}>TypeScript 5</dd>

                    <dt style={{
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-text-secondary)',
                    }}>
                        Database
                    </dt>
                    <dd style={{ margin: 0 }}>SQLite with Drizzle ORM</dd>

                    <dt style={{
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-text-secondary)',
                    }}>
                        Authentication
                    </dt>
                    <dd style={{ margin: 0 }}>NextAuth.js v5</dd>

                    <dt style={{
                        fontWeight: 'var(--font-weight-semibold)',
                        color: 'var(--color-text-secondary)',
                    }}>
                        Styling
                    </dt>
                    <dd style={{ margin: 0 }}>new.css with custom design tokens</dd>
                </dl>
            </Card>

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

            <div style={{
                marginTop: 'var(--space-6)',
                textAlign: 'center',
                fontSize: 'var(--font-size-sm)',
                color: 'var(--color-text-tertiary)',
            }}>
                <p>© 2024 Shaun Burdick</p>
                <p>Licensed under MIT License</p>
            </div>
        </div>
    );
}
