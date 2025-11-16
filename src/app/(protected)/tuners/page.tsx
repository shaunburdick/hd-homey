import { isNull } from 'drizzle-orm';
import Link from 'next/link';
import { getDb } from '@/lib/database/db';
import { tuners } from '@/lib/database/schema';
import { AdminLink } from '@/components/AdminLink';

export default async function TunersPage() {
    const db = await getDb();
    const tunerList = await db.query.tuners.findMany({
        where: isNull(tuners.deleted_at)
    });

    return (
        <>
            <h1>Tuners</h1>
            <p>A list of tv tuners already configured</p>
            <ul>
                {tunerList.map(tuner => <li key={tuner.id}><Link href={`/tuners/${tuner.id}`}>{tuner.name}</Link></li>)}
            </ul>
            <p><AdminLink href='/tuners/new'>Add Tuner</AdminLink></p>
        </>
    );
}
