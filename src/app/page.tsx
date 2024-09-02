import Image from 'next/image';
import Link from 'next/link';

export default function Home() {
    return (
        <main>
            <Image src="/hd-homey.webp" alt="HD Homey" width={375} height={375} />
            <h1>Hello</h1>

            <ul>
                <li><Link href={'watch'}>Watch</Link></li>
                <li><Link href={'lineup.json'}>Lineup</Link></li>
            </ul>
        </main>
    );
}
