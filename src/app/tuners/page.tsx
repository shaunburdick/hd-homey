import { getDb } from '@/lib/database/db';

export default async function TunersPage() {
    const db = await getDb();
    const tuners = await db.query.tuners.findMany();

    return (
        <>
            <h1>Tuners page</h1>
            {tuners}
        </>
    );
}
