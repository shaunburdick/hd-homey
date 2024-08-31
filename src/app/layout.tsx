import type { Metadata } from 'next';
import { Fira_Code } from 'next/font/google';
import './globals.css';

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
        <html lang="en">
            <body className={fira.className}>{children}</body>
        </html>
    );
}
