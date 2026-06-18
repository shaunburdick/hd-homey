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
     * Inject the base path into the page at request time so client components
     * can read it from window.__HD_HOMEY_BASE_PATH__ without a build-time bake.
     * JSON.stringify safely escapes the value for inline script use.
     */
    const basePathScript = `window.__HD_HOMEY_BASE_PATH__=${JSON.stringify(Config.BASE_PATH)};`;

    return (
        <html lang="en" style={{ height: '100%' }}>
            <head>
                {/* Must run before any client JS so window.__HD_HOMEY_BASE_PATH__ is available */}
                <script dangerouslySetInnerHTML={{ __html: basePathScript }} />
                <meta name="theme-color" content="var(--color-bg-primary)" />
                <link rel="apple-touch-icon" href="/icon.png" />
                <link rel="manifest" href="/manifest.json" />
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
