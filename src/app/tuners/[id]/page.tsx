import { getDb } from '@/lib/database/db';
import { tuners } from '@/lib/database/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';

interface PageParams {
    id: string
};

export default async function Page({ params }: { params: PageParams }) {
    const db = await getDb();

    const tuner = await db.query.tuners.findFirst({
        where: and(
            eq(tuners.id, parseInt(params.id, 10)),
            isNull(tuners.deleted_at)
        ),
        with: {
            channels: true
        }
    });

    if (!tuner) {
        notFound();
    }

    return (
        <>
            <h1>{tuner.name}</h1>
            <h2>Channels</h2>
            {tuner.channels.map(channel =>
                <p>{channel.guideName}</p>)}
        </>
    );
}
