import { getDb } from '@/lib/database/db';

export async function GET() {
    const db = await getDb();

    const result = await db.query.tuners.findMany();

    return Response.json(result);
}
