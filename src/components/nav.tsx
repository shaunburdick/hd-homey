'use client';

import Link from 'next/link';
import { useState } from 'react';
import './nav.css';

export default function Nav() {

    const [isOpen, setIsOpen] = useState(false);

    const menuItems = [
        { name: 'Home', href: '/' },
        { name: 'Tuners', href: '/tuners' },
        { name: 'Settings', href: '/settings' },
        { name: 'About', href: '/about' },
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
                    </ul>
                </nav>
            )}
        </>
    );
}
