'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import './nav.css';
import { authClient } from '@/lib/auth/auth-client';

export default function Nav() {

    const pathname = usePathname();
    const [isOpen, setIsOpen] = useState(false);
    const [lastPathname, setLastPathname] = useState(pathname);
    const { data: session } = authClient.useSession();

    // Close menu on route change
    if (pathname !== lastPathname) {
        setIsOpen(false);
        setLastPathname(pathname);
    }

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleSignOut = async (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        setIsOpen(false);
        await authClient.signOut();
        window.location.href = '/users/signin';
    };

    const isAdmin = session?.user?.role === 'admin';

    const menuItems = [
        { name: 'Home', href: '/' },
        { name: 'Tuners', href: '/tuners' },
        ...(isAdmin ? [{ name: 'Settings', href: '/settings' }] : []),
        { name: 'Profile', href: '/profile' },
        { name: 'About', href: '/about' }
    ];

    const isActive = (href: string) => {
        if (href === '/') {
            return pathname === '/';
        }
        return pathname.startsWith(href);
    };

    return (
        <>
            <nav aria-label="Main navigation">
                <ul>
                    <li className='desktop-menu-item logo'>
                        <Link href="/" aria-label="HD Homey Home">
                            <Image src='/icon.png' alt='' width={32} height={32}/>
                        </Link>
                    </li>
                    {menuItems.map((item) => (
                        <li key={item.name} className="desktop-menu-item">
                            <Link
                                href={item.href}
                                className={isActive(item.href) ? 'active' : ''}
                                aria-current={isActive(item.href) ? 'page' : undefined}
                            >
                                {item.name}
                            </Link>
                        </li>
                    ))}
                    {session ? (
                        <li className="desktop-menu-item">
                            <Link href="#" onClick={handleSignOut}>
                                Sign Out
                            </Link>
                        </li>
                    ) : (
                        <li className="desktop-menu-item">
                            <Link href="/users/signin">Sign In</Link>
                        </li>
                    )}
                    <li className="mobile-menu-button">
                        <button
                            onClick={() => setIsOpen(!isOpen)}
                            aria-label={isOpen ? 'Close menu' : 'Open menu'}
                            aria-expanded={isOpen}
                            aria-controls="mobile-menu"
                        >
                            {isOpen ? '✕' : '☰'}
                        </button>
                    </li>
                </ul>
            </nav>

            {/* Mobile menu backdrop */}
            {isOpen && (
                <div
                    className="mobile-menu-backdrop"
                    onClick={() => setIsOpen(false)}
                    aria-hidden="true"
                />
            )}

            {/* Mobile menu */}
            <nav
                id="mobile-menu"
                className={`mobile-menu ${isOpen ? 'open' : ''}`}
                aria-label="Mobile navigation"
            >
                <ul>
                    {menuItems.map((item) => (
                        <li key={item.name}>
                            <Link
                                href={item.href}
                                className={isActive(item.href) ? 'active' : ''}
                                aria-current={isActive(item.href) ? 'page' : undefined}
                            >
                                {item.name}
                            </Link>
                        </li>
                    ))}
                    {session ? (
                        <li>
                            <Link href="#" onClick={handleSignOut}>
                                Sign Out
                            </Link>
                        </li>
                    ) : (
                        <li>
                            <Link href="/users/signin">
                                Sign In
                            </Link>
                        </li>
                    )}
                </ul>
            </nav>
        </>
    );
}
