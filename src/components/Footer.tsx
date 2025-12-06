import Link from 'next/link';
import styles from './Footer.module.css';
import { getFormattedVersion } from '@/lib/version';

export function Footer() {
    const version = getFormattedVersion();

    return (
        <footer className={styles.footer}>
            <div className={styles.container}>
                <div className={styles.content}>
                    <span className={styles.text}>
                        Made by Shaun Burdick
                    </span>
                    <span className={styles.separator}>•</span>
                    <Link
                        href="https://github.com/shaunburdick/hd-homey/blob/main/LICENSE"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.link}
                    >
                        AGPL-3.0
                    </Link>
                    <span className={styles.separator}>•</span>
                    <Link
                        href="https://shaunburdick.github.io/hd-homey/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.link}
                    >
                        Docs
                    </Link>
                    <span className={styles.separator}>•</span>
                    <span className={styles.version}>
                        {version}
                    </span>
                </div>
            </div>
        </footer>
    );
}
