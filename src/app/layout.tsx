import type { Metadata, Viewport } from 'next';
import { Fira_Code } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import { SessionProvider } from '@/components/SessionProvider';
import { getVersion } from '@/lib/version';

const fira = Fira_Code({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'HD Homey',
    description: 'A proxy for HD Homerun devices',
};

export const viewport: Viewport = {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 5,
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const version = getVersion();

    return (
        <html lang="en" style={{ height: '100%' }}>
            <head>
                <meta name="theme-color" content="#1a1a1a" />
                <link rel="apple-touch-icon" href="/icon.png" />
                <link rel="manifest" href="/manifest.json" />
            </head>
            <body className={fira.className}>
                <SessionProvider>
                    <a href="#main-content" className="sr-only">Skip to main content</a>
                    <main id="main-content">
                        {children}
                    </main>
                    <footer>
                        <hr />
                        2024 © Shaun Burdick - <Link href='https://github.com/shaunburdick/hd-homey' style={{ color: 'var(--color-accent)' }}>GitHub</Link> - v{version}
                    </footer>
                </SessionProvider>
            </body>
        </html>
    );
}
