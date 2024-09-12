import { getDb } from '@/lib/database/db';
import { and, eq, isNull } from 'drizzle-orm';
import { channels, tuners } from '@/lib/database/schema';
import type { NextRequest } from 'next/server';
import { notFound } from 'next/navigation';

interface Params {
    id: string;
}

export async function GET(request: NextRequest, context: { params: Params }) {
    const db = await getDb();

    const tuner = await db.query.tuners.findFirst({
        where: and(
            eq(tuners.id, parseInt(context.params.id, 10)),
            isNull(tuners.deleted_at)
        )
    });

    if (!tuner) {
        notFound();
    }

    const data = await db.query.channels.findMany({
        where: and(
            eq(channels.fk_tuner, parseInt(context.params.id, 10)),
            isNull(channels.deleted_at)
        )
    });

    return Response.json({ data });
}
