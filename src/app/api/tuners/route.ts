import { isNull } from 'drizzle-orm';
import { getDb } from '@/lib/database/db';
import { tuners } from '@/lib/database/schema';

export const dynamic = 'force-dynamic';

export async function GET() {
    const db = await getDb();

    const data = await db.query.tuners.findMany({
        where: isNull(tuners.deleted_at)
    });

    return Response.json({ data });
}
