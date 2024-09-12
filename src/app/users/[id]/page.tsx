import { getDb } from '@/lib/database/db';
import { users } from '@/lib/database/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { notFound } from 'next/navigation';

interface PageParams {
    id: string
};

export default async function Page({ params }: { params: PageParams }) {
    const db = await getDb();

    const user = await db.query.users.findFirst({
        where: and(
            eq(users.id, parseInt(params.id, 10)),
            isNull(users.deleted_at)
        )
    });

    if (!user) {
        notFound();
    }

    return (
        <>
            <h1>{user.name}</h1>
        </>
    );
}
