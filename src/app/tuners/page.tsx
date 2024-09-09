import { getDb } from '@/lib/database/db';
import Link from 'next/link';

export default async function TunersPage() {
    const db = await getDb();
    const tuners = await db.query.tuners.findMany();

    return (
        <>
            <h1>Tuners page</h1>
            {tuners.map(tuner => <Link href={`/tuners/${tuner.id}`}>{tuner.name}</Link>)}
        </>
    );
}
