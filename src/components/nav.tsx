import Link from 'next/link';

export default function Nav() {

    return (
        <nav style={{
            height: '100%', /* 100% Full-height */
            width: '250px', /* 0 width - change this with JavaScript */
            position: 'fixed', /* Stay in place */
            zIndex: 1, /* Stay on top */
            top: 0, /* Stay at the top */
            left: 0,
            overflowX: 'hidden', /* Disable horizontal scroll */
            paddingTop: '60px', /* Place content 60px from the top */
        }}>
            <ul>
                <li><Link href={'watch'}>Watch</Link></li>
                <li><Link href={'lineup.json'}>Lineup</Link></li>
            </ul>
        </nav>
    );
}
