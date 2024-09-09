import type { Metadata } from 'next';
import { Fira_Code } from 'next/font/google';
import './globals.css';
import Link from 'next/link';
import Nav from '@/components/nav';

const fira = Fira_Code({ subsets: ['latin'] });

export const metadata: Metadata = {
    title: 'HD Homey',
    description: 'A proxy for HD Homerun devices',
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" style={{ height: '100%' }}>
            <head>
                <meta name="theme-color" content="#0070F3" />
                <link rel="apple-touch-icon" href="/icon.png" />
                <link rel="manifest" href="/manifest.json" />
            </head>
            <body className={fira.className}>
                <header>
                    <Nav />
                </header>
                <main>{children}</main>
                <footer>
                    <hr />
                    2024 © Shaun Burdick - <Link href='https://github.com/shaunburdick/hd-homey'>GitHub</Link>
                </footer>
            </body>
        </html>
    );
}
