import type { Metadata, Viewport } from 'next';
import { Fira_Code } from 'next/font/google';
import './globals.css';
import { Footer } from '@/components/Footer';
import Config from '@/lib/config';

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
    /*
     * Store the base path in a meta tag so client components can read
     * window.__HD_HOMEY_BASE_PATH__ without a build-time bake.
     * Using a meta tag avoids React 19's warning about <script> elements
     * inside React components.
     */
    const basePath = Config.BASE_PATH;

    return (
        <html lang="en" style={{ height: '100%' }}>
            <head>
                <meta name="theme-color" content="var(--color-bg-primary)" />
                <link rel="apple-touch-icon" href="/icon.png" />
                <link rel="manifest" href="/manifest.json" />
                <meta name="hd-homey-base-path" content={basePath} />
            </head>
            <body className={fira.className}>
                <a href="#main-content" className="sr-only">Skip to main content</a>
                <main id="main-content">
                    {children}
                </main>
                <Footer />
            </body>
        </html>
    );
}
