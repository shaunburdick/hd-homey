import { getDb } from '@/lib/database/db';
import { tuners } from '@/lib/database/schema';
import { eq } from 'drizzle-orm';

interface PageParams {
    id: string
};

export default async function Page({ params }: { params: PageParams }) {
    const db = await getDb();

    const tuner = await db.select()
        .from(tuners)
        .where(eq(tuners.id, parseInt(params.id, 10)));

    return (
        <>
            <h1>{tuner[0].name}</h1>
        </>
    );
}
