import { getDb } from '@/lib/database/db';
import { isNull } from 'drizzle-orm';
import Link from 'next/link';
import { tuners } from '@/lib/database/schema';

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
                {tunerList.map(tuner => <li><Link href={`/tuners/${tuner.id}`}>{tuner.name}</Link></li>)}
            </ul>
            <p><Link href='/tuners/new'>Add Tuner</Link></p>
        </>
    );
}
