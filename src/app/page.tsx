import Link from 'next/link';

export default function Home() {
    return (
        <main>
            <img src="hd-homey.webp" alt="HD Homey" style={{ width: '30vw' }} />
            <h1>Hello</h1>

            <ul>
                <li><Link href={'watch'}>Watch</Link></li>
                <li><Link href={'lineup.json'}>Lineup</Link></li>
            </ul>
        </main>
    );
}
