import Image from 'next/image';
import hdHomey from '@public/hd-homey.webp';
import { auth } from '@/auth';

export default async function Home() {
    const session = await auth();
    return (
        <>
            <Image src={hdHomey} alt="HD Homey" width={375} height={375} priority/>
            <h1>Hello {session?.user.name}!</h1>
        </>
    );
}
