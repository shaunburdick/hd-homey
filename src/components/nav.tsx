'use client';

import Link from 'next/link';
import { useState } from 'react';
import './nav.css';
import { signOut , useSession } from 'next-auth/react';

export default function Nav() {

    const [isOpen, setIsOpen] = useState(false);

    const { data: session } = useSession();

    const handleSignOut = (e: React.MouseEvent<HTMLAnchorElement>) => {
        e.preventDefault();
        setIsOpen(false);
        signOut({ callbackUrl: '/users/signin' });
    };

    const menuItems = [
        { name: 'Home', href: '/' },
        { name: 'Tuners', href: '/tuners' },
        { name: 'Settings', href: '/settings' },
        { name: 'About', href: '/about' }
    ];

    return (
        <>
            <nav>
                <ul>
                    <li className='desktop-menu-item'>
                        <img src='/icon.png' alt='HD Homey Logo'/>
                    </li>
                    {menuItems.map((item) => (
                        <li key={item.name} className="desktop-menu-item">
                            <Link href={item.href}>{item.name}</Link>
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
                        <button onClick={() => setIsOpen(!isOpen)} aria-label="Toggle menu">
                            {isOpen ? 'X' : '☰'}
                        </button>
                    </li>
                </ul>
            </nav>
            {isOpen && (
                <nav className="mobile-menu">
                    <ul>
                        {menuItems.map((item) => (
                            <li key={item.name}>
                                <Link href={item.href} onClick={() => setIsOpen(false)}>
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
                                <Link href="/users/signin" onClick={() => setIsOpen(false)}>
                                    Sign In
                                </Link>
                            </li>
                        )}
                    </ul>
                </nav>
            )}
        </>
    );
}
