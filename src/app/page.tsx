import Image from 'next/image';
import hdHomey from '@public/hd-homey.webp';

export default function Home() {
    return (
        <>
            <Image src={hdHomey} alt="HD Homey" width={375} height={375} priority/>
            <h1>Hello</h1>
        </>
    );
}
