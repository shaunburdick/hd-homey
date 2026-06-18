'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import './nav.css';
import { authClient } from '@/lib/auth/auth-client';
import type { Session } from '@/lib/auth/types';
import { AuthRoles } from '@/lib/auth-roles';

/** Pixel dimensions for the logo image. */
const LOGO_SIZE_PX = 32;

interface MenuItem {
    name: string;
    href: string;
}

/**
 * Builds the menu item list, conditionally including the Settings link
 * for admin users.
 */
function buildMenuItems(isAdmin: boolean): MenuItem[] {
    return [
        { name: 'Home', href: '/' },
        { name: 'Tuners', href: '/tuners' },
        ...(isAdmin ? [{ name: 'Settings', href: '/settings' }] : []),
        { name: 'Profile', href: '/profile' },
        { name: 'About', href: '/about' },
    ];
}

/**
 * Returns true when the given `href` is considered the active route.
 * The root path (`/`) requires an exact match; all other paths use startsWith.
 */
function isActivePath(pathname: string, href: string): boolean {
    if (href === '/') {
        return pathname === '/';
    }
    return pathname.startsWith(href);
}

/** Desktop and mobile sign-in/sign-out list item. */
function AuthNavItem({
    session,
    onSignOut,
}: {
    session: Session | null;
    onSignOut: (event: React.MouseEvent<HTMLAnchorElement>) => Promise<void>;
}) {
    if (session) {
        return <li><Link href="#" onClick={onSignOut}>Sign Out</Link></li>;
    }
    return <li><Link href="/users/signin">Sign In</Link></li>;
}

/** Renders the list of nav links for a given menu context (desktop or mobile). */
function NavLinks({
    menuItems,
    pathname,
    session,
    onSignOut,
    itemClassName,
}: {
    menuItems: MenuItem[];
    pathname: string;
    session: Session | null;
    onSignOut: (event: React.MouseEvent<HTMLAnchorElement>) => Promise<void>;
    itemClassName?: string;
}) {
    return (
        <>
            {menuItems.map((item) => (
                <li key={item.name} className={itemClassName}>
                    <Link
                        href={item.href}
                        className={isActivePath(pathname, item.href) ? 'active' : ''}
                        aria-current={isActivePath(pathname, item.href) ? 'page' : undefined}
                    >
                        {item.name}
                    </Link>
                </li>
            ))}
            <li className={itemClassName}>
                <AuthNavItem session={session} onSignOut={onSignOut} />
            </li>
        </>
    );
}

/** Desktop navigation bar rendered at the top of every page. */
function DesktopNav({
    menuItems,
    pathname,
    session,
    isOpen,
    onToggleMenu,
    onSignOut,
}: {
    menuItems: MenuItem[];
    pathname: string;
    session: Session | null;
    isOpen: boolean;
    onToggleMenu: () => void;
    onSignOut: (event: React.MouseEvent<HTMLAnchorElement>) => Promise<void>;
}) {
    return (
        <nav aria-label="Main navigation">
            <ul>
                <li className="logo">
                    <Link href="/" aria-label="HD Homey Home">
                        <Image src="/icon.png" alt="" width={LOGO_SIZE_PX} height={LOGO_SIZE_PX} />
                        <span className="app-name">HD Homey</span>
                    </Link>
                </li>
                <NavLinks
                    menuItems={menuItems}
                    pathname={pathname}
                    session={session}
                    onSignOut={onSignOut}
                    itemClassName="desktop-menu-item"
                />
                <li className="mobile-menu-button">
                    <button
                        type="button"
                        onClick={onToggleMenu}
                        aria-label={isOpen ? 'Close menu' : 'Open menu'}
                        aria-expanded={isOpen}
                        aria-controls="mobile-menu"
                    >
                        {isOpen ? '✕' : '☰'}
                    </button>
                </li>
            </ul>
        </nav>
    );
}

/** Slide-in mobile navigation drawer. */
function MobileNav({
    menuItems,
    pathname,
    session,
    isOpen,
    onDismiss,
    onSignOut,
}: {
    menuItems: MenuItem[];
    pathname: string;
    session: Session | null;
    isOpen: boolean;
    onDismiss: () => void;
    onSignOut: (event: React.MouseEvent<HTMLAnchorElement>) => Promise<void>;
}) {
    return (
        <>
            {isOpen && (
                <div
                    className="mobile-menu-backdrop"
                    onClick={onDismiss}
                    aria-hidden="true"
                />
            )}
            <nav
                id="mobile-menu"
                className={`mobile-menu ${isOpen ? 'open' : ''}`}
                aria-label="Mobile navigation"
            >
                <ul>
                    <NavLinks
                        menuItems={menuItems}
                        pathname={pathname}
                        session={session}
                        onSignOut={onSignOut}
                    />
                </ul>
            </nav>
        </>
    );
}

export default function Nav() {
    const pathname = usePathname();
    const router = useRouter();
    const [isOpen, setIsOpen] = useState(false);
    const [lastPathname, setLastPathname] = useState(pathname);
    const { data: rawSession } = authClient.useSession();
    const session = rawSession as unknown as Session | null;

    // Close menu on route change
    if (pathname !== lastPathname) {
        setIsOpen(false);
        setLastPathname(pathname);
    }

    // Prevent body scroll when mobile menu is open
    useEffect(() => {
        document.body.style.overflow = isOpen ? 'hidden' : '';
        return () => {
            document.body.style.overflow = '';
        };
    }, [isOpen]);

    const handleSignOut = async (event: React.MouseEvent<HTMLAnchorElement>) => {
        event.preventDefault();
        setIsOpen(false);
        await authClient.signOut();
        // Use router.push so Next.js applies the basePath automatically
        router.push('/users/signin');
    };

    const isAdmin = session?.user?.role === AuthRoles.Admin;
    const menuItems = buildMenuItems(isAdmin);

    return (
        <>
            <DesktopNav
                menuItems={menuItems}
                pathname={pathname}
                session={session}
                isOpen={isOpen}
                onToggleMenu={() => setIsOpen(!isOpen)}
                onSignOut={handleSignOut}
            />
            <MobileNav
                menuItems={menuItems}
                pathname={pathname}
                session={session}
                isOpen={isOpen}
                onDismiss={() => setIsOpen(false)}
                onSignOut={handleSignOut}
            />
        </>
    );
}
