import { getDb } from '@/lib/database/db';
import { and, eq, isNull } from 'drizzle-orm';
import { tuners } from '@/lib/database/schema';
import type { NextRequest } from 'next/server';
import { notFound } from 'next/navigation';

interface Params {
    id: string;
}

export async function GET(request: NextRequest, context: { params: Params }) {
    const db = await getDb();

    const data = await db.query.tuners.findFirst({
        where: and(
            eq(tuners.id, parseInt(context.params.id, 10)),
            isNull(tuners.deleted_at)
        )
    });

    if (!data) {
        notFound();
    }

    return Response.json({ data });
}
